-- Create table to link members to auth users (for student portal login)
CREATE TABLE public.member_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.member_users ENABLE ROW LEVEL SECURITY;

-- Policy: Members can only see their own record
CREATE POLICY "Members can view own record" ON public.member_users
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Company admins can manage member users
CREATE POLICY "Company admins can manage member_users" ON public.member_users
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
  );

-- Create function to check if user is a member
CREATE OR REPLACE FUNCTION public.is_member_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_users WHERE user_id = _user_id
  )
$$;

-- Create function to get member data for a user
CREATE OR REPLACE FUNCTION public.get_member_for_user(_user_id UUID)
RETURNS TABLE (
  member_id UUID,
  company_id UUID,
  contact_name TEXT,
  contact_number TEXT,
  contact_email TEXT,
  status TEXT,
  fitness_plan_name TEXT,
  expiration_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as member_id,
    m.company_id,
    c.name as contact_name,
    c.number as contact_number,
    c.email as contact_email,
    m.status::text,
    fp.name as fitness_plan_name,
    m.expiration_date
  FROM member_users mu
  JOIN members m ON m.id = mu.member_id
  JOIN contacts c ON c.id = m.contact_id
  LEFT JOIN fitness_plans fp ON fp.id = m.fitness_plan_id
  WHERE mu.user_id = _user_id
  LIMIT 1
$$;

-- RLS policy for class_sessions: Allow members to view sessions from their company
CREATE POLICY "Members can view class sessions" ON public.class_sessions
  FOR SELECT USING (
    company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for class_types: Allow members to view class types from their company
CREATE POLICY "Members can view class types" ON public.class_types
  FOR SELECT USING (
    company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for class_bookings: Members can manage their own bookings
CREATE POLICY "Members can manage own bookings" ON public.class_bookings
  FOR ALL USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for access_logs: Members can view their own access logs
CREATE POLICY "Members can view own access logs" ON public.access_logs
  FOR SELECT USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for member_payments: Members can view their own payments
CREATE POLICY "Members can view own payments" ON public.member_payments
  FOR SELECT USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for announcements: Members can view active announcements
CREATE POLICY "Members can view announcements" ON public.announcements
  FOR SELECT USING (
    status = true AND company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );