-- Drop all existing policies on whatsapps that may cause recursion
DROP POLICY IF EXISTS "Users can view whatsapps in their company" ON public.whatsapps;
DROP POLICY IF EXISTS "Admins can manage whatsapps" ON public.whatsapps;

-- Create a security definer function to get user's company_id safely
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create new non-recursive policies for whatsapps
CREATE POLICY "Users can view whatsapps in their company" 
ON public.whatsapps 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert whatsapps in their company" 
ON public.whatsapps 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update whatsapps in their company" 
ON public.whatsapps 
FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete whatsapps in their company" 
ON public.whatsapps 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));

-- Update profiles policies to use the function instead of subquery
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

CREATE POLICY "Users can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  company_id IS NOT NULL AND 
  company_id = get_user_company_id(auth.uid())
);