-- Create a security definer function to link a user to their member record
-- This runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.link_user_to_member(
  p_user_id uuid,
  p_member_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_company_id uuid;
BEGIN
  -- Check if the email belongs to a member with an active contract
  SELECT m.id, m.company_id INTO v_member_id, v_company_id
  FROM members m
  JOIN contacts c ON c.id = m.contact_id
  JOIN client_contracts cc ON cc.member_id = m.id
  WHERE c.email = p_member_email
  AND cc.status = 'active'
  LIMIT 1;
  
  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this member is already linked to a user
  IF EXISTS (SELECT 1 FROM member_users WHERE member_id = v_member_id) THEN
    RETURN false;
  END IF;
  
  -- Create the link
  INSERT INTO member_users (user_id, member_id, company_id)
  VALUES (p_user_id, v_member_id, v_company_id);
  
  RETURN true;
END;
$$;