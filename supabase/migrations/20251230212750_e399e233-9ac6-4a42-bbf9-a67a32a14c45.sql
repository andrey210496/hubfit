-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;

-- Create proper policies with WITH CHECK for INSERT/UPDATE
CREATE POLICY "Users can view contacts in their company" 
ON public.contacts 
FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert contacts in their company" 
ON public.contacts 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update contacts in their company" 
ON public.contacts 
FOR UPDATE 
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete contacts in their company" 
ON public.contacts 
FOR DELETE 
USING (company_id = public.get_user_company_id(auth.uid()));