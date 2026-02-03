-- Add super admin access to schedules
DROP POLICY IF EXISTS "Company access" ON public.schedules;

CREATE POLICY "Super admins can manage all schedules"
ON public.schedules
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access schedules"
ON public.schedules
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_schedules
DROP POLICY IF EXISTS "Company access class_schedules" ON public.class_schedules;

CREATE POLICY "Super admins can manage all class_schedules"
ON public.class_schedules
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_schedules"
ON public.class_schedules
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_sessions
DROP POLICY IF EXISTS "Company access class_sessions" ON public.class_sessions;

CREATE POLICY "Super admins can manage all class_sessions"
ON public.class_sessions
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_sessions"
ON public.class_sessions
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_bookings
DROP POLICY IF EXISTS "Company access class_bookings" ON public.class_bookings;

CREATE POLICY "Super admins can manage all class_bookings"
ON public.class_bookings
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_bookings"
ON public.class_bookings
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_types
DROP POLICY IF EXISTS "Company access class_types" ON public.class_types;

CREATE POLICY "Super admins can manage all class_types"
ON public.class_types
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_types"
ON public.class_types
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));