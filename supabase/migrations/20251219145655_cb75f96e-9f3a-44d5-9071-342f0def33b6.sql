-- Create enum for automation trigger types
CREATE TYPE public.automation_trigger_type AS ENUM (
  'message_received',
  'keyword_match', 
  'new_contact',
  'ticket_opened',
  'ticket_closed',
  'schedule',
  'webhook'
);

-- Create enum for automation action types
CREATE TYPE public.automation_action_type AS ENUM (
  'send_message',
  'send_media',
  'assign_queue',
  'assign_user',
  'add_tag',
  'remove_tag',
  'close_ticket',
  'transfer_ticket',
  'call_webhook',
  'ai_response',
  'delay',
  'condition'
);

-- Create automations table
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  trigger_type automation_trigger_type NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation_steps table for the flow steps
CREATE TABLE public.automation_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  action_type automation_action_type NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}',
  order_num INTEGER NOT NULL DEFAULT 0,
  parent_step_id UUID REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  condition_branch TEXT, -- 'true' or 'false' for conditional branches
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation_logs table
CREATE TABLE public.automation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_data JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automations
CREATE POLICY "Super admins can manage all automations"
ON public.automations FOR ALL
USING (has_role(auth.uid(), 'super'));

CREATE POLICY "Company users can view their automations"
ON public.automations FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for automation_steps
CREATE POLICY "Super admins can manage all automation steps"
ON public.automation_steps FOR ALL
USING (has_role(auth.uid(), 'super'));

CREATE POLICY "Company users can view their automation steps"
ON public.automation_steps FOR SELECT
USING (
  automation_id IN (
    SELECT id FROM public.automations 
    WHERE company_id = get_user_company_id(auth.uid())
  )
);

-- RLS Policies for automation_logs
CREATE POLICY "Super admins can manage all automation logs"
ON public.automation_logs FOR ALL
USING (has_role(auth.uid(), 'super'));

CREATE POLICY "Company users can view their automation logs"
ON public.automation_logs FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_automations_company ON public.automations(company_id);
CREATE INDEX idx_automations_active ON public.automations(is_active);
CREATE INDEX idx_automation_steps_automation ON public.automation_steps(automation_id);
CREATE INDEX idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX idx_automation_logs_company ON public.automation_logs(company_id);

-- Add updated_at triggers
CREATE TRIGGER update_automations_updated_at
BEFORE UPDATE ON public.automations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_steps_updated_at
BEFORE UPDATE ON public.automation_steps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();