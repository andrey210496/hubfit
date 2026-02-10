SELECT 1;

-- 1. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "http";

-- 2. Ensure ai_agents has is_active
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Create Function to Call AI Orchestrator
CREATE OR REPLACE FUNCTION public.trigger_ai_agent()
RETURNS TRIGGER AS $$
DECLARE
  agent_record RECORD;
  payload JSONB;
  request_id BIGINT;
BEGIN
  -- Only process incoming messages (from_me = false) and text messages
  IF NEW.from_me = true OR NEW.body IS NULL OR NEW.body = '' THEN
    RETURN NEW;
  END IF;

  -- Find active Agent for this company
  SELECT id, name INTO agent_record
  FROM public.ai_agents
  WHERE company_id = NEW.company_id
  AND is_active = true
  LIMIT 1;

  -- If no agent found, do nothing
  IF agent_record.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Prepare Payload for ai-orchestrator
  payload := jsonb_build_object(
    'action', 'chat',
    'agent_id', agent_record.id,
    'payload', jsonb_build_object(
      'messages', jsonb_build_array(
        jsonb_build_object('role', 'user', 'content', NEW.body)
      ),
      'context', jsonb_build_object(
        'contact_id', NEW.contact_id,
        'ticket_id', NEW.ticket_id
      )
    )
  );

  -- Call Edge Function via pg_net (Async)
  -- Using internal Kong URL
  PERFORM net.http_post(
    url := 'http://kong:8000/functions/v1/ai-orchestrator',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := payload
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create Trigger on messages
DROP TRIGGER IF EXISTS on_message_received_ai ON public.messages;
CREATE TRIGGER on_message_received_ai
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.trigger_ai_agent();
