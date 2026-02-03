-- Improve link_user_to_member to handle orphaned member records
-- (when old auth.user was deleted, allow re-linking)

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
  v_existing_user_id uuid;
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
  SELECT user_id INTO v_existing_user_id 
  FROM member_users 
  WHERE member_id = v_member_id;
  
  IF v_existing_user_id IS NOT NULL THEN
    -- If linked to the same user, return true (already linked)
    IF v_existing_user_id = p_user_id THEN
      RETURN true;
    END IF;
    
    -- Check if the existing user still exists in auth.users
    -- If the old user was deleted, allow re-linking
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_user_id) THEN
      -- Old user still exists, cannot re-link
      RETURN false;
    END IF;
    
    -- Old user was deleted, remove the orphaned link
    DELETE FROM member_users WHERE member_id = v_member_id;
  END IF;
  
  -- Create the link
  INSERT INTO member_users (user_id, member_id, company_id)
  VALUES (p_user_id, v_member_id, v_company_id);
  
  RETURN true;
END;
$$;