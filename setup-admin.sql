-- Execute este SQL no SQL Editor do seu Supabase (https://supabase.metodogestorpro.com)
-- Ou no pgAdmin/psql conectado ao seu banco

-- 1. Criar a empresa
INSERT INTO public.companies (name, status, email)
VALUES ('Metodo Gestor Pro', 'active', 'andreymarcondes70@gmail.com')
ON CONFLICT DO NOTHING
RETURNING id;

-- 2. Pegar o ID da empresa (rode separadamente se precisar)
-- SELECT id FROM public.companies WHERE email = 'andreymarcondes70@gmail.com';

-- 3. Atualizar o perfil do usuário com o company_id
-- Substitua 'COMPANY_ID_AQUI' pelo ID retornado acima
UPDATE public.profiles
SET 
  company_id = (SELECT id FROM public.companies WHERE email = 'andreymarcondes70@gmail.com' LIMIT 1),
  profile = 'admin'
WHERE user_id = '181cbd27-80d3-4731-a0e8-97ee4603da04';

-- 4. Se o perfil não existir, criar
INSERT INTO public.profiles (user_id, company_id, name, email, profile)
SELECT 
  '181cbd27-80d3-4731-a0e8-97ee4603da04',
  (SELECT id FROM public.companies WHERE email = 'andreymarcondes70@gmail.com' LIMIT 1),
  'Andrey Marcondes',
  'andreymarcondes70@gmail.com',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE user_id = '181cbd27-80d3-4731-a0e8-97ee4603da04'
);

-- 5. Adicionar role de admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('181cbd27-80d3-4731-a0e8-97ee4603da04', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se funcionou
SELECT 
  p.id,
  p.name,
  p.email,
  p.profile,
  p.company_id,
  c.name as company_name,
  ur.role
FROM public.profiles p
LEFT JOIN public.companies c ON c.id = p.company_id
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE p.user_id = '181cbd27-80d3-4731-a0e8-97ee4603da04';
