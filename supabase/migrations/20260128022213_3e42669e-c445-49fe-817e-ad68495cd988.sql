-- AI Agents System - Complete Schema (Fixed)

-- Drop existing automation tables that will be replaced
DROP TABLE IF EXISTS automation_logs CASCADE;
DROP TABLE IF EXISTS automation_steps CASCADE;
DROP TABLE IF EXISTS automations CASCADE;

-- Drop existing automation enums safely
DROP TYPE IF EXISTS automation_trigger_type CASCADE;
DROP TYPE IF EXISTS automation_action_type CASCADE;

-- Create new enums for AI Agents
CREATE TYPE ai_agent_type AS ENUM ('customer_service', 'sales', 'scheduling', 'information', 'custom');
CREATE TYPE ai_agent_status AS ENUM ('active', 'inactive', 'draft');
CREATE TYPE ai_agent_tool_type AS ENUM ('communication', 'data', 'workflow', 'integration', 'ai');
CREATE TYPE ai_agent_conversation_status AS ENUM ('active', 'completed', 'transferred', 'failed');
CREATE TYPE ai_agent_message_role AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE ai_agent_trigger_type AS ENUM ('whatsapp_message', 'ticket_status', 'schedule', 'webhook', 'manual');

-- Main AI Agents Table
CREATE TABLE ai_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  agent_type ai_agent_type DEFAULT 'custom',
  status ai_agent_status DEFAULT 'draft',
  avatar_url VARCHAR(500),
  language VARCHAR(10) DEFAULT 'pt-BR',
  tone VARCHAR(50) DEFAULT 'professional',
  system_prompt TEXT,
  system_prompt_config JSONB DEFAULT '{}',
  response_strategy JSONB DEFAULT '{"length": "medium", "speed": "immediate", "splitting": "single", "emoji_usage": "minimal"}',
  memory_config JSONB DEFAULT '{"duration": "conversation", "type": "short_term", "remember": ["preferences", "history"]}',
  context_variables JSONB DEFAULT '[]',
  model_config JSONB DEFAULT '{"model": "google/gemini-3-flash-preview", "temperature": 0.7, "max_tokens": 2048}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  total_conversations INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0,
  avg_response_time DECIMAL(10,2) DEFAULT 0
);

-- AI Agent Tools Table
CREATE TABLE ai_agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  tool_type ai_agent_tool_type NOT NULL,
  enabled BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  trigger_conditions JSONB DEFAULT '{}',
  order_priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Flows Table
