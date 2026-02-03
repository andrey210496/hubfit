-- =============================================
-- MULTI-AGENT AI SYSTEM - NEW ARCHITECTURE
-- Complete schema overhaul for hierarchical multi-agent system
-- =============================================

-- 1. Create new agent_tools table (must exist before ai_agents references it)
CREATE TABLE IF NOT EXISTS public.agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  tool_type VARCHAR(50) NOT NULL, -- 'database_query', 'api_call', 'rag_search', 'sub_agent_call'
  
  function_schema JSONB NOT NULL, -- OpenAI function calling schema
  configuration JSONB DEFAULT '{}', -- Tool-specific config (endpoints, queries, etc.)
  
  is_system_tool BOOLEAN DEFAULT false, -- System tools can't be deleted
  is_active BOOLEAN DEFAULT true,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create agent_conversations table
CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) NOT NULL,
  customer_id UUID REFERENCES public.contacts(id),
  customer_type VARCHAR(50), -- 'lead_novo', 'lead_existente', 'ex_aluno', 'aluno'
  
  current_agent_id UUID,
  conversation_stage VARCHAR(100), -- 'greeting', 'collecting_info', 'scheduling', etc.
  
  context_data JSONB DEFAULT '{}', -- Variables collected during conversation
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  
  ticket_id UUID REFERENCES public.tickets(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE
);

-- 3. Create agent_messages table
CREATE TABLE IF NOT EXISTS public.agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  
  role VARCHAR(20) NOT NULL, -- 'user', 'assistant', 'system', 'tool'
  content TEXT NOT NULL,
  
  agent_id UUID, -- Which agent generated this message
  tool_calls JSONB, -- If role='assistant' and it called tools
  tool_call_results JSONB, -- If role='tool'
  
  metadata JSONB DEFAULT '{}', -- tokens_used, response_time, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create agent_memory table (persistent memory per customer)
CREATE TABLE IF NOT EXISTS public.agent_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  memory_type VARCHAR(20) DEFAULT 'short_term', -- 'short_term', 'long_term'
  
  key VARCHAR(100) NOT NULL,
  value TEXT,
  
  expires_at TIMESTAMPTZ, -- For short-term memory
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(phone, company_id, key)
);

