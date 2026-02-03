-- Update default member status to inactive
ALTER TABLE public.members ALTER COLUMN status SET DEFAULT 'inactive'::member_status;

-- Allow inactive members to sign up for portal only if they have active contracts
CREATE OR REPLACE FUNCTION public.can_member_register_portal(member_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM members m
    JOIN contacts c ON c.id = m.contact_id
    JOIN client_contracts cc ON cc.member_id = m.id
    WHERE c.email = member_email
    AND cc.status = 'active'
  );
$$;

-- Function to get member by email for registration
CREATE OR REPLACE FUNCTION public.get_member_by_email(member_email TEXT)
RETURNS TABLE (
  member_id UUID,
  company_id UUID,
  contact_name TEXT,
  contact_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as member_id,
    m.company_id,
    c.name as contact_name,
    c.email as contact_email
  FROM members m
  JOIN contacts c ON c.id = m.contact_id
  JOIN client_contracts cc ON cc.member_id = m.id
  WHERE c.email = member_email
  AND cc.status = 'active'
  LIMIT 1;
$$;