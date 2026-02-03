-- Drop existing policy and create a new one that also checks profile.profile = 'admin'
DROP POLICY IF EXISTS "Admins can manage api_tokens" ON public.api_tokens;

CREATE POLICY "Admins can manage api_tokens" 
ON public.api_tokens 
FOR ALL 
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND profile IN ('admin', 'super')
    )
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND profile IN ('admin', 'super')
    )
  )
);