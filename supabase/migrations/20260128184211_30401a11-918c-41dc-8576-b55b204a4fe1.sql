-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can view agent-subagent links for their company" ON public.ai_agent_subagents;

-- Create proper RLS policies with WITH CHECK for INSERT/UPDATE
CREATE POLICY "Users can view agent-subagent links for their company"
ON public.ai_agent_subagents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert agent-subagent links for their company"
ON public.ai_agent_subagents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can update agent-subagent links for their company"
ON public.ai_agent_subagents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete agent-subagent links for their company"
ON public.ai_agent_subagents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
);