-- Create enum for LLM providers
CREATE TYPE llm_provider AS ENUM ('openai', 'gemini', 'anthropic', 'local');

-- Create enum for test status
CREATE TYPE llm_test_status AS ENUM ('success', 'error', 'pending');

-- Create table for LLM configurations
CREATE TABLE public.llm_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  
  -- Encrypted credentials (encrypted at application level)
  api_key_encrypted TEXT NOT NULL,
  organization_id VARCHAR(255), -- OpenAI only
  
  -- Configuration
  default_model VARCHAR(100) NOT NULL,
  api_base_url VARCHAR(500),
  request_timeout_seconds INTEGER DEFAULT 30,
  max_retries INTEGER DEFAULT 3,
  
  -- Provider-specific settings (JSON)
  advanced_settings JSONB DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMPTZ,
  last_test_status llm_test_status,
  last_test_error TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint: one config per provider per company
  UNIQUE(company_id, provider)
);

-- Create indexes for faster lookups
CREATE INDEX idx_llm_config_company_provider ON public.llm_configurations(company_id, provider);
CREATE INDEX idx_llm_config_active ON public.llm_configurations(company_id, is_active);

-- Enable RLS
ALTER TABLE public.llm_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Super admins can do everything
CREATE POLICY "Super admins have full access to llm_configurations"
ON public.llm_configurations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.profile = 'super_admin'
  )
);

-- Company admins can manage their own company's configurations
CREATE POLICY "Company admins can view their company llm configurations"
ON public.llm_configurations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = llm_configurations.company_id
    AND profiles.profile IN ('admin', 'super')
  )
);

CREATE POLICY "Company admins can insert llm configurations"
ON public.llm_configurations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = llm_configurations.company_id
    AND profiles.profile IN ('admin', 'super')
  )
);

CREATE POLICY "Company admins can update their company llm configurations"
ON public.llm_configurations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = llm_configurations.company_id
    AND profiles.profile IN ('admin', 'super')
  )
);

CREATE POLICY "Company admins can delete their company llm configurations"
ON public.llm_configurations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = llm_configurations.company_id
    AND profiles.profile IN ('admin', 'super')
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_llm_configurations_updated_at
BEFORE UPDATE ON public.llm_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create audit log table for LLM configuration changes
CREATE TABLE public.llm_config_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'tested'
  changed_by UUID REFERENCES public.profiles(id),
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.llm_config_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their company
CREATE POLICY "Admins can view their company llm audit logs"
ON public.llm_config_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.company_id = llm_config_audit_log.company_id
    AND profiles.profile IN ('admin', 'super', 'super_admin')
  )
);

-- System can insert audit logs (via service role)
CREATE POLICY "Service role can insert audit logs"
ON public.llm_config_audit_log
FOR INSERT
WITH CHECK (true);