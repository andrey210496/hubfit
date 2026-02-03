-- Add ai_agent_id to queues table
ALTER TABLE public.queues
ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_queues_ai_agent_id ON public.queues(ai_agent_id);

-- Add handoff_keywords column to ai_agents for keyword-based handoff
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS handoff_keywords TEXT[] DEFAULT ARRAY['ATENDENTE', 'HUMANO', 'PESSOA', 'ATENDIMENTO'];

COMMENT ON COLUMN public.queues.ai_agent_id IS 'AI Agent that will automatically respond to tickets in this queue';
COMMENT ON COLUMN public.ai_agents.handoff_keywords IS 'Keywords that trigger handoff to human agent';