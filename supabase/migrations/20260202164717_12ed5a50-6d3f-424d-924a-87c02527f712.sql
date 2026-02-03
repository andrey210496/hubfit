-- Fix ai_agent_templates RLS: Remove public access, require authentication
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view public templates or their own" ON public.ai_agent_templates;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view public templates or their own"
ON public.ai_agent_templates
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR company_id = get_user_company_id(auth.uid())
  OR created_by = auth.uid()
);

-- Ensure other operations are also properly secured
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.ai_agent_templates;

CREATE POLICY "Authenticated users can insert their own templates"
ON public.ai_agent_templates
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Authenticated users can update their own templates"
ON public.ai_agent_templates
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Authenticated users can delete their own templates"
ON public.ai_agent_templates
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);