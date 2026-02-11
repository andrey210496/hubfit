-- ============================================================
-- Migration: Suporte a UazAPI + Limpeza NotificaMe
-- ============================================================
ALTER TABLE public.whatsapps
ADD COLUMN IF NOT EXISTS uazapi_url TEXT,
    ADD COLUMN IF NOT EXISTS uazapi_token TEXT,
    ADD COLUMN IF NOT EXISTS uazapi_instance_id TEXT;
COMMENT ON COLUMN public.whatsapps.provider IS 'Provider: coex (Meta Cloud API), uazapi, evolution';
DELETE FROM public.campaign_settings
WHERE key IN ('notificame_api_url', 'notificame_api_key');
CREATE INDEX IF NOT EXISTS idx_whatsapps_provider ON public.whatsapps(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapps_company_status ON public.whatsapps(company_id, status);