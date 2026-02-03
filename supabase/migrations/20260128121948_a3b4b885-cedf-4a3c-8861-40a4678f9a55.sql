-- ============================================
-- SUB-AGENTS ARCHITECTURE FOR AI AUTOMATION
-- ============================================

-- Enum for sub-agent types
CREATE TYPE public.sub_agent_type AS ENUM (
  'crm',           -- Contact/Lead management
  'scheduling',    -- Class booking and scheduling
  'member',        -- Member operations
  'general'        -- General purpose
);

-- Table for sub-agents linked to parent agents
CREATE TABLE public.ai_sub_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sub_agent_type sub_agent_type NOT NULL,
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT true,
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for tool executions (audit log)
CREATE TABLE public.ai_tool_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  sub_agent_id UUID REFERENCES public.ai_sub_agents(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_type TEXT NOT NULL,
  input_params JSONB DEFAULT '{}',
  output_result JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, requires_confirmation, confirmed, executed, failed, cancelled
  requires_confirmation BOOLEAN DEFAULT false,
  confirmation_message TEXT,
  confirmed_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for pending confirmations (for CRUD with confirmation)
CREATE TABLE public.ai_pending_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.ai_agent_conversations(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- create_contact, update_contact, book_class, cancel_booking, etc.
  action_data JSONB NOT NULL DEFAULT '{}',
  confirmation_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, cancelled, expired
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Add new specialized tools to the library (without ON CONFLICT since there's no unique constraint)
INSERT INTO public.ai_agent_tool_library (name, display_name, description, tool_type, icon, is_active, configuration_schema)
SELECT * FROM (VALUES
  -- CRM Sub-Agent Tools
  ('contact_search', 'Buscar Contato/Lead', 'Busca um contato pelo telefone ou nome no sistema', 'data'::ai_agent_tool_type, 'Search', true, '{"search_by": ["phone", "name", "email"]}'::jsonb),
  ('contact_create', 'Criar Contato', 'Cria um novo contato/lead no sistema', 'data'::ai_agent_tool_type, 'UserPlus', true, '{"required_fields": ["name", "phone"]}'::jsonb),
  ('contact_update', 'Atualizar Contato', 'Atualiza dados de um contato existente', 'data'::ai_agent_tool_type, 'UserCog', true, '{}'::jsonb),
  
  -- Member Sub-Agent Tools
  ('member_search', 'Buscar Aluno', 'Busca um aluno ativo pelo telefone, nome ou CPF', 'data'::ai_agent_tool_type, 'Users', true, '{"search_by": ["phone", "name", "cpf"]}'::jsonb),
  ('member_info', 'Informações do Aluno', 'Retorna informações completas do aluno (plano, vencimento, aulas)', 'data'::ai_agent_tool_type, 'UserCheck', true, '{}'::jsonb),
  ('member_bookings', 'Aulas Agendadas', 'Lista as aulas agendadas do aluno', 'data'::ai_agent_tool_type, 'CalendarCheck', true, '{}'::jsonb),
  
  -- Scheduling Sub-Agent Tools
  ('class_availability', 'Verificar Disponibilidade', 'Verifica horários disponíveis para aulas', 'workflow'::ai_agent_tool_type, 'Clock', true, '{"days_ahead": 7}'::jsonb),
  ('class_book', 'Agendar Aula', 'Agenda uma aula experimental ou regular para o cliente', 'workflow'::ai_agent_tool_type, 'CalendarPlus', true, '{}'::jsonb),
  ('class_cancel', 'Cancelar Agendamento', 'Cancela um agendamento existente', 'workflow'::ai_agent_tool_type, 'CalendarX', true, '{}'::jsonb),
  ('class_reschedule', 'Remarcar Aula', 'Remarca uma aula para outro horário', 'workflow'::ai_agent_tool_type, 'CalendarClock', true, '{}'::jsonb),
  
  -- Confirmation Tools
  ('confirm_action', 'Confirmar Ação', 'Confirma uma ação pendente do cliente', 'workflow'::ai_agent_tool_type, 'CheckCircle', true, '{}'::jsonb),
  ('cancel_action', 'Cancelar Ação', 'Cancela uma ação pendente', 'workflow'::ai_agent_tool_type, 'XCircle', true, '{}'::jsonb)
) AS v(name, display_name, description, tool_type, icon, is_active, configuration_schema)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_agent_tool_library WHERE ai_agent_tool_library.name = v.name);

-- Enable RLS
ALTER TABLE public.ai_sub_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_pending_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_sub_agents
CREATE POLICY "Users can view sub-agents from their company"
ON public.ai_sub_agents FOR SELECT
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage sub-agents from their company"
ON public.ai_sub_agents FOR ALL
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- RLS Policies for ai_tool_executions
CREATE POLICY "Users can view tool executions from their company"
ON public.ai_tool_executions FOR SELECT
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage tool executions"
ON public.ai_tool_executions FOR ALL
TO service_role
USING (true);

-- RLS Policies for ai_pending_actions
CREATE POLICY "Users can view pending actions from their company"
ON public.ai_pending_actions FOR SELECT
TO authenticated
USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Service role can manage pending actions"
ON public.ai_pending_actions FOR ALL
TO service_role
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_sub_agents_updated_at
BEFORE UPDATE ON public.ai_sub_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for pending actions (so we can show confirmations in chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_pending_actions;