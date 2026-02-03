-- =============================================
-- SECURITY FIX: Role-based access and SECURITY DEFINER authorization
-- =============================================

-- Step 1: Create helper function to check if user can access ALL contacts (admin/super)
CREATE OR REPLACE FUNCTION public.can_access_all_contacts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'super')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
    AND profile IN ('admin', 'supervisor')
  )
$$;

-- Step 2: Create function to check if user has access to a specific contact
CREATE OR REPLACE FUNCTION public.can_user_access_contact(_user_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN can_access_all_contacts(_user_id) THEN true
      ELSE 
        -- Regular users can only access contacts from tickets they're assigned to
        EXISTS (
          SELECT 1 FROM public.tickets t
          JOIN public.profiles p ON p.user_id = _user_id
          WHERE t.contact_id = _contact_id
          AND t.user_id = p.id
        )
    END
$$;

-- Step 3: Drop existing overlapping policies on contacts
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Super admins can manage all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can manage all company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view accessible contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can update accessible contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;

-- Step 4: Create new role-based policies

-- Admins can manage ALL contacts in their company
CREATE POLICY "Admins full access to company contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
);

-- Regular users can VIEW contacts they have access to via assigned tickets
CREATE POLICY "Users view assigned contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    can_access_all_contacts(auth.uid())
    OR can_user_access_contact(auth.uid(), id)
  )
);

-- Any user can CREATE contacts in their company
CREATE POLICY "Users create company contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- Users can UPDATE contacts they have access to
CREATE POLICY "Users update assigned contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    can_access_all_contacts(auth.uid())
    OR can_user_access_contact(auth.uid(), id)
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- Only admins can DELETE contacts
CREATE POLICY "Admins delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
);

-- =============================================
-- FIX 2: SECURITY DEFINER functions with authorization
-- =============================================

-- Update generate_sessions_from_schedule with ownership verification
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_schedule_id uuid, 
  p_start_date date DEFAULT CURRENT_DATE, 
  p_weeks_ahead integer DEFAULT 8
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_sessions_created INTEGER := 0;
  v_user_company_id UUID;
BEGIN
  -- Authorization check: verify user owns this schedule
  v_user_company_id := get_user_company_id(auth.uid());
  
  -- Get schedule details with ownership verification
  SELECT * INTO v_schedule 
  FROM class_schedules 
  WHERE id = p_schedule_id
    AND company_id = v_user_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or access denied';
  END IF;
  
  IF NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;
  
  v_end_date := p_start_date + (p_weeks_ahead * 7);
  v_current_date := p_start_date;
  
  WHILE EXTRACT(DOW FROM v_current_date) != v_schedule.day_of_week AND v_current_date <= v_end_date LOOP
    v_current_date := v_current_date + 1;
  END LOOP;
  
  WHILE v_current_date <= v_end_date LOOP
    IF NOT EXISTS (
      SELECT 1 FROM class_sessions 
      WHERE class_schedule_id = p_schedule_id 
      AND session_date = v_current_date
    ) THEN
      INSERT INTO class_sessions (
        company_id, class_type_id, class_schedule_id, instructor_id,
        session_date, start_time, end_time, max_capacity, current_bookings, is_cancelled
      ) VALUES (
        v_schedule.company_id, v_schedule.class_type_id, p_schedule_id, v_schedule.instructor_id,
        v_current_date, v_schedule.start_time, v_schedule.end_time,
        COALESCE(v_schedule.max_capacity, (SELECT max_capacity FROM class_types WHERE id = v_schedule.class_type_id)),
        0, false
      );
      v_sessions_created := v_sessions_created + 1;
    END IF;
    v_current_date := v_current_date + 7;
  END LOOP;
  
  RETURN v_sessions_created;
END;
$$;

-- Update generate_all_company_sessions with ownership verification
CREATE OR REPLACE FUNCTION public.generate_all_company_sessions(
  p_company_id uuid, 
  p_weeks_ahead integer DEFAULT 8
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_total_created INTEGER := 0;
  v_created INTEGER;
  v_user_company_id UUID;
BEGIN
  v_user_company_id := get_user_company_id(auth.uid());
  
  IF v_user_company_id IS NULL OR v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: you can only generate sessions for your own company';
  END IF;

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

-- Fix update_ai_agents_updated_at to include search_path
CREATE OR REPLACE FUNCTION public.update_ai_agents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;