-- Drop existing policies
DROP POLICY IF EXISTS "Users can view PAR-Q responses from their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can create PAR-Q responses for their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can update PAR-Q responses from their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can delete PAR-Q responses from their company" ON public.par_q_responses;

-- Create corrected policies using the helper function
CREATE POLICY "Users can view PAR-Q responses from their company" 
ON public.par_q_responses FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create PAR-Q responses for their company" 
ON public.par_q_responses FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update PAR-Q responses from their company" 
ON public.par_q_responses FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete PAR-Q responses from their company" 
ON public.par_q_responses FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));