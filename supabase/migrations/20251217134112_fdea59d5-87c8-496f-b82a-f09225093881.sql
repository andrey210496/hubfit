-- Tabela para conexões WhatsApp
CREATE TABLE IF NOT EXISTS public.whatsapps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  session TEXT,
  qr_code TEXT,
  status TEXT DEFAULT 'DISCONNECTED',
  battery TEXT,
  plugged BOOLEAN DEFAULT false,
  retries INTEGER DEFAULT 0,
  greeting_message TEXT,
  farewell_message TEXT,
  compliance_pending_message TEXT,
  out_of_hours_message TEXT,
  rating_message TEXT,
  is_default BOOLEAN DEFAULT false,
  token TEXT,
  provider TEXT DEFAULT 'baileys',
  instance_id TEXT,
  integration_id UUID REFERENCES public.queue_integrations(id),
  prompt_id UUID REFERENCES public.prompts(id),
  collect_message TEXT,
  expires_inactivity_seconds INTEGER DEFAULT 0,
  expires_ticket_seconds INTEGER DEFAULT 0,
  timeuse_bot TEXT,
  max_use_bot INTEGER DEFAULT 0,
  time_send_queue INTEGER DEFAULT 0,
  send_idle_message BOOLEAN DEFAULT false,
  time_idle_message INTEGER DEFAULT 0,
  idle_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapps ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view whatsapps in their company" 
ON public.whatsapps 
FOR SELECT 
USING (company_id IN (SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()));

CREATE POLICY "Admins can manage whatsapps" 
ON public.whatsapps 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_whatsapps_updated_at
BEFORE UPDATE ON public.whatsapps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add whatsapp_id to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'whatsapp_id') THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp_id UUID REFERENCES public.whatsapps(id);
  END IF;
END $$;