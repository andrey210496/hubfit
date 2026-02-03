-- Add address fields to companies table for Asaas subaccount creation
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zipcode TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'MEI';

-- Add webhook token to asaas_company_config for tracking
COMMENT ON COLUMN public.asaas_company_config.subaccount_id IS 'Asaas subaccount ID when automatically created';