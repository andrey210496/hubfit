-- Add tools and context_variables columns to ai_sub_agents
ALTER TABLE public.ai_sub_agents 
ADD COLUMN IF NOT EXISTS tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS context_variables jsonb DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN public.ai_sub_agents.tools IS 'Array of tool configurations for this sub-agent';
COMMENT ON COLUMN public.ai_sub_agents.context_variables IS 'Context variables specific to this sub-agent';