CREATE TABLE ai_agent_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  stage_name VARCHAR(50) NOT NULL,
  stage_order INTEGER DEFAULT 0,
  trigger_condition JSONB DEFAULT '{}',
  actions JSONB DEFAULT '[]',
  message_template TEXT,
  next_stage_id UUID REFERENCES ai_agent_flows(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Triggers Table
CREATE TABLE ai_agent_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  trigger_type ai_agent_trigger_type NOT NULL,
  trigger_config JSONB DEFAULT '{}',
  platform_integrations JSONB DEFAULT '[]',
  handoff_rules JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Conversations Table
CREATE TABLE ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES ai_agents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status ai_agent_conversation_status DEFAULT 'active',
  message_count INTEGER DEFAULT 0,
  tools_called JSONB DEFAULT '[]',
  context_data JSONB DEFAULT '{}',
  success BOOLEAN,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  handoff_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Messages Table
CREATE TABLE ai_agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_agent_conversations(id) ON DELETE CASCADE,
  role ai_agent_message_role NOT NULL,
  content TEXT NOT NULL,
  tool_calls JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI Agent Templates Table
CREATE TABLE ai_agent_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  agent_config JSONB NOT NULL DEFAULT '{}',
  preview_image_url VARCHAR(500),
  is_public BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tools Library Table
CREATE TABLE ai_agent_tool_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  tool_type ai_agent_tool_type NOT NULL,
  icon VARCHAR(50),
  configuration_schema JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  requires_integration VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_ai_agents_company ON ai_agents(company_id);
CREATE INDEX idx_ai_agents_status ON ai_agents(status);
CREATE INDEX idx_ai_agent_tools_agent ON ai_agent_tools(agent_id);
CREATE INDEX idx_ai_agent_flows_agent ON ai_agent_flows(agent_id);
CREATE INDEX idx_ai_agent_triggers_agent ON ai_agent_triggers(agent_id);
CREATE INDEX idx_ai_agent_conversations_agent ON ai_agent_conversations(agent_id);
CREATE INDEX idx_ai_agent_conversations_contact ON ai_agent_conversations(contact_id);
CREATE INDEX idx_ai_agent_messages_conversation ON ai_agent_messages(conversation_id);
CREATE INDEX idx_ai_agent_templates_category ON ai_agent_templates(category);

-- Enable RLS
ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_agent_tool_library ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_agents (using profile field instead of role)
CREATE POLICY "Users can view agents from their company" ON ai_agents
  FOR SELECT USING (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can create agents for their company" ON ai_agents
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can update agents from their company" ON ai_agents
  FOR UPDATE USING (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can delete agents from their company" ON ai_agents
  FOR DELETE USING (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

-- RLS Policies for ai_agent_tools
CREATE POLICY "Users can manage tools for their agents" ON ai_agent_tools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_tools.agent_id AND (
        ai_agents.company_id = get_user_company_id(auth.uid()) OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
      )
    )
  );

-- RLS Policies for ai_agent_flows
CREATE POLICY "Users can manage flows for their agents" ON ai_agent_flows
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_flows.agent_id AND (
        ai_agents.company_id = get_user_company_id(auth.uid()) OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
      )
    )
  );

-- RLS Policies for ai_agent_triggers
CREATE POLICY "Users can manage triggers for their agents" ON ai_agent_triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM ai_agents WHERE ai_agents.id = ai_agent_triggers.agent_id AND (
        ai_agents.company_id = get_user_company_id(auth.uid()) OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
      )
    )
  );

-- RLS Policies for ai_agent_conversations
CREATE POLICY "Users can view conversations from their company" ON ai_agent_conversations
  FOR SELECT USING (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Service can insert conversations" ON ai_agent_conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update conversations" ON ai_agent_conversations
  FOR UPDATE USING (true);

-- RLS Policies for ai_agent_messages
CREATE POLICY "Users can view messages from their conversations" ON ai_agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ai_agent_conversations WHERE ai_agent_conversations.id = ai_agent_messages.conversation_id AND (
        ai_agent_conversations.company_id = get_user_company_id(auth.uid()) OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
      )
    )
  );

CREATE POLICY "Service can insert messages" ON ai_agent_messages
  FOR INSERT WITH CHECK (true);

-- RLS Policies for ai_agent_templates
CREATE POLICY "Users can view public templates or their own" ON ai_agent_templates
  FOR SELECT USING (
    is_public = true OR 
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can create templates" ON ai_agent_templates
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can update their templates" ON ai_agent_templates
  FOR UPDATE USING (
    company_id = get_user_company_id(auth.uid()) OR 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

-- RLS Policies for ai_agent_tool_library
CREATE POLICY "Everyone can view tool library" ON ai_agent_tool_library
  FOR SELECT USING (is_active = true);

CREATE POLICY "Super admins can manage tool library" ON ai_agent_tool_library
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND profile = 'super_admin')
  );

