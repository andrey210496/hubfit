-- Create webhooks table for configuration
CREATE TABLE public.webhooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  headers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook_logs table for monitoring
CREATE TABLE public.webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID REFERENCES public.webhooks(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for webhooks
CREATE POLICY "Users can view webhooks from their company" 
ON public.webhooks FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert webhooks for their company" 
ON public.webhooks FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update webhooks from their company" 
ON public.webhooks FOR UPDATE 
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete webhooks from their company" 
ON public.webhooks FOR DELETE 
USING (company_id = public.get_user_company_id(auth.uid()));

-- RLS policies for webhook_logs
CREATE POLICY "Users can view webhook logs from their company" 
ON public.webhook_logs FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Service role can insert webhook logs" 
ON public.webhook_logs FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_webhooks_company_id ON public.webhooks(company_id);
CREATE INDEX idx_webhooks_is_active ON public.webhooks(is_active);
CREATE INDEX idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_company_id ON public.webhook_logs(company_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Update trigger for webhooks
CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON public.webhooks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for webhook_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;