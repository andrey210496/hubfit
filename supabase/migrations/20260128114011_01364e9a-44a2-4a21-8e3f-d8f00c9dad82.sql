-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can insert knowledge base entries" ON public.knowledge_base;

-- Create corrected INSERT policy using the helper function
CREATE POLICY "Admins can insert knowledge base entries" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.profile IN ('admin', 'super_admin')
  )
);