-- Insert default tools
INSERT INTO ai_agent_tool_library (name, display_name, description, tool_type, icon, configuration_schema, requires_integration) VALUES
('whatsapp_send', 'Enviar WhatsApp', 'Envia mensagens via WhatsApp', 'communication', 'MessageSquare', '{"templates": [], "delay": 0}', 'whatsapp'),
('email_send', 'Enviar Email', 'Envia emails formatados', 'communication', 'Mail', '{"templates": []}', 'email'),
('internal_notify', 'Notificação Interna', 'Notifica a equipe', 'communication', 'Bell', '{"channels": ["email"]}', null),
('rag_search', 'Pesquisar Base de Conhecimento', 'Busca na base vetorial', 'data', 'Search', '{"top_k": 5}', 'rag'),
('database_query', 'Consultar Banco de Dados', 'Consultas predefinidas', 'data', 'Database', '{}', null),
('contact_lookup', 'Buscar Contato', 'Busca informações do contato', 'data', 'User', '{}', null),
('call_agent', 'Chamar Outro Agente', 'Invoca outro agente', 'workflow', 'Bot', '{}', null),
('schedule_appointment', 'Agendar Compromisso', 'Agenda no calendário', 'workflow', 'Calendar', '{"duration_minutes": 60}', 'calendar'),
('create_ticket', 'Criar Ticket', 'Cria ticket de atendimento', 'workflow', 'Ticket', '{}', null),
('transfer_conversation', 'Transferir Conversa', 'Transfere para humano', 'workflow', 'ArrowRightLeft', '{}', null),
('n8n_workflow', 'Executar Workflow N8N', 'Dispara workflow externo', 'integration', 'Workflow', '{"workflow_url": ""}', 'n8n'),
('webhook_call', 'Chamar Webhook', 'Chamada HTTP externa', 'integration', 'Globe', '{"url": "", "method": "POST"}', null),
('calendar_check', 'Verificar Calendário', 'Verifica disponibilidade', 'integration', 'CalendarDays', '{}', 'google_calendar'),
('web_search', 'Pesquisar na Web', 'Busca na internet', 'ai', 'Globe', '{"max_results": 5}', null),
('sentiment_analysis', 'Análise de Sentimento', 'Analisa emoção do cliente', 'ai', 'Heart', '{}', null),
('text_classification', 'Classificar Texto', 'Classifica mensagens', 'ai', 'Tags', '{"categories": []}', null),
('image_analysis', 'Analisar Imagem', 'Analisa imagens', 'ai', 'Image', '{}', null);

-- Insert default templates
INSERT INTO ai_agent_templates (name, description, category, agent_config, is_public) VALUES
('Agendador de Consultas', 'Agente especializado em agendar consultas e compromissos.', 'scheduling', '{"agent_type": "scheduling", "tone": "friendly", "tools": ["schedule_appointment", "calendar_check", "contact_lookup"]}', true),
('Qualificador de Leads', 'Agente focado em qualificar leads para vendas.', 'sales', '{"agent_type": "sales", "tone": "professional", "tools": ["contact_lookup", "database_query", "transfer_conversation"]}', true),
('Suporte ao Cliente', 'Agente de atendimento para dúvidas e problemas.', 'customer_service', '{"agent_type": "customer_service", "tone": "empathetic", "tools": ["rag_search", "create_ticket", "transfer_conversation"]}', true),
('FAQ Bot', 'Agente simples para perguntas frequentes.', 'information', '{"agent_type": "information", "tone": "direct", "tools": ["rag_search"]}', true),
('Orquestrador Multi-Agente', 'Agente coordenador que roteia conversas.', 'custom', '{"agent_type": "custom", "tone": "professional", "tools": ["call_agent", "sentiment_analysis"]}', true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_ai_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_ai_agents_timestamp BEFORE UPDATE ON ai_agents FOR EACH ROW EXECUTE FUNCTION update_ai_agents_updated_at();
CREATE TRIGGER update_ai_agent_tools_timestamp BEFORE UPDATE ON ai_agent_tools FOR EACH ROW EXECUTE FUNCTION update_ai_agents_updated_at();
CREATE TRIGGER update_ai_agent_flows_timestamp BEFORE UPDATE ON ai_agent_flows FOR EACH ROW EXECUTE FUNCTION update_ai_agents_updated_at();
CREATE TRIGGER update_ai_agent_triggers_timestamp BEFORE UPDATE ON ai_agent_triggers FOR EACH ROW EXECUTE FUNCTION update_ai_agents_updated_at();
CREATE TRIGGER update_ai_agent_templates_timestamp BEFORE UPDATE ON ai_agent_templates FOR EACH ROW EXECUTE FUNCTION update_ai_agents_updated_at();