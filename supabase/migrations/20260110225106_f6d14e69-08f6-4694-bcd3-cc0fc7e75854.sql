-- Allow super admins to manage global WhatsApp provider settings stored in campaign_settings
-- Global settings are stored under company_id = 00000000-0000-0000-0000-000000000000

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage global campaign settings" ON public.campaign_settings;

CREATE POLICY "Super admins manage global campaign settings"
ON public.campaign_settings
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super')
  AND company_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  public.has_role(auth.uid(), 'super')
  AND company_id = '00000000-0000-0000-0000-000000000000'
);
