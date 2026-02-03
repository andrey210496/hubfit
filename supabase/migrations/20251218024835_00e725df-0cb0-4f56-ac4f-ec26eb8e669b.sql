-- Create api_tokens table for external API authentication
CREATE TABLE public.api_tokens (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    permissions TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view api_tokens from their company"
ON public.api_tokens FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage api_tokens"
ON public.api_tokens FOR ALL
USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
    AND company_id = get_user_company_id(auth.uid())
);

-- Create index for token lookup
CREATE INDEX idx_api_tokens_token ON public.api_tokens(token);
CREATE INDEX idx_api_tokens_company ON public.api_tokens(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_api_tokens_updated_at
    BEFORE UPDATE ON public.api_tokens
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create api_logs table for tracking API usage
CREATE TABLE public.api_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    api_token_id UUID REFERENCES public.api_tokens(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    ip_address TEXT,
    user_agent TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for api_logs
CREATE POLICY "Users can view api_logs from their company"
ON public.api_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Service role can insert api_logs"
ON public.api_logs FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_api_logs_company ON public.api_logs(company_id);
CREATE INDEX idx_api_logs_created_at ON public.api_logs(created_at DESC);
CREATE INDEX idx_api_logs_token ON public.api_logs(api_token_id);