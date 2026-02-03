-- Add Meta Cloud API columns to whatsapps table
ALTER TABLE public.whatsapps 
ADD COLUMN IF NOT EXISTS waba_id TEXT,
ADD COLUMN IF NOT EXISTS phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS business_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapps_waba_id ON public.whatsapps(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapps_phone_number_id ON public.whatsapps(phone_number_id);