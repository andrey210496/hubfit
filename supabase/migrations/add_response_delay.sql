ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS response_delay INTEGER DEFAULT 0;

COMMENT ON COLUMN public.ai_agents.response_delay IS 'Time in seconds to wait before responding';
