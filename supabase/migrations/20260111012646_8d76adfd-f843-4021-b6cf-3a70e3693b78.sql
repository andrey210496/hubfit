-- Create function to register a new company and user during signup
CREATE OR REPLACE FUNCTION public.register_company_and_user(
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_company_name text,
  p_phone text DEFAULT NULL,
  p_country text DEFAULT 'BR',
  p_plan_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_default_plan_id uuid;
BEGIN
  -- Get default plan if not provided (free plan)
  IF p_plan_id IS NULL THEN
    SELECT id INTO v_default_plan_id FROM plans WHERE price = 0 ORDER BY created_at LIMIT 1;
  ELSE
    v_default_plan_id := p_plan_id;
  END IF;

  -- Create the company
  INSERT INTO companies (name, email, phone, plan_id, status, due_date)
  VALUES (
    p_company_name,
    p_user_email,
    p_phone,
    v_default_plan_id,
    'active',
    CURRENT_DATE + INTERVAL '30 days'
  )
  RETURNING id INTO v_company_id;

  -- Create user profile linked to the new company
  INSERT INTO profiles (user_id, name, email, company_id, profile)
  VALUES (p_user_id, p_user_name, p_user_email, v_company_id, 'admin');

  -- Assign admin role to the user
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'admin');

  RETURN v_company_id;
END;
$$;

-- Update the handle_new_user trigger to NOT create profile automatically
-- since we'll handle it in the registration function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_name text;
  phone text;
  plan_id uuid;
BEGIN
  -- Check if user metadata has company info (new registration flow)
  company_name := NEW.raw_user_meta_data->>'company_name';
  phone := NEW.raw_user_meta_data->>'phone';
  plan_id := (NEW.raw_user_meta_data->>'plan_id')::uuid;
  
  IF company_name IS NOT NULL AND company_name != '' THEN
    -- New registration flow: create company and profile
    PERFORM register_company_and_user(
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      company_name,
      phone,
      COALESCE(NEW.raw_user_meta_data->>'country', 'BR'),
      plan_id
    );
  ELSE
    -- Legacy flow: just create profile without company (for backwards compatibility)
    -- This should not happen in normal flow anymore
    INSERT INTO public.profiles (user_id, name, email, company_id, profile)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NULL,
      'user'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;