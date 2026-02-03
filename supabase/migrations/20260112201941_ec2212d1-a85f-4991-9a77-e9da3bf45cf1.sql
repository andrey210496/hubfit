-- Drop existing restrictive policies on tickets
DROP POLICY IF EXISTS "Users can manage tickets in their company" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets in their company" ON public.tickets;

-- Create policy that allows super admins to see ALL tickets
CREATE POLICY "Super admins can manage all tickets"
ON public.tickets
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Create policy for regular users to see only their company tickets
CREATE POLICY "Users can view tickets in their company"
ON public.tickets
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage tickets in their company"
ON public.tickets
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Also add super admin access to other key tables that might be blocking
-- Messages
DROP POLICY IF EXISTS "Users can manage messages in their company" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their company" ON public.messages;

CREATE POLICY "Super admins can manage all messages"
ON public.messages
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view messages in their company"
ON public.messages
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage messages in their company"
ON public.messages
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Contacts
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;

CREATE POLICY "Super admins can manage all contacts"
ON public.contacts
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view contacts in their company"
ON public.contacts
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage contacts in their company"
ON public.contacts
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Queues
DROP POLICY IF EXISTS "Users can manage queues in their company" ON public.queues;
DROP POLICY IF EXISTS "Users can view queues in their company" ON public.queues;

CREATE POLICY "Super admins can manage all queues"
ON public.queues
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view queues in their company"
ON public.queues
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage queues in their company"
ON public.queues
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Tags
DROP POLICY IF EXISTS "Users can manage tags in their company" ON public.tags;
DROP POLICY IF EXISTS "Users can view tags in their company" ON public.tags;

CREATE POLICY "Super admins can manage all tags"
ON public.tags
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view tags in their company"
ON public.tags
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage tags in their company"
ON public.tags
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Quick Messages
DROP POLICY IF EXISTS "Users can manage quick messages in their company" ON public.quick_messages;
DROP POLICY IF EXISTS "Users can view quick messages in their company" ON public.quick_messages;

CREATE POLICY "Super admins can manage all quick messages"
ON public.quick_messages
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view quick messages in their company"
ON public.quick_messages
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage quick messages in their company"
ON public.quick_messages
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- WhatsApps
DROP POLICY IF EXISTS "Users can manage whatsapps in their company" ON public.whatsapps;
DROP POLICY IF EXISTS "Users can view whatsapps in their company" ON public.whatsapps;

CREATE POLICY "Super admins can manage all whatsapps"
ON public.whatsapps
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view whatsapps in their company"
ON public.whatsapps
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage whatsapps in their company"
ON public.whatsapps
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));