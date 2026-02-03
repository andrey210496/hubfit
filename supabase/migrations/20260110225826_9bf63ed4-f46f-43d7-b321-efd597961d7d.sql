-- Insert a special "system" company for global settings
-- This company_id is used for super admin configurations like WhatsApp provider settings

INSERT INTO public.companies (id, name, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Sistema Global',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;