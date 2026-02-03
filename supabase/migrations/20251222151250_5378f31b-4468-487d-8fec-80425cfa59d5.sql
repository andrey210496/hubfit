-- Create table for WhatsApp message templates (HSM)
CREATE TABLE public.message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  whatsapp_id UUID REFERENCES public.whatsapps(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL,
  name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT,
  status TEXT DEFAULT 'PENDING',
  components JSONB DEFAULT '[]'::jsonb,
  example JSONB,
  quality_score TEXT,
  rejected_reason TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, template_id, language)
);

-- Enable RLS
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view templates from their company"
ON public.message_templates
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Admins can manage templates"
ON public.message_templates
FOR ALL
USING (
  (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
  AND company_id = get_user_company_id(auth.uid())
);

-- Create table for template send history
CREATE TABLE public.template_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.message_templates(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  variables JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.template_sends ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view template sends from their company"
ON public.template_sends
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create template sends in their company"
ON public.template_sends
FOR INSERT
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Add indexes
CREATE INDEX idx_message_templates_company ON public.message_templates(company_id);
CREATE INDEX idx_message_templates_status ON public.message_templates(status);
CREATE INDEX idx_template_sends_company ON public.template_sends(company_id);
CREATE INDEX idx_template_sends_template ON public.template_sends(template_id);

-- Add updated_at trigger
CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();