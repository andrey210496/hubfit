-- Function to generate class sessions from a schedule for a date range
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_schedule_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_weeks_ahead INTEGER DEFAULT 8
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_sessions_created INTEGER := 0;
BEGIN
  -- Get schedule details
  SELECT * INTO v_schedule FROM class_schedules WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Only generate for active schedules
  IF NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;
  
  v_end_date := p_start_date + (p_weeks_ahead * 7);
  v_current_date := p_start_date;
  
  -- Find the first occurrence of the day_of_week from start_date
  WHILE EXTRACT(DOW FROM v_current_date) != v_schedule.day_of_week AND v_current_date <= v_end_date LOOP
    v_current_date := v_current_date + 1;
  END LOOP;
  
  -- Generate sessions for each occurrence
  WHILE v_current_date <= v_end_date LOOP
    -- Check if session doesn't already exist for this date/time
    IF NOT EXISTS (
      SELECT 1 FROM class_sessions 
      WHERE class_schedule_id = p_schedule_id 
      AND session_date = v_current_date
    ) THEN
      INSERT INTO class_sessions (
        company_id,
        class_type_id,
        class_schedule_id,
        instructor_id,
        session_date,
        start_time,
        end_time,
        max_capacity,
        current_bookings,
        is_cancelled
      ) VALUES (
        v_schedule.company_id,
        v_schedule.class_type_id,
        p_schedule_id,
        v_schedule.instructor_id,
        v_current_date,
        v_schedule.start_time,
        v_schedule.end_time,
        COALESCE(v_schedule.max_capacity, (SELECT max_capacity FROM class_types WHERE id = v_schedule.class_type_id)),
        0,
        false
      );
      
      v_sessions_created := v_sessions_created + 1;
    END IF;
    
    -- Move to next week
    v_current_date := v_current_date + 7;
  END LOOP;
  
  RETURN v_sessions_created;
END;
$$;

-- Function to generate sessions for all active schedules of a company
CREATE OR REPLACE FUNCTION public.generate_all_company_sessions(
  p_company_id UUID,
  p_weeks_ahead INTEGER DEFAULT 8
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_total_created INTEGER := 0;
  v_created INTEGER;
BEGIN
  FOR v_schedule IN 
    SELECT id FROM class_schedules 
    WHERE company_id = p_company_id AND is_active = true
  LOOP
    SELECT generate_sessions_from_schedule(v_schedule.id, CURRENT_DATE, p_weeks_ahead) INTO v_created;
    v_total_created := v_total_created + v_created;
  END LOOP;
  
  RETURN v_total_created;
END;
$$;

-- Trigger function to auto-generate sessions when schedule is created or updated
CREATE OR REPLACE FUNCTION public.auto_generate_sessions_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_created INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Generate sessions for new schedule
    PERFORM generate_sessions_from_schedule(NEW.id, CURRENT_DATE, 8);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If schedule was reactivated or key fields changed, regenerate future sessions
    IF (OLD.is_active = false AND NEW.is_active = true) OR
       OLD.start_time != NEW.start_time OR
       OLD.end_time != NEW.end_time OR
       OLD.class_type_id != NEW.class_type_id OR
       OLD.day_of_week != NEW.day_of_week OR
       COALESCE(OLD.max_capacity, 0) != COALESCE(NEW.max_capacity, 0) THEN
      
      -- Update future sessions that haven't been booked yet
      UPDATE class_sessions
      SET 
        start_time = NEW.start_time,
        end_time = NEW.end_time,
        class_type_id = NEW.class_type_id,
        max_capacity = COALESCE(NEW.max_capacity, (SELECT max_capacity FROM class_types WHERE id = NEW.class_type_id)),
        instructor_id = NEW.instructor_id,
        updated_at = now()
      WHERE class_schedule_id = NEW.id
        AND session_date >= CURRENT_DATE
        AND current_bookings = 0
        AND is_cancelled = false;
      
      -- Generate any missing sessions
      PERFORM generate_sessions_from_schedule(NEW.id, CURRENT_DATE, 8);
    END IF;
    
    -- If schedule was deactivated, cancel future sessions without bookings
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE class_sessions
      SET is_cancelled = true, updated_at = now()
      WHERE class_schedule_id = NEW.id
        AND session_date >= CURRENT_DATE
        AND current_bookings = 0;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Cancel future sessions without bookings when schedule is deleted
    UPDATE class_sessions
    SET is_cancelled = true, updated_at = now()
    WHERE class_schedule_id = OLD.id
      AND session_date >= CURRENT_DATE
      AND current_bookings = 0;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_sessions ON class_schedules;
CREATE TRIGGER trigger_auto_generate_sessions
  AFTER INSERT OR UPDATE OR DELETE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_sessions_trigger();

-- Generate sessions for all existing active schedules (run once)
DO $$
DECLARE
  v_company RECORD;
BEGIN
  FOR v_company IN SELECT DISTINCT company_id FROM class_schedules WHERE is_active = true LOOP
    PERFORM generate_all_company_sessions(v_company.company_id, 8);
  END LOOP;
END $$;