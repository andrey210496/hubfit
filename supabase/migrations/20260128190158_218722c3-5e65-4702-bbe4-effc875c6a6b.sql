-- Fix RLS policies for ai_agent_subagents: profiles join must use user_id (auth uid)

DROP POLICY IF EXISTS "Users can view agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can insert agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can update agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can delete agent-subagent links for their company" ON public.ai_agent_subagents;

CREATE POLICY "Users can view agent-subagent links for their company"
ON public.ai_agent_subagents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can insert agent-subagent links for their company"
ON public.ai_agent_subagents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can update agent-subagent links for their company"
ON public.ai_agent_subagents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can delete agent-subagent links for their company"
ON public.ai_agent_subagents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);