-- 5. Create agent_execution_logs table
CREATE TABLE IF NOT EXISTS public.agent_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  agent_id UUID,
  
  execution_type VARCHAR(50), -- 'message', 'tool_call', 'agent_routing'
  
  input_data JSONB,
  output_data JSONB,
  
  tokens_used INTEGER,
  execution_time_ms INTEGER,
  
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_tools_type ON public.agent_tools(tool_type, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_tools_company ON public.agent_tools(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_conv_phone ON public.agent_conversations(phone, company_id);
CREATE INDEX IF NOT EXISTS idx_agent_conv_active ON public.agent_conversations(phone, company_id) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agent_conv_customer ON public.agent_conversations(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_agent_conv_ticket ON public.agent_conversations(ticket_id) WHERE ticket_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_msg_conversation ON public.agent_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_msg_agent ON public.agent_messages(agent_id) WHERE agent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_memory_phone ON public.agent_memory(phone, company_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_expires ON public.agent_memory(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_logs_conversation ON public.agent_execution_logs(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON public.agent_execution_logs(agent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_agent_logs_errors ON public.agent_execution_logs(created_at) WHERE success = false;

-- 7. Add new columns to ai_agents for hierarchical architecture
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS agent_role VARCHAR(100);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS sub_agents JSONB DEFAULT '[]';
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS tools JSONB DEFAULT '[]';
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100);
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS temperature DECIMAL(3,2) DEFAULT 0.7;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 1000;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS frequency_penalty DECIMAL(3,2) DEFAULT 0.3;
ALTER TABLE public.ai_agents ADD COLUMN IF NOT EXISTS presence_penalty DECIMAL(3,2) DEFAULT 0.3;

-- 8. Update agent_type to support new types
DO $$
BEGIN
  -- Try to add new values to the enum
  ALTER TYPE ai_agent_type ADD VALUE IF NOT EXISTS 'supervisor';
  ALTER TYPE ai_agent_type ADD VALUE IF NOT EXISTS 'classifier';
  ALTER TYPE ai_agent_type ADD VALUE IF NOT EXISTS 'specialist';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END$$;

-- 9. Enable RLS on new tables
ALTER TABLE public.agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_execution_logs ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies for agent_tools
CREATE POLICY "Users can view agent_tools for their company"
  ON public.agent_tools FOR SELECT
  USING (
    company_id IS NULL OR 
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage agent_tools for their company"
  ON public.agent_tools FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 11. RLS Policies for agent_conversations
CREATE POLICY "Users can view conversations for their company"
  ON public.agent_conversations FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage conversations for their company"
  ON public.agent_conversations FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 12. RLS Policies for agent_messages
CREATE POLICY "Users can view messages for their company conversations"
  ON public.agent_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.agent_conversations 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Users can manage messages for their company conversations"
  ON public.agent_messages FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM public.agent_conversations 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 13. RLS Policies for agent_memory
CREATE POLICY "Users can view memory for their company"
  ON public.agent_memory FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can manage memory for their company"
  ON public.agent_memory FOR ALL
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 14. RLS Policies for agent_execution_logs
CREATE POLICY "Users can view logs for their company"
  ON public.agent_execution_logs FOR SELECT
  USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  );

-- 15. Service role policies for edge functions
CREATE POLICY "Service role full access to agent_tools"
  ON public.agent_tools FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to agent_conversations"
  ON public.agent_conversations FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to agent_messages"
  ON public.agent_messages FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to agent_memory"
  ON public.agent_memory FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to agent_execution_logs"
  ON public.agent_execution_logs FOR ALL
  TO service_role
  USING (true);

-- 16. Insert system tools
INSERT INTO public.agent_tools (name, display_name, description, tool_type, function_schema, is_system_tool) VALUES
('query_customer', 'Consultar Cliente', 'Busca cliente pelo telefone no sistema', 'database_query', 
 '{"name": "query_customer", "description": "Busca cliente pelo telefone para identificar tipo", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Número de telefone do cliente"}}, "required": ["phone"]}}', true),
('register_lead', 'Cadastrar Lead', 'Registra novo lead no sistema', 'api_call',
 '{"name": "register_lead", "description": "Cadastra novo lead com nome e telefone", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do lead"}, "name": {"type": "string", "description": "Nome do lead"}}, "required": ["phone", "name"]}}', true),
('check_availability', 'Verificar Disponibilidade', 'Verifica horários disponíveis para aulas', 'api_call',
 '{"name": "check_availability", "description": "Verifica disponibilidade de horários para agendar aula", "parameters": {"type": "object", "properties": {"modality": {"type": "string", "description": "Modalidade da aula"}, "date": {"type": "string", "description": "Data desejada (YYYY-MM-DD)"}, "time_preference": {"type": "string", "description": "Preferência de turno: manha, tarde, noite"}}, "required": ["date"]}}', true),
('book_appointment', 'Agendar Aula', 'Agenda aula experimental', 'api_call',
 '{"name": "book_appointment", "description": "Agenda aula experimental para o lead", "parameters": {"type": "object", "properties": {"session_id": {"type": "string", "description": "ID da sessão de aula"}, "customer_phone": {"type": "string", "description": "Telefone do cliente"}, "customer_name": {"type": "string", "description": "Nome do cliente"}}, "required": ["session_id", "customer_phone"]}}', true),
('cancel_booking', 'Cancelar Agendamento', 'Cancela agendamento existente', 'api_call',
 '{"name": "cancel_booking", "description": "Cancela um agendamento existente", "parameters": {"type": "object", "properties": {"booking_id": {"type": "string", "description": "ID do agendamento"}}, "required": ["booking_id"]}}', true),
('find_booking', 'Buscar Agendamento', 'Busca agendamentos do cliente', 'database_query',
 '{"name": "find_booking", "description": "Busca agendamentos existentes do cliente", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do cliente"}}, "required": ["phone"]}}', true),
('reschedule_booking', 'Reagendar Aula', 'Reagenda aula para novo horário', 'api_call',
 '{"name": "reschedule_booking", "description": "Reagenda aula para nova data/horário", "parameters": {"type": "object", "properties": {"booking_id": {"type": "string", "description": "ID do agendamento atual"}, "new_session_id": {"type": "string", "description": "ID da nova sessão"}}, "required": ["booking_id", "new_session_id"]}}', true),
('search_knowledge', 'Buscar Conhecimento', 'Busca na base de conhecimento (RAG)', 'rag_search',
 '{"name": "search_knowledge", "description": "Busca informações na base de conhecimento da empresa", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Texto da busca"}, "category": {"type": "string", "description": "Categoria opcional: precos, modalidades, horarios, politicas"}}, "required": ["query"]}}', true),
('query_student_data', 'Consultar Aluno', 'Busca dados completos do aluno', 'database_query',
 '{"name": "query_student_data", "description": "Busca dados do aluno ativo: plano, pagamentos, aulas", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do aluno"}, "field": {"type": "string", "description": "Campo específico: plan, payments, bookings, all"}}, "required": ["phone"]}}', true),
('transfer_to_human', 'Transferir para Atendente', 'Transfere conversa para atendente humano', 'api_call',
 '{"name": "transfer_to_human", "description": "Transfere a conversa para um atendente humano", "parameters": {"type": "object", "properties": {"reason": {"type": "string", "description": "Motivo da transferência"}}, "required": ["reason"]}}', true),
('update_customer_crm', 'Atualizar CRM', 'Atualiza dados do cliente no CRM', 'api_call',
 '{"name": "update_customer_crm", "description": "Atualiza dados do cliente/lead no sistema", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do cliente"}, "fields": {"type": "object", "description": "Campos a atualizar: name, email, cpf, birth_date, etc"}}, "required": ["phone", "fields"]}}', true)
ON CONFLICT (name) DO NOTHING;

-- 17. Enable realtime for agent_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;