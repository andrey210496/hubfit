-- Fix SECRETS_EXPOSED: Restrict prompts table access to admins only
-- The prompts table contains sensitive API keys (api_key, voice_key) that should only be accessible by admins

-- Drop existing policy that allows all company users to access
DROP POLICY IF EXISTS "Company access" ON public.prompts;

-- Create admin-only policy for full CRUD operations
CREATE POLICY "Admins can manage prompts" 
ON public.prompts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super'::app_role));

-- Create read-only policy for regular users (without sensitive fields - but we can't filter columns in RLS)
-- Instead, we'll just not allow regular users to access prompts at all since they contain API keys
-- Queue-based operations that need prompt data should be handled server-side

-- Also restrict settings table to admin-only for sensitive operations
DROP POLICY IF EXISTS "Company access" ON public.settings;

-- Admins can do everything with settings
CREATE POLICY "Admins can manage settings" 
ON public.settings 
FOR ALL 
USING (
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super'::app_role))
  AND company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
);

-- Regular users can only read non-sensitive settings
CREATE POLICY "Users can read non-sensitive settings" 
ON public.settings 
FOR SELECT 
USING (
  company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid())
  AND key NOT IN ('userApiToken', 'asaas', 'hubToken', 'webhook_url', 'apikey', 'OPENAI_API_KEY', 'openai_key')
);