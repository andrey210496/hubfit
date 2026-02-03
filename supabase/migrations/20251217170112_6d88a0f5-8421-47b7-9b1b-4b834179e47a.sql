-- Allow super admins to manage plans
CREATE POLICY "Super admins can manage plans"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to manage all companies
CREATE POLICY "Super admins can manage all companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to view all invoices
CREATE POLICY "Super admins can manage all invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));