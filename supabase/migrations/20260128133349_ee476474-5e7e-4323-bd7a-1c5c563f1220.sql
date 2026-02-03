-- Make parent_agent_id nullable so sub-agents can exist independently
ALTER TABLE public.ai_sub_agents ALTER COLUMN parent_agent_id DROP NOT NULL;

-- Create junction table for agent-subagent relationships
CREATE TABLE IF NOT EXISTS public.ai_agent_subagents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  sub_agent_id uuid NOT NULL REFERENCES public.ai_sub_agents(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  execution_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, sub_agent_id)
);

-- Enable RLS
ALTER TABLE public.ai_agent_subagents ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agent_subagents
CREATE POLICY "Users can view agent-subagent links for their company" 
  ON public.ai_agent_subagents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ai_agent_subagents.agent_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage agent-subagent links for their company" 
  ON public.ai_agent_subagents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ai_agent_subagents.agent_id AND p.id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_ai_agent_subagents_updated_at
  BEFORE UPDATE ON public.ai_agent_subagents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();