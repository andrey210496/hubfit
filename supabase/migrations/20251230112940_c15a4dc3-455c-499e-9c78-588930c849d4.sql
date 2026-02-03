-- Corrigir chamadas a gen_random_bytes (pgcrypto) quando a extensão está no schema extensions

CREATE OR REPLACE FUNCTION public.generate_member_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reset_token text;
BEGIN
  -- Generate a secure token
  reset_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Update the profile with the reset token
  UPDATE profiles 
  SET reset_password = reset_token, updated_at = now()
  WHERE email = user_email;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;