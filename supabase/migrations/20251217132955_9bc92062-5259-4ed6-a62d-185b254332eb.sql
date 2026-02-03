-- Atualizar a função handle_new_user para associar novos usuários à empresa demo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_company_id UUID;
BEGIN
  -- Buscar empresa demo ou a primeira empresa disponível
  SELECT id INTO demo_company_id FROM public.companies LIMIT 1;
  
  INSERT INTO public.profiles (user_id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    demo_company_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Atualizar profiles existentes sem company_id
UPDATE public.profiles 
SET company_id = 'a0000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;