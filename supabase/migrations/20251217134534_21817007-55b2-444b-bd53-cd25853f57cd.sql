-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Create new policies without recursion
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can view profiles in their company using a direct check
CREATE POLICY "Users can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  company_id IS NOT NULL AND 
  company_id = (SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));