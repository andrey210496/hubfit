-- Enum para roles de usuÃ¡rio
CREATE TYPE public.app_role AS ENUM ('admin', 'super', 'user');

-- Enum para status de empresa
CREATE TYPE public.company_status AS ENUM ('active', 'inactive', 'trial');

-- Tabela de Planos
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  users INTEGER NOT NULL DEFAULT 1,
  connections INTEGER NOT NULL DEFAULT 1,
  queues INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  use_campaigns BOOLEAN DEFAULT true,
  use_schedules BOOLEAN DEFAULT true,
  use_internal_chat BOOLEAN DEFAULT true,
  use_external_api BOOLEAN DEFAULT true,
  use_kanban BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Empresas
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  status company_status NOT NULL DEFAULT 'active',
  due_date TIMESTAMPTZ,
  recurrence TEXT,
  phone TEXT,
  email TEXT,
  document TEXT,
  language TEXT DEFAULT 'pt-BR',
  schedules JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Perfis (vinculada ao auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  profile TEXT DEFAULT 'user',
  whatsapp_id UUID,
  token_version INTEGER DEFAULT 0,
  online BOOLEAN DEFAULT false,
  all_ticket TEXT DEFAULT 'disabled',
  reset_password TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Roles de UsuÃ¡rio (separada do profile por seguranÃ§a)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

-- FunÃ§Ã£o para verificar role do usuÃ¡rio
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- FunÃ§Ã£o para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil quando usuÃ¡rio se registra
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Planos sÃ£o pÃºblicos para leitura
CREATE POLICY "Plans are viewable by everyone" ON public.plans
  FOR SELECT USING (true);

-- Empresas visÃ­veis apenas para membros
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT USING (
    id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage companies" ON public.companies
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Perfis
CREATE POLICY "Users can view profiles in their company" ON public.profiles
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage profiles" ON public.profiles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- User roles (apenas leitura prÃ³pria)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- FunÃ§Ã£o para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Corrigir funÃ§Ã£o sem search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Tabela de Filas de Atendimento
CREATE TABLE public.queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C3AED',
  greeting_message TEXT,
  order_queue INTEGER,
  integration_id UUID,
  prompt_id UUID,
  schedules JSONB,
  out_of_hours_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de associaÃ§Ã£o UsuÃ¡rio-Fila
CREATE TABLE public.user_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  UNIQUE(user_id, queue_id)
);

-- Tabela de Contatos
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  email TEXT,
  profile_pic_url TEXT,
  is_group BOOLEAN DEFAULT false,
  whatsapp_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(number, company_id)
);

-- Tabela de Campos Customizados de Contato
CREATE TABLE public.contact_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enum de status do ticket
CREATE TYPE public.ticket_status AS ENUM ('open', 'pending', 'closed');

-- Tabela de Tickets
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uuid TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  whatsapp_id UUID,
  status ticket_status NOT NULL DEFAULT 'open',
  last_message TEXT,
  is_group BOOLEAN DEFAULT false,
  unread_messages INTEGER DEFAULT 0,
  chatbot BOOLEAN DEFAULT false,
  chatbot_at TIMESTAMPTZ,
  from_me BOOLEAN DEFAULT false,
  amount_used_bot_queues INTEGER DEFAULT 0,
  integration_id UUID,
  prompt_id UUID,
  typebot_session_id TEXT,
  typebot_status BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Mensagens
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wid TEXT,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  from_me BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  is_edited BOOLEAN DEFAULT false,
  media_url TEXT,
  media_type TEXT,
  ack INTEGER DEFAULT 0,
  remote_jid TEXT,
  participant TEXT,
  quoted_msg_id UUID,
  data_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para novas tabelas
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas para Filas
CREATE POLICY "Users can view queues in their company" ON public.queues
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage queues" ON public.queues
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PolÃ­ticas para User Queues
CREATE POLICY "Users can view their queue assignments" ON public.user_queues
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user queues" ON public.user_queues
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- PolÃ­ticas para Contatos
CREATE POLICY "Users can view contacts in their company" ON public.contacts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage contacts in their company" ON public.contacts
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- PolÃ­ticas para Campos Customizados
CREATE POLICY "Users can manage contact custom fields" ON public.contact_custom_fields
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- PolÃ­ticas para Tickets
CREATE POLICY "Users can view tickets in their company" ON public.tickets
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage tickets in their company" ON public.tickets
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- PolÃ­ticas para Mensagens
CREATE POLICY "Users can view messages in their company" ON public.messages
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create messages in their company" ON public.messages
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Triggers para updated_at
CREATE TRIGGER update_queues_updated_at BEFORE UPDATE ON public.queues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ãndices para performance
CREATE INDEX idx_tickets_company_id ON public.tickets(company_id);
CREATE INDEX idx_tickets_contact_id ON public.tickets(contact_id);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_number ON public.contacts(number);
-- Tabela de Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7C3AED',
  kanban INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de associaÃ§Ã£o Ticket-Tag
CREATE TABLE public.ticket_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  UNIQUE(ticket_id, tag_id)
);

-- Tabela de Notas de Ticket
CREATE TABLE public.ticket_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Rastreamento de Ticket
CREATE TABLE public.ticket_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  whatsapp_id UUID,
  rated BOOLEAN DEFAULT false,
  chatbot_at TIMESTAMPTZ,
  queue_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  rating_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de AvaliaÃ§Ãµes
CREATE TABLE public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rate INTEGER NOT NULL CHECK (rate >= 1 AND rate <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Mensagens RÃ¡pidas
CREATE TABLE public.quick_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shortcut TEXT NOT NULL,
  message TEXT NOT NULL,
  media_path TEXT,
  media_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Agendamentos
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  media_path TEXT,
  media_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de ConfiguraÃ§Ãµes
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Tabela de AnÃºncios
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  status BOOLEAN DEFAULT true,
  media_path TEXT,
  media_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Prompts (IA)
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  max_tokens INTEGER DEFAULT 100,
  temperature DECIMAL(3,2) DEFAULT 1.0,
  api_key TEXT,
  queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL,
  max_messages INTEGER DEFAULT 10,
  voice TEXT DEFAULT 'texto',
  voice_key TEXT,
  voice_region TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de IntegraÃ§Ãµes de Fila
CREATE TABLE public.queue_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  project_name TEXT,
  json_content JSONB,
  url_n8n TEXT,
  language TEXT,
  typebot_expire INTEGER,
  typebot_keyword_finish TEXT,
  typebot_keyword_restart TEXT,
  typebot_unknown_message TEXT,
  typebot_delay_message INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de OpÃ§Ãµes de Fila (menu do chatbot)
CREATE TABLE public.queue_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.queue_options(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  option TEXT,
  message TEXT,
  order_num INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para todas as novas tabelas
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_options ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas baseadas em company_id
CREATE POLICY "Company access" ON public.tags FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.ticket_tags FOR ALL USING (
  ticket_id IN (SELECT id FROM public.tickets WHERE company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Company access" ON public.ticket_notes FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.ticket_tracking FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.user_ratings FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.quick_messages FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.schedules FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.settings FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.announcements FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.prompts FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.queue_integrations FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.queue_options FOR ALL USING (
  queue_id IN (SELECT id FROM public.queues WHERE company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ))
);

-- Ãndices
CREATE INDEX idx_tags_company_id ON public.tags(company_id);
CREATE INDEX idx_quick_messages_company_id ON public.quick_messages(company_id);
CREATE INDEX idx_schedules_company_id ON public.schedules(company_id);
CREATE INDEX idx_schedules_send_at ON public.schedules(send_at);
CREATE INDEX idx_prompts_company_id ON public.prompts(company_id);
-- Tabela de Listas de Contatos (para campanhas)
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Itens da Lista de Contatos
CREATE TABLE public.contact_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  email TEXT,
  is_whatsapp_valid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enum de status de campanha
CREATE TYPE public.campaign_status AS ENUM ('draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled');

-- Tabela de Campanhas
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status campaign_status DEFAULT 'draft',
  message1 TEXT,
  message2 TEXT,
  message3 TEXT,
  message4 TEXT,
  message5 TEXT,
  media_path TEXT,
  media_name TEXT,
  whatsapp_id UUID,
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE SET NULL,
  file_list_id UUID,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Envios de Campanha
CREATE TABLE public.campaign_shippings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_list_item_id UUID REFERENCES public.contact_list_items(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  message TEXT,
  delivery_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de ConfiguraÃ§Ãµes de Campanha
CREATE TABLE public.campaign_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Tabela de Chat Interno
CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  last_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de UsuÃ¡rios do Chat
CREATE TABLE public.chat_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unreads INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_id, user_id)
);

-- Tabela de Mensagens do Chat Interno
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  media_path TEXT,
  media_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Arquivos (para envio em massa)
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de OpÃ§Ãµes de Arquivo
CREATE TABLE public.file_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  media_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Ajuda
CREATE TABLE public.helps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  video TEXT,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para novas tabelas
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_shippings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helps ENABLE ROW LEVEL SECURITY;

-- PolÃ­ticas de acesso
CREATE POLICY "Company access" ON public.contact_lists FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.contact_list_items FOR ALL USING (
  contact_list_id IN (SELECT id FROM public.contact_lists WHERE company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Company access" ON public.campaigns FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.campaign_shippings FOR ALL USING (
  campaign_id IN (SELECT id FROM public.campaigns WHERE company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ))
);

CREATE POLICY "Company access" ON public.campaign_settings FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.chats FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can access their chats" ON public.chat_users FOR ALL USING (
  user_id = auth.uid() OR chat_id IN (
    SELECT chat_id FROM public.chat_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can access chat messages" ON public.chat_messages FOR ALL USING (
  chat_id IN (SELECT chat_id FROM public.chat_users WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.files FOR ALL USING (
  company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Company access" ON public.file_options FOR ALL USING (
  file_id IN (SELECT id FROM public.files WHERE company_id IN (
    SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
  ))
);

-- Helps sÃ£o pÃºblicos para leitura
CREATE POLICY "Helps are public" ON public.helps FOR SELECT USING (true);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Ãndices
CREATE INDEX idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_chats_company_id ON public.chats(company_id);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);
-- Atualizar a funÃ§Ã£o handle_new_user para associar novos usuÃ¡rios Ã  empresa demo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  demo_company_id UUID;
BEGIN
  -- Buscar empresa demo ou a primeira empresa disponÃ­vel
  SELECT id INTO demo_company_id FROM public.companies LIMIT 1;
  
  INSERT INTO public.profiles (user_id, name, email, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    demo_company_id
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Atualizar profiles existentes sem company_id
UPDATE public.profiles 
SET company_id = 'a0000000-0000-0000-0000-000000000001'
WHERE company_id IS NULL;
-- Tabela para conexÃµes WhatsApp
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
-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

-- Create new policies without recursion
-- Users can always view their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can view profiles in their company using a direct check
CREATE POLICY "Users can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  company_id IS NOT NULL AND 
  company_id = (SELECT p.company_id FROM profiles p WHERE p.user_id = auth.uid() LIMIT 1)
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage all profiles
CREATE POLICY "Admins can manage profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));
-- Drop all existing policies on whatsapps that may cause recursion
DROP POLICY IF EXISTS "Users can view whatsapps in their company" ON public.whatsapps;
DROP POLICY IF EXISTS "Admins can manage whatsapps" ON public.whatsapps;

-- Create a security definer function to get user's company_id safely
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create new non-recursive policies for whatsapps
CREATE POLICY "Users can view whatsapps in their company" 
ON public.whatsapps 
FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert whatsapps in their company" 
ON public.whatsapps 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update whatsapps in their company" 
ON public.whatsapps 
FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete whatsapps in their company" 
ON public.whatsapps 
FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));

-- Update profiles policies to use the function instead of subquery
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;

CREATE POLICY "Users can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (
  company_id IS NOT NULL AND 
  company_id = get_user_company_id(auth.uid())
);
-- Create storage bucket for files
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for files bucket
CREATE POLICY "Users can upload files to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'files');

CREATE POLICY "Users can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL
);
-- Create invoices table for financial management
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  detail text,
  status text DEFAULT 'open',
  value numeric DEFAULT 0,
  due_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invoices in their company"
ON public.invoices
FOR SELECT
USING (company_id IN (
  SELECT company_id FROM profiles WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Allow super admins to manage plans
CREATE POLICY "Super admins can manage plans"
ON public.plans
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to manage all companies
CREATE POLICY "Super admins can manage all companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to view all invoices
CREATE POLICY "Super admins can manage all invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Allow super admins to manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));
-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
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
-- Fix existing contacts: mark as group if number ends with @g.us
UPDATE public.contacts
SET is_group = true, updated_at = now()
WHERE number LIKE '%@g.us' AND (is_group = false OR is_group IS NULL);

-- Fix existing contacts: ensure individual chats are marked correctly
UPDATE public.contacts
SET is_group = false, updated_at = now()
WHERE number NOT LIKE '%@g.us' AND is_group IS NULL;

-- Fix existing tickets: sync is_group from their associated contact
UPDATE public.tickets t
SET is_group = c.is_group, updated_at = now()
FROM public.contacts c
WHERE t.contact_id = c.id AND t.is_group IS DISTINCT FROM c.is_group;
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
-- Create contact_tags junction table
CREATE TABLE public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company access
CREATE POLICY "Company access" ON public.contact_tags
FOR ALL USING (
  contact_id IN (
    SELECT id FROM public.contacts
    WHERE company_id IN (
      SELECT company_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  )
);
-- Add column to store original message body before edit/delete
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_body TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.original_body IS 'Stores the original message body before edit or deletion';
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
-- Add new action types to the automation_action_type enum
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'http_request';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_email';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'send_sms';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'run_javascript';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'update_contact';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'split';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'loop';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'wait_response';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'internal_note';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'set_variable';
ALTER TYPE automation_action_type ADD VALUE IF NOT EXISTS 'google_sheets';
-- Add policy for public read of active announcements (for login page display)
CREATE POLICY "Public can view active announcements" 
ON public.announcements 
FOR SELECT 
TO anon, authenticated
USING (status = true);

-- Add index for better performance on active announcements
CREATE INDEX IF NOT EXISTS idx_announcements_status_priority 
ON public.announcements(status, priority)
WHERE status = true;
-- Add Meta Cloud API columns to whatsapps table
ALTER TABLE public.whatsapps 
ADD COLUMN IF NOT EXISTS waba_id TEXT,
ADD COLUMN IF NOT EXISTS phone_number_id TEXT,
ADD COLUMN IF NOT EXISTS access_token TEXT,
ADD COLUMN IF NOT EXISTS business_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapps_waba_id ON public.whatsapps(waba_id);
CREATE INDEX IF NOT EXISTS idx_whatsapps_phone_number_id ON public.whatsapps(phone_number_id);
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
-- Add quality rating column to whatsapps table
ALTER TABLE public.whatsapps 
ADD COLUMN IF NOT EXISTS quality_rating TEXT,
ADD COLUMN IF NOT EXISTS quality_rating_updated_at TIMESTAMP WITH TIME ZONE;

-- Add engagement/scoring columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS messages_sent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_received INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_read INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS messages_replied INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS link_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_interaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS first_interaction_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS engagement_level TEXT DEFAULT 'new';

-- Create index for engagement queries
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_score ON public.contacts(engagement_score DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_engagement_level ON public.contacts(engagement_level);
CREATE INDEX IF NOT EXISTS idx_contacts_last_interaction ON public.contacts(last_interaction_at DESC);

-- Create function to calculate engagement score
CREATE OR REPLACE FUNCTION public.calculate_contact_engagement_score(
  p_messages_sent INTEGER,
  p_messages_received INTEGER,
  p_messages_read INTEGER,
  p_messages_replied INTEGER,
  p_link_clicks INTEGER,
  p_last_interaction_at TIMESTAMP WITH TIME ZONE
) RETURNS INTEGER AS $$
DECLARE
  v_score INTEGER := 0;
  v_recency_bonus INTEGER := 0;
  v_days_since_interaction INTEGER;
BEGIN
  -- Base score from interactions
  v_score := v_score + (p_messages_received * 5); -- Received messages
  v_score := v_score + (p_messages_read * 10); -- Read messages (higher weight)
  v_score := v_score + (p_messages_replied * 20); -- Replies (highest weight)
  v_score := v_score + (p_link_clicks * 15); -- Link clicks (high engagement)
  
  -- Recency bonus
  IF p_last_interaction_at IS NOT NULL THEN
    v_days_since_interaction := EXTRACT(DAY FROM (now() - p_last_interaction_at));
    
    IF v_days_since_interaction <= 7 THEN
      v_recency_bonus := 50; -- Very recent
    ELSIF v_days_since_interaction <= 14 THEN
      v_recency_bonus := 30; -- Recent
    ELSIF v_days_since_interaction <= 30 THEN
      v_recency_bonus := 15; -- Moderately recent
    ELSIF v_days_since_interaction <= 60 THEN
      v_recency_bonus := 5; -- Somewhat recent
    ELSE
      v_recency_bonus := 0; -- Not recent
    END IF;
    
    v_score := v_score + v_recency_bonus;
  END IF;
  
  -- Cap at 100
  IF v_score > 100 THEN
    v_score := 100;
  END IF;
  
  RETURN v_score;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create function to determine engagement level
CREATE OR REPLACE FUNCTION public.get_engagement_level(p_score INTEGER) 
RETURNS TEXT AS $$
BEGIN
  IF p_score >= 80 THEN
    RETURN 'hot';
  ELSIF p_score >= 50 THEN
    RETURN 'warm';
  ELSIF p_score >= 20 THEN
    RETURN 'lukewarm';
  ELSIF p_score > 0 THEN
    RETURN 'cold';
  ELSE
    RETURN 'new';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Create trigger to auto-update engagement score
CREATE OR REPLACE FUNCTION public.update_contact_engagement() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.engagement_score := calculate_contact_engagement_score(
    NEW.messages_sent,
    NEW.messages_received,
    NEW.messages_read,
    NEW.messages_replied,
    NEW.link_clicks,
    NEW.last_interaction_at
  );
  NEW.engagement_level := get_engagement_level(NEW.engagement_score);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_contact_engagement ON public.contacts;
CREATE TRIGGER trigger_update_contact_engagement
  BEFORE UPDATE OF messages_sent, messages_received, messages_read, messages_replied, link_clicks, last_interaction_at
  ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_contact_engagement();
-- Fix storage bucket security: Make bucket private and add company-scoped policies

-- 1. Make the 'files' bucket private
UPDATE storage.buckets SET public = false WHERE id = 'files';

-- 2. Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company files" ON storage.objects;

-- 3. Create new company-scoped SELECT policy
-- Files should be stored with company_id as the first folder: files/{company_id}/{filename}
CREATE POLICY "Users can view their company files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 4. Create new company-scoped INSERT policy
CREATE POLICY "Users can upload to their company folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 5. Create new company-scoped UPDATE policy
CREATE POLICY "Users can update their company files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);

-- 6. Create new company-scoped DELETE policy
CREATE POLICY "Users can delete their company files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM profiles WHERE user_id = auth.uid()
  )
);
-- =====================================================
-- FIX CRITICAL: Protect sensitive profile data
-- =====================================================

-- Drop existing profile policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;

-- Policy 1: Users can ONLY view their own full profile (including email, reset_password)
CREATE POLICY "Users can view own full profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can view LIMITED info of company members (name only, no email/reset_password)
-- This is handled by creating a view or using column-level security
-- For now, we restrict to own profile only for SELECT

-- Policy 3: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Admins can view all profiles in their company
CREATE POLICY "Admins can view company profiles"
ON public.profiles FOR SELECT
USING (
  has_role(auth.uid(), 'admin') AND 
  company_id = get_user_company_id(auth.uid())
);

-- Policy 5: Admins can manage profiles in their company
CREATE POLICY "Admins can manage company profiles"
ON public.profiles FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND 
  company_id = get_user_company_id(auth.uid())
);

-- Policy 6: Super admins can manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.profiles FOR ALL
USING (has_role(auth.uid(), 'super'));

-- =====================================================
-- FIX CRITICAL: Protect sensitive company data
-- =====================================================

-- Drop existing company policies
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admins can manage companies" ON public.companies;
DROP POLICY IF EXISTS "Super admins can manage all companies" ON public.companies;

-- Policy 1: Users can view BASIC company info (id, name, status only)
-- We'll create a security definer function to return only safe columns
CREATE OR REPLACE FUNCTION public.get_user_company_basic()
RETURNS TABLE (
  id uuid,
  name text,
  status company_status,
  language text,
  schedules jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.status, c.language, c.schedules
  FROM companies c
  JOIN profiles p ON p.company_id = c.id
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- Policy 1: Users can only view their own company (basic info)
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT
USING (
  id = get_user_company_id(auth.uid())
);

-- Policy 2: Admins can view and manage their company (full access)
CREATE POLICY "Admins can manage own company"
ON public.companies FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND 
  id = get_user_company_id(auth.uid())
);

-- Policy 3: Super admins can manage all companies
CREATE POLICY "Super admins can manage all companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'super'));

-- =====================================================
-- FIX MEDIUM: Protect chat messages better
-- =====================================================

-- Ensure chat_users table has proper validation
-- The current policy is acceptable - users in a chat can see messages
-- But we should ensure only authorized users can be added to chats

DROP POLICY IF EXISTS "Users can access their chats" ON public.chat_users;

-- Users can only see chat_users entries for chats they are part of
CREATE POLICY "Users can view their chat memberships"
ON public.chat_users FOR SELECT
USING (
  user_id = auth.uid() OR
  chat_id IN (SELECT chat_id FROM chat_users WHERE user_id = auth.uid())
);

-- Only chat owners or admins can add users to chats
CREATE POLICY "Chat owners can manage chat users"
ON public.chat_users FOR INSERT
WITH CHECK (
  -- User can add themselves (join chat)
  user_id = auth.uid() OR
  -- Or they own the chat
  chat_id IN (SELECT id FROM chats WHERE owner_id = auth.uid()) OR
  -- Or they are admin
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Chat owners can remove chat users"
ON public.chat_users FOR DELETE
USING (
  user_id = auth.uid() OR
  chat_id IN (SELECT id FROM chats WHERE owner_id = auth.uid()) OR
  has_role(auth.uid(), 'admin')
);

-- =====================================================
-- Remove reset_password exposure - this should never be queried directly
-- =====================================================

-- Create a secure function for password reset that doesn't expose tokens
CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reset_token text;
BEGIN
  -- Generate a secure token
  reset_token := encode(gen_random_bytes(32), 'hex');
  
  -- Update the profile with the reset token
  UPDATE profiles 
  SET reset_password = reset_token, updated_at = now()
  WHERE email = user_email;
  
  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;
-- Fix chat_messages RLS policies to enforce sender identity verification
-- This prevents message spoofing where users could insert messages claiming to be from other users

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can access chat messages" ON public.chat_messages;

-- Create separate policies for each operation

-- SELECT: Users can read messages in chats they belong to
CREATE POLICY "Users can read chat messages" 
ON public.chat_messages FOR SELECT
USING (chat_id IN (SELECT chat_id FROM chat_users WHERE user_id = auth.uid()));

-- INSERT: Users can only send messages as themselves in chats they belong to
CREATE POLICY "Users can send chat messages" 
ON public.chat_messages FOR INSERT
WITH CHECK (
  chat_id IN (SELECT chat_id FROM chat_users WHERE user_id = auth.uid())
  AND sender_id = auth.uid()
);

-- UPDATE: Users can only update their own messages
CREATE POLICY "Users can update own messages" 
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- DELETE: Users can only delete their own messages
CREATE POLICY "Users can delete own messages" 
ON public.chat_messages FOR DELETE
USING (sender_id = auth.uid());
-- ETAPA 1: Sistema de GestÃ£o Fitness para Boxes de CrossFit

-- Enum para status do membro
CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'suspended', 'cancelled');

-- Enum para perÃ­odo do plano
CREATE TYPE public.plan_period AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

-- Enum para status da reserva
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'attended', 'no_show');

-- Enum para status do check-in
CREATE TYPE public.checkin_status AS ENUM ('checked_in', 'checked_out');

-- =====================================================
-- 1. TABELA: fitness_plans (Planos de AdesÃ£o)
-- =====================================================
CREATE TABLE public.fitness_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  period plan_period NOT NULL DEFAULT 'monthly',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  classes_per_week INTEGER, -- NULL = ilimitado
  benefits TEXT[], -- Array de benefÃ­cios
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 2. TABELA: members (Membros/Alunos vinculados a Contatos)
-- =====================================================
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  fitness_plan_id UUID REFERENCES public.fitness_plans(id) ON DELETE SET NULL,
  status member_status NOT NULL DEFAULT 'active',
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  medical_notes TEXT,
  birth_date DATE,
  qr_code_token TEXT UNIQUE, -- Token para QR Code de acesso
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, contact_id) -- Um contato sÃ³ pode ser membro uma vez por empresa
);

-- =====================================================
-- 3. TABELA: class_types (Tipos de Aula)
-- =====================================================
CREATE TABLE public.class_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_capacity INTEGER NOT NULL DEFAULT 20,
  color TEXT DEFAULT '#7C3AED',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 4. TABELA: class_schedules (Agenda de Aulas)
-- =====================================================
CREATE TABLE public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_type_id UUID NOT NULL REFERENCES public.class_types(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dom, 6=SÃ¡b
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER, -- Sobrescreve capacidade do tipo se definido
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. TABELA: class_sessions (SessÃµes especÃ­ficas de aula)
-- =====================================================
CREATE TABLE public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_schedule_id UUID REFERENCES public.class_schedules(id) ON DELETE SET NULL,
  class_type_id UUID NOT NULL REFERENCES public.class_types(id) ON DELETE CASCADE,
  instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL,
  current_bookings INTEGER DEFAULT 0,
  notes TEXT,
  is_cancelled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. TABELA: class_bookings (Reservas de Aulas)
-- =====================================================
CREATE TABLE public.class_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'confirmed',
  booked_at TIMESTAMPTZ DEFAULT now(),
  attended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_session_id, member_id) -- Um membro sÃ³ pode reservar uma vez por sessÃ£o
);

-- =====================================================
-- 7. TABELA: access_logs (Registro de Acessos/Check-ins)
-- =====================================================
CREATE TABLE public.access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkout_at TIMESTAMPTZ,
  checkin_method TEXT DEFAULT 'manual', -- 'qr_code', 'manual', 'biometric'
  status checkin_status DEFAULT 'checked_in',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 8. TABELA: member_payments (Pagamentos - preparado para integraÃ§Ã£o)
-- =====================================================
CREATE TABLE public.member_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  fitness_plan_id UUID REFERENCES public.fitness_plans(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT, -- 'credit_card', 'debit_card', 'pix', 'cash', 'transfer'
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue', 'cancelled'
  external_payment_id TEXT, -- ID do gateway de pagamento (Stripe, Asaas, etc)
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDICES para performance
-- =====================================================
CREATE INDEX idx_members_company ON public.members(company_id);
CREATE INDEX idx_members_contact ON public.members(contact_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_class_sessions_date ON public.class_sessions(session_date);
CREATE INDEX idx_class_sessions_company ON public.class_sessions(company_id);
CREATE INDEX idx_class_bookings_session ON public.class_bookings(class_session_id);
CREATE INDEX idx_class_bookings_member ON public.class_bookings(member_id);
CREATE INDEX idx_access_logs_member ON public.access_logs(member_id);
CREATE INDEX idx_access_logs_checkin ON public.access_logs(checkin_at);
CREATE INDEX idx_member_payments_member ON public.member_payments(member_id);
CREATE INDEX idx_member_payments_due ON public.member_payments(due_date);
CREATE INDEX idx_member_payments_status ON public.member_payments(status);

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.fitness_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_payments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- fitness_plans: empresa acessa seus planos
CREATE POLICY "Company access fitness_plans" ON public.fitness_plans
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- members: empresa acessa seus membros
CREATE POLICY "Company access members" ON public.members
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- class_types: empresa acessa seus tipos de aula
CREATE POLICY "Company access class_types" ON public.class_types
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- class_schedules: empresa acessa suas grades de horÃ¡rio
CREATE POLICY "Company access class_schedules" ON public.class_schedules
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- class_sessions: empresa acessa suas sessÃµes
CREATE POLICY "Company access class_sessions" ON public.class_sessions
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- class_bookings: empresa acessa suas reservas
CREATE POLICY "Company access class_bookings" ON public.class_bookings
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- access_logs: empresa acessa seus logs de acesso
CREATE POLICY "Company access access_logs" ON public.access_logs
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- member_payments: empresa acessa seus pagamentos
CREATE POLICY "Company access member_payments" ON public.member_payments
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- =====================================================
-- TRIGGERS para updated_at
-- =====================================================
CREATE TRIGGER update_fitness_plans_updated_at
  BEFORE UPDATE ON public.fitness_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_types_updated_at
  BEFORE UPDATE ON public.class_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_schedules_updated_at
  BEFORE UPDATE ON public.class_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_sessions_updated_at
  BEFORE UPDATE ON public.class_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_bookings_updated_at
  BEFORE UPDATE ON public.class_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_member_payments_updated_at
  BEFORE UPDATE ON public.member_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- FUNÃ‡ÃƒO: Gerar token QR Code para membro
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_member_qr_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER generate_qr_token_on_member_insert
  BEFORE INSERT ON public.members
  FOR EACH ROW EXECUTE FUNCTION generate_member_qr_token();

-- =====================================================
-- FUNÃ‡ÃƒO: Atualizar contador de reservas na sessÃ£o
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_session_booking_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE class_sessions 
    SET current_bookings = current_bookings + 1 
    WHERE id = NEW.class_session_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'confirmed' AND NEW.status != 'confirmed' THEN
      UPDATE class_sessions 
      SET current_bookings = current_bookings - 1 
      WHERE id = NEW.class_session_id;
    ELSIF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE class_sessions 
      SET current_bookings = current_bookings + 1 
      WHERE id = NEW.class_session_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.status = 'confirmed' THEN
    UPDATE class_sessions 
    SET current_bookings = current_bookings - 1 
    WHERE id = OLD.class_session_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_booking_count
  AFTER INSERT OR UPDATE OR DELETE ON public.class_bookings
  FOR EACH ROW EXECUTE FUNCTION update_session_booking_count();
-- Habilitar extensÃ£o pgcrypto para funÃ§Ã£o gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- Corrigir chamadas a gen_random_bytes (pgcrypto) quando a extensÃ£o estÃ¡ no schema extensions

CREATE OR REPLACE FUNCTION public.generate_member_qr_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_password_reset(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  reset_token text;
BEGIN
  -- Generate a secure token
  reset_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Update the profile with the reset token
  UPDATE profiles 
  SET reset_password = reset_token, updated_at = now()
  WHERE email = user_email;

  -- Return true if a row was updated
  RETURN FOUND;
END;
$$;
-- Adicionar novos campos na tabela contacts para dados pessoais
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS rg TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT, -- M, F, O
ADD COLUMN IF NOT EXISTS objective TEXT, -- Emagrecimento, Hipertrofia, Condicionamento, etc.
ADD COLUMN IF NOT EXISTS address_zipcode TEXT,
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar campo de responsÃ¡vel e consultor na tabela members
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_phone TEXT,
ADD COLUMN IF NOT EXISTS guardian_relationship TEXT,
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS has_guardian BOOLEAN DEFAULT false;
-- Create client_contracts table for managing contracts
CREATE TABLE public.client_contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  fitness_plan_id UUID REFERENCES public.fitness_plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  price NUMERIC NOT NULL DEFAULT 0,
  payment_day INTEGER DEFAULT 10,
  notes TEXT,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create client_sales table for sales history
CREATE TABLE public.client_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  sale_type TEXT NOT NULL DEFAULT 'plan' CHECK (sale_type IN ('plan', 'product', 'service', 'other')),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'refunded')),
  sold_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sold_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_contracts
CREATE POLICY "Company access client_contracts" 
ON public.client_contracts 
FOR ALL 
USING (company_id = get_user_company_id(auth.uid()));

-- RLS Policies for client_sales
CREATE POLICY "Company access client_sales" 
ON public.client_sales 
FOR ALL 
USING (company_id = get_user_company_id(auth.uid()));

-- Create indexes for better performance
CREATE INDEX idx_client_contracts_member ON public.client_contracts(member_id);
CREATE INDEX idx_client_contracts_company ON public.client_contracts(company_id);
CREATE INDEX idx_client_sales_member ON public.client_sales(member_id);
CREATE INDEX idx_client_sales_company ON public.client_sales(company_id);

-- Trigger for updated_at
CREATE TRIGGER update_client_contracts_updated_at
BEFORE UPDATE ON public.client_contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_sales_updated_at
BEFORE UPDATE ON public.client_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create payment_methods table for configurable payment options
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  icon TEXT DEFAULT 'credit-card',
  is_active BOOLEAN DEFAULT true,
  accepts_installments BOOLEAN DEFAULT false,
  max_installments INTEGER DEFAULT 1,
  fee_percentage NUMERIC DEFAULT 0,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, code)
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Company access payment_methods"
  ON public.payment_methods
  FOR ALL
  USING (company_id = get_user_company_id(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Add installment_fees column to store fees per installment (1-12)
ALTER TABLE public.payment_methods
ADD COLUMN installment_fees jsonb DEFAULT '[]'::jsonb;

-- Add credit_card_type to distinguish between machine and recurring
ALTER TABLE public.payment_methods
ADD COLUMN credit_card_type text DEFAULT NULL;

COMMENT ON COLUMN public.payment_methods.installment_fees IS 'Array of fee percentages for each installment (index 0 = 1x, index 11 = 12x)';
COMMENT ON COLUMN public.payment_methods.credit_card_type IS 'Type of credit card: machine (parcelado) or recurring (assinatura)';
-- Function to generate class sessions from a schedule for a date range
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_schedule_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_weeks_ahead INTEGER DEFAULT 8
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_sessions_created INTEGER := 0;
BEGIN
  -- Get schedule details
  SELECT * INTO v_schedule FROM class_schedules WHERE id = p_schedule_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Only generate for active schedules
  IF NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;
  
  v_end_date := p_start_date + (p_weeks_ahead * 7);
  v_current_date := p_start_date;
  
  -- Find the first occurrence of the day_of_week from start_date
  WHILE EXTRACT(DOW FROM v_current_date) != v_schedule.day_of_week AND v_current_date <= v_end_date LOOP
    v_current_date := v_current_date + 1;
  END LOOP;
  
  -- Generate sessions for each occurrence
  WHILE v_current_date <= v_end_date LOOP
    -- Check if session doesn't already exist for this date/time
    IF NOT EXISTS (
      SELECT 1 FROM class_sessions 
      WHERE class_schedule_id = p_schedule_id 
      AND session_date = v_current_date
    ) THEN
      INSERT INTO class_sessions (
        company_id,
        class_type_id,
        class_schedule_id,
        instructor_id,
        session_date,
        start_time,
        end_time,
        max_capacity,
        current_bookings,
        is_cancelled
      ) VALUES (
        v_schedule.company_id,
        v_schedule.class_type_id,
        p_schedule_id,
        v_schedule.instructor_id,
        v_current_date,
        v_schedule.start_time,
        v_schedule.end_time,
        COALESCE(v_schedule.max_capacity, (SELECT max_capacity FROM class_types WHERE id = v_schedule.class_type_id)),
        0,
        false
      );
      
      v_sessions_created := v_sessions_created + 1;
    END IF;
    
    -- Move to next week
    v_current_date := v_current_date + 7;
  END LOOP;
  
  RETURN v_sessions_created;
END;
$$;

-- Function to generate sessions for all active schedules of a company
CREATE OR REPLACE FUNCTION public.generate_all_company_sessions(
  p_company_id UUID,
  p_weeks_ahead INTEGER DEFAULT 8
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_total_created INTEGER := 0;
  v_created INTEGER;
BEGIN
  FOR v_schedule IN 
    SELECT id FROM class_schedules 
    WHERE company_id = p_company_id AND is_active = true
  LOOP
    SELECT generate_sessions_from_schedule(v_schedule.id, CURRENT_DATE, p_weeks_ahead) INTO v_created;
    v_total_created := v_total_created + v_created;
  END LOOP;
  
  RETURN v_total_created;
END;
$$;

-- Trigger function to auto-generate sessions when schedule is created or updated
CREATE OR REPLACE FUNCTION public.auto_generate_sessions_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_created INTEGER;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Generate sessions for new schedule
    PERFORM generate_sessions_from_schedule(NEW.id, CURRENT_DATE, 8);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If schedule was reactivated or key fields changed, regenerate future sessions
    IF (OLD.is_active = false AND NEW.is_active = true) OR
       OLD.start_time != NEW.start_time OR
       OLD.end_time != NEW.end_time OR
       OLD.class_type_id != NEW.class_type_id OR
       OLD.day_of_week != NEW.day_of_week OR
       COALESCE(OLD.max_capacity, 0) != COALESCE(NEW.max_capacity, 0) THEN
      
      -- Update future sessions that haven't been booked yet
      UPDATE class_sessions
      SET 
        start_time = NEW.start_time,
        end_time = NEW.end_time,
        class_type_id = NEW.class_type_id,
        max_capacity = COALESCE(NEW.max_capacity, (SELECT max_capacity FROM class_types WHERE id = NEW.class_type_id)),
        instructor_id = NEW.instructor_id,
        updated_at = now()
      WHERE class_schedule_id = NEW.id
        AND session_date >= CURRENT_DATE
        AND current_bookings = 0
        AND is_cancelled = false;
      
      -- Generate any missing sessions
      PERFORM generate_sessions_from_schedule(NEW.id, CURRENT_DATE, 8);
    END IF;
    
    -- If schedule was deactivated, cancel future sessions without bookings
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE class_sessions
      SET is_cancelled = true, updated_at = now()
      WHERE class_schedule_id = NEW.id
        AND session_date >= CURRENT_DATE
        AND current_bookings = 0;
    END IF;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Cancel future sessions without bookings when schedule is deleted
    UPDATE class_sessions
    SET is_cancelled = true, updated_at = now()
    WHERE class_schedule_id = OLD.id
      AND session_date >= CURRENT_DATE
      AND current_bookings = 0;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_sessions ON class_schedules;
CREATE TRIGGER trigger_auto_generate_sessions
  AFTER INSERT OR UPDATE OR DELETE ON class_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_sessions_trigger();

-- Generate sessions for all existing active schedules (run once)
DO $$
DECLARE
  v_company RECORD;
BEGIN
  FOR v_company IN SELECT DISTINCT company_id FROM class_schedules WHERE is_active = true LOOP
    PERFORM generate_all_company_sessions(v_company.company_id, 8);
  END LOOP;
END $$;
-- Create financial_categories table
CREATE TABLE public.financial_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense')),
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'folder',
  parent_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Company access financial_categories"
  ON public.financial_categories
  FOR ALL
  USING (company_id = get_user_company_id(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_financial_categories_updated_at
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_financial_categories_company_id ON public.financial_categories(company_id);
CREATE INDEX idx_financial_categories_type ON public.financial_categories(type);
CREATE INDEX idx_financial_categories_parent_id ON public.financial_categories(parent_id);
-- Create table to link members to auth users (for student portal login)
CREATE TABLE public.member_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(member_id),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.member_users ENABLE ROW LEVEL SECURITY;

-- Policy: Members can only see their own record
CREATE POLICY "Members can view own record" ON public.member_users
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Company admins can manage member users
CREATE POLICY "Company admins can manage member_users" ON public.member_users
  FOR ALL USING (
    company_id = get_user_company_id(auth.uid()) AND 
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
  );

-- Create function to check if user is a member
CREATE OR REPLACE FUNCTION public.is_member_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.member_users WHERE user_id = _user_id
  )
$$;

-- Create function to get member data for a user
CREATE OR REPLACE FUNCTION public.get_member_for_user(_user_id UUID)
RETURNS TABLE (
  member_id UUID,
  company_id UUID,
  contact_name TEXT,
  contact_number TEXT,
  contact_email TEXT,
  status TEXT,
  fitness_plan_name TEXT,
  expiration_date DATE
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as member_id,
    m.company_id,
    c.name as contact_name,
    c.number as contact_number,
    c.email as contact_email,
    m.status::text,
    fp.name as fitness_plan_name,
    m.expiration_date
  FROM member_users mu
  JOIN members m ON m.id = mu.member_id
  JOIN contacts c ON c.id = m.contact_id
  LEFT JOIN fitness_plans fp ON fp.id = m.fitness_plan_id
  WHERE mu.user_id = _user_id
  LIMIT 1
$$;

-- RLS policy for class_sessions: Allow members to view sessions from their company
CREATE POLICY "Members can view class sessions" ON public.class_sessions
  FOR SELECT USING (
    company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for class_types: Allow members to view class types from their company
CREATE POLICY "Members can view class types" ON public.class_types
  FOR SELECT USING (
    company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for class_bookings: Members can manage their own bookings
CREATE POLICY "Members can manage own bookings" ON public.class_bookings
  FOR ALL USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for access_logs: Members can view their own access logs
CREATE POLICY "Members can view own access logs" ON public.access_logs
  FOR SELECT USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for member_payments: Members can view their own payments
CREATE POLICY "Members can view own payments" ON public.member_payments
  FOR SELECT USING (
    member_id IN (
      SELECT mu.member_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );

-- RLS policy for announcements: Members can view active announcements
CREATE POLICY "Members can view announcements" ON public.announcements
  FOR SELECT USING (
    status = true AND company_id IN (
      SELECT mu.company_id FROM member_users mu WHERE mu.user_id = auth.uid()
    )
  );
-- Update default member status to inactive
ALTER TABLE public.members ALTER COLUMN status SET DEFAULT 'inactive'::member_status;

-- Allow inactive members to sign up for portal only if they have active contracts
CREATE OR REPLACE FUNCTION public.can_member_register_portal(member_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM members m
    JOIN contacts c ON c.id = m.contact_id
    JOIN client_contracts cc ON cc.member_id = m.id
    WHERE c.email = member_email
    AND cc.status = 'active'
  );
$$;

-- Function to get member by email for registration
CREATE OR REPLACE FUNCTION public.get_member_by_email(member_email TEXT)
RETURNS TABLE (
  member_id UUID,
  company_id UUID,
  contact_name TEXT,
  contact_email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id as member_id,
    m.company_id,
    c.name as contact_name,
    c.email as contact_email
  FROM members m
  JOIN contacts c ON c.id = m.contact_id
  JOIN client_contracts cc ON cc.member_id = m.id
  WHERE c.email = member_email
  AND cc.status = 'active'
  LIMIT 1;
$$;
-- Create a security definer function to link a user to their member record
-- This runs with elevated privileges to bypass RLS
CREATE OR REPLACE FUNCTION public.link_user_to_member(
  p_user_id uuid,
  p_member_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_company_id uuid;
BEGIN
  -- Check if the email belongs to a member with an active contract
  SELECT m.id, m.company_id INTO v_member_id, v_company_id
  FROM members m
  JOIN contacts c ON c.id = m.contact_id
  JOIN client_contracts cc ON cc.member_id = m.id
  WHERE c.email = p_member_email
  AND cc.status = 'active'
  LIMIT 1;
  
  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this member is already linked to a user
  IF EXISTS (SELECT 1 FROM member_users WHERE member_id = v_member_id) THEN
    RETURN false;
  END IF;
  
  -- Create the link
  INSERT INTO member_users (user_id, member_id, company_id)
  VALUES (p_user_id, v_member_id, v_company_id);
  
  RETURN true;
END;
$$;
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;

-- Create proper policies with WITH CHECK for INSERT/UPDATE
CREATE POLICY "Users can view contacts in their company" 
ON public.contacts 
FOR SELECT 
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert contacts in their company" 
ON public.contacts 
FOR INSERT 
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update contacts in their company" 
ON public.contacts 
FOR UPDATE 
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete contacts in their company" 
ON public.contacts 
FOR DELETE 
USING (company_id = public.get_user_company_id(auth.uid()));
-- Improve link_user_to_member to handle orphaned member records
-- (when old auth.user was deleted, allow re-linking)

CREATE OR REPLACE FUNCTION public.link_user_to_member(
  p_user_id uuid,
  p_member_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_company_id uuid;
  v_existing_user_id uuid;
BEGIN
  -- Check if the email belongs to a member with an active contract
  SELECT m.id, m.company_id INTO v_member_id, v_company_id
  FROM members m
  JOIN contacts c ON c.id = m.contact_id
  JOIN client_contracts cc ON cc.member_id = m.id
  WHERE c.email = p_member_email
  AND cc.status = 'active'
  LIMIT 1;
  
  IF v_member_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if this member is already linked to a user
  SELECT user_id INTO v_existing_user_id 
  FROM member_users 
  WHERE member_id = v_member_id;
  
  IF v_existing_user_id IS NOT NULL THEN
    -- If linked to the same user, return true (already linked)
    IF v_existing_user_id = p_user_id THEN
      RETURN true;
    END IF;
    
    -- Check if the existing user still exists in auth.users
    -- If the old user was deleted, allow re-linking
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_user_id) THEN
      -- Old user still exists, cannot re-link
      RETURN false;
    END IF;
    
    -- Old user was deleted, remove the orphaned link
    DELETE FROM member_users WHERE member_id = v_member_id;
  END IF;
  
  -- Create the link
  INSERT INTO member_users (user_id, member_id, company_id)
  VALUES (p_user_id, v_member_id, v_company_id);
  
  RETURN true;
END;
$$;

-- =============================================
-- QA FIX: Corrigir polÃ­tica UPDATE em chat_users (user_id Ã© UUID)
-- =============================================

-- Remover polÃ­tica com erro de tipo
DROP POLICY IF EXISTS "Users can update their own chat membership" ON public.chat_users;

-- Criar polÃ­tica correta (user_id Ã© UUID, nÃ£o text)
CREATE POLICY "Users can update their own chat membership"
ON public.chat_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Remover polÃ­tica antiga de plans que nÃ£o foi dropada corretamente
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;

-- =============================================
-- QA FIX: Remover polÃ­ticas pÃºblicas restantes e adicionar SELECT em chat_users
-- =============================================

-- 1. Remover polÃ­tica pÃºblica de announcements (pode ter nome diferente)
DROP POLICY IF EXISTS "Public can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

-- 2. Adicionar SELECT em chat_users (usuÃ¡rios podem ver chats que participam)
DROP POLICY IF EXISTS "Users can view their chat memberships" ON public.chat_users;

CREATE POLICY "Users can view their chat memberships"
ON public.chat_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Corrigir helps - restringir para usuÃ¡rios autenticados (da mesma empresa)
DROP POLICY IF EXISTS "Helps are public" ON public.helps;

CREATE POLICY "Helps viewable by authenticated users"
ON public.helps
FOR SELECT
TO authenticated
USING (true);

-- =============================================
-- QA FIX: Adicionar polÃ­ticas faltantes para Portal do Aluno
-- =============================================

-- 1. Membros podem ver seus contratos
CREATE POLICY "Members can view their own contracts"
ON public.client_contracts
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT mu.member_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 2. Membros podem ver suas vendas/compras
CREATE POLICY "Members can view their own sales"
ON public.client_sales
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT mu.member_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 3. UsuÃ¡rios autenticados podem ver planos (para exibir na plataforma)
CREATE POLICY "Authenticated users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- 4. Membros podem ver planos fitness de sua empresa
CREATE POLICY "Members can view company fitness plans"
ON public.fitness_plans
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 5. Membros podem ver horÃ¡rios de aulas de sua empresa
CREATE POLICY "Members can view company class schedules"
ON public.class_schedules
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 6. Membros podem ver mÃ©todos de pagamento ativos
CREATE POLICY "Members can view active payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);
-- Allow super admins to manage global WhatsApp provider settings stored in campaign_settings
-- Global settings are stored under company_id = 00000000-0000-0000-0000-000000000000

ALTER TABLE public.campaign_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins manage global campaign settings" ON public.campaign_settings;

CREATE POLICY "Super admins manage global campaign settings"
ON public.campaign_settings
AS PERMISSIVE
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'super')
  AND company_id = '00000000-0000-0000-0000-000000000000'
)
WITH CHECK (
  public.has_role(auth.uid(), 'super')
  AND company_id = '00000000-0000-0000-0000-000000000000'
);
-- Insert a special "system" company for global settings
-- This company_id is used for super admin configurations like WhatsApp provider settings

INSERT INTO public.companies (id, name, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Sistema Global',
  'active',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;
-- Drop existing policy and create a new one that also checks profile.profile = 'admin'
DROP POLICY IF EXISTS "Admins can manage api_tokens" ON public.api_tokens;

CREATE POLICY "Admins can manage api_tokens" 
ON public.api_tokens 
FOR ALL 
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND profile IN ('admin', 'super')
    )
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid()) 
  AND (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super'::app_role)
    OR EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND profile IN ('admin', 'super')
    )
  )
);
-- Create function to register a new company and user during signup
CREATE OR REPLACE FUNCTION public.register_company_and_user(
  p_user_id uuid,
  p_user_email text,
  p_user_name text,
  p_company_name text,
  p_phone text DEFAULT NULL,
  p_country text DEFAULT 'BR',
  p_plan_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_default_plan_id uuid;
BEGIN
  -- Get default plan if not provided (free plan)
  IF p_plan_id IS NULL THEN
    SELECT id INTO v_default_plan_id FROM plans WHERE price = 0 ORDER BY created_at LIMIT 1;
  ELSE
    v_default_plan_id := p_plan_id;
  END IF;

  -- Create the company
  INSERT INTO companies (name, email, phone, plan_id, status, due_date)
  VALUES (
    p_company_name,
    p_user_email,
    p_phone,
    v_default_plan_id,
    'active',
    CURRENT_DATE + INTERVAL '30 days'
  )
  RETURNING id INTO v_company_id;

  -- Create user profile linked to the new company
  INSERT INTO profiles (user_id, name, email, company_id, profile)
  VALUES (p_user_id, p_user_name, p_user_email, v_company_id, 'admin');

  -- Assign admin role to the user
  INSERT INTO user_roles (user_id, role)
  VALUES (p_user_id, 'admin');

  RETURN v_company_id;
END;
$$;

-- Update the handle_new_user trigger to NOT create profile automatically
-- since we'll handle it in the registration function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_name text;
  phone text;
  plan_id uuid;
BEGIN
  -- Check if user metadata has company info (new registration flow)
  company_name := NEW.raw_user_meta_data->>'company_name';
  phone := NEW.raw_user_meta_data->>'phone';
  plan_id := (NEW.raw_user_meta_data->>'plan_id')::uuid;
  
  IF company_name IS NOT NULL AND company_name != '' THEN
    -- New registration flow: create company and profile
    PERFORM register_company_and_user(
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      company_name,
      phone,
      COALESCE(NEW.raw_user_meta_data->>'country', 'BR'),
      plan_id
    );
  ELSE
    -- Legacy flow: just create profile without company (for backwards compatibility)
    -- This should not happen in normal flow anymore
    INSERT INTO public.profiles (user_id, name, email, company_id, profile)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.email,
      NULL,
      'user'
    );
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
  END IF;
  
  RETURN NEW;
END;
$$;
-- Drop existing restrictive policies on tickets
DROP POLICY IF EXISTS "Users can manage tickets in their company" ON public.tickets;
DROP POLICY IF EXISTS "Users can view tickets in their company" ON public.tickets;

-- Create policy that allows super admins to see ALL tickets
CREATE POLICY "Super admins can manage all tickets"
ON public.tickets
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

-- Create policy for regular users to see only their company tickets
CREATE POLICY "Users can view tickets in their company"
ON public.tickets
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage tickets in their company"
ON public.tickets
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Also add super admin access to other key tables that might be blocking
-- Messages
DROP POLICY IF EXISTS "Users can manage messages in their company" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their company" ON public.messages;

CREATE POLICY "Super admins can manage all messages"
ON public.messages
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view messages in their company"
ON public.messages
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage messages in their company"
ON public.messages
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Contacts
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;

CREATE POLICY "Super admins can manage all contacts"
ON public.contacts
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view contacts in their company"
ON public.contacts
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage contacts in their company"
ON public.contacts
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Queues
DROP POLICY IF EXISTS "Users can manage queues in their company" ON public.queues;
DROP POLICY IF EXISTS "Users can view queues in their company" ON public.queues;

CREATE POLICY "Super admins can manage all queues"
ON public.queues
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view queues in their company"
ON public.queues
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage queues in their company"
ON public.queues
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Tags
DROP POLICY IF EXISTS "Users can manage tags in their company" ON public.tags;
DROP POLICY IF EXISTS "Users can view tags in their company" ON public.tags;

CREATE POLICY "Super admins can manage all tags"
ON public.tags
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view tags in their company"
ON public.tags
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage tags in their company"
ON public.tags
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Quick Messages
DROP POLICY IF EXISTS "Users can manage quick messages in their company" ON public.quick_messages;
DROP POLICY IF EXISTS "Users can view quick messages in their company" ON public.quick_messages;

CREATE POLICY "Super admins can manage all quick messages"
ON public.quick_messages
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view quick messages in their company"
ON public.quick_messages
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage quick messages in their company"
ON public.quick_messages
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- WhatsApps
DROP POLICY IF EXISTS "Users can manage whatsapps in their company" ON public.whatsapps;
DROP POLICY IF EXISTS "Users can view whatsapps in their company" ON public.whatsapps;

CREATE POLICY "Super admins can manage all whatsapps"
ON public.whatsapps
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Users can view whatsapps in their company"
ON public.whatsapps
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can manage whatsapps in their company"
ON public.whatsapps
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));
-- Add super admin access to schedules
DROP POLICY IF EXISTS "Company access" ON public.schedules;

CREATE POLICY "Super admins can manage all schedules"
ON public.schedules
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access schedules"
ON public.schedules
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_schedules
DROP POLICY IF EXISTS "Company access class_schedules" ON public.class_schedules;

CREATE POLICY "Super admins can manage all class_schedules"
ON public.class_schedules
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_schedules"
ON public.class_schedules
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_sessions
DROP POLICY IF EXISTS "Company access class_sessions" ON public.class_sessions;

CREATE POLICY "Super admins can manage all class_sessions"
ON public.class_sessions
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_sessions"
ON public.class_sessions
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_bookings
DROP POLICY IF EXISTS "Company access class_bookings" ON public.class_bookings;

CREATE POLICY "Super admins can manage all class_bookings"
ON public.class_bookings
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_bookings"
ON public.class_bookings
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));

-- Add super admin access to class_types
DROP POLICY IF EXISTS "Company access class_types" ON public.class_types;

CREATE POLICY "Super admins can manage all class_types"
ON public.class_types
FOR ALL
USING (has_role(auth.uid(), 'super'::app_role));

CREATE POLICY "Company access class_types"
ON public.class_types
FOR ALL
USING (company_id = get_user_company_id(auth.uid()));
-- Add new fields to tags table for Kanban ordering and Meta Pixel integration
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS kanban_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}';

-- Add index for kanban ordering
CREATE INDEX IF NOT EXISTS idx_tags_kanban_order ON public.tags (company_id, kanban, kanban_order);

-- Add comment for documentation
COMMENT ON COLUMN public.tags.kanban_order IS 'Order of the tag column in Kanban view';
COMMENT ON COLUMN public.tags.meta_pixel_id IS 'Meta/Facebook Pixel ID for conversion tracking';
COMMENT ON COLUMN public.tags.meta_access_token IS 'Meta Conversions API access token';
COMMENT ON COLUMN public.tags.automation_config IS 'JSON configuration for tag-based automations';
-- Add campaign identifier field to tags for UTM matching
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS campaign_identifier TEXT;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tags_campaign_identifier 
ON public.tags (company_id, campaign_identifier) 
WHERE campaign_identifier IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tags.campaign_identifier IS 'Text pattern to match in first message for auto-tagging (e.g., [CAMPANHA_VERAO])';
-- =============================================
-- ASAAS PAYMENT GATEWAY INTEGRATION
-- =============================================

-- Table for platform-level Asaas configuration (Super Admin)
CREATE TABLE public.asaas_platform_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key_sandbox TEXT,
  api_key_production TEXT,
  platform_wallet_id TEXT, -- Wallet ID da plataforma para receber comissÃµes
  platform_fee_type TEXT NOT NULL DEFAULT 'fixed' CHECK (platform_fee_type IN ('fixed', 'percentage', 'per_plan')),
  platform_fee_value NUMERIC(10, 2) DEFAULT 0, -- Valor fixo ou percentual
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for company-level Asaas configuration (Each client/gym)
CREATE TABLE public.asaas_company_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  wallet_id TEXT, -- Wallet ID do cliente para receber pagamentos
  api_key TEXT, -- API Key prÃ³pria do cliente (opcional, se tiver subconta)
  is_subaccount BOOLEAN DEFAULT false, -- Se Ã© subconta criada pela plataforma
  subaccount_id TEXT, -- ID da subconta no Asaas
  is_active BOOLEAN DEFAULT true,
  webhook_token TEXT, -- Token para validar webhooks
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Table for payment transactions
CREATE TABLE public.asaas_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES public.client_contracts(id) ON DELETE SET NULL,
  member_payment_id UUID REFERENCES public.member_payments(id) ON DELETE SET NULL,
  
  -- Asaas specific fields
  asaas_payment_id TEXT, -- ID do pagamento no Asaas
  asaas_customer_id TEXT, -- ID do cliente no Asaas
  
  -- Payment details
  billing_type TEXT NOT NULL CHECK (billing_type IN ('BOLETO', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD')),
  value NUMERIC(10, 2) NOT NULL,
  net_value NUMERIC(10, 2), -- Valor lÃ­quido apÃ³s taxas
  platform_fee NUMERIC(10, 2) DEFAULT 0, -- ComissÃ£o da plataforma
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 
    'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS',
    'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL',
    'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS'
  )),
  
  -- Payment info
  due_date DATE NOT NULL,
  payment_date DATE,
  invoice_url TEXT, -- URL do boleto/fatura
  pix_qr_code TEXT, -- QR Code PIX
  pix_copy_paste TEXT, -- CÃ³digo PIX copia e cola
  bank_slip_url TEXT, -- URL do boleto
  
  -- Installments
  installment_count INTEGER DEFAULT 1,
  installment_number INTEGER DEFAULT 1,
  
  -- Customer info (for reference)
  customer_name TEXT,
  customer_email TEXT,
  customer_cpf_cnpj TEXT,
  
  -- Metadata
  description TEXT,
  external_reference TEXT, -- ReferÃªncia externa para vincular ao sistema
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for Asaas customers (synced with contacts/members)
CREATE TABLE public.asaas_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  
  asaas_customer_id TEXT NOT NULL, -- ID do cliente no Asaas
  name TEXT NOT NULL,
  email TEXT,
  cpf_cnpj TEXT,
  phone TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, asaas_customer_id)
);

-- Enable RLS on all tables
ALTER TABLE public.asaas_platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_company_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asaas_customers ENABLE ROW LEVEL SECURITY;

-- Platform config: Only super admins can manage
CREATE POLICY "Super admins can manage platform config"
  ON public.asaas_platform_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  );

-- Company config: Companies can manage their own, super admins can see all
CREATE POLICY "Companies can manage their own Asaas config"
  ON public.asaas_company_config
  FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  );

-- Payments: Companies can view their own payments
CREATE POLICY "Companies can view their own payments"
  ON public.asaas_payments
  FOR SELECT
  USING (
    company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  );

-- Payments: Only service role can insert/update (via edge functions)
CREATE POLICY "Service role can manage payments"
  ON public.asaas_payments
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Customers: Companies can manage their own customers
CREATE POLICY "Companies can manage their own customers"
  ON public.asaas_customers
  FOR ALL
  USING (
    company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  )
  WITH CHECK (
    company_id = get_user_company_id(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'super'
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_asaas_platform_config_updated_at
  BEFORE UPDATE ON public.asaas_platform_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_company_config_updated_at
  BEFORE UPDATE ON public.asaas_company_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_payments_updated_at
  BEFORE UPDATE ON public.asaas_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asaas_customers_updated_at
  BEFORE UPDATE ON public.asaas_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_asaas_payments_company_id ON public.asaas_payments(company_id);
CREATE INDEX idx_asaas_payments_member_id ON public.asaas_payments(member_id);
CREATE INDEX idx_asaas_payments_status ON public.asaas_payments(status);
CREATE INDEX idx_asaas_payments_due_date ON public.asaas_payments(due_date);
CREATE INDEX idx_asaas_payments_asaas_id ON public.asaas_payments(asaas_payment_id);
CREATE INDEX idx_asaas_customers_company_id ON public.asaas_customers(company_id);
CREATE INDEX idx_asaas_customers_asaas_id ON public.asaas_customers(asaas_customer_id);
-- Add address fields to companies table for Asaas subaccount creation
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zipcode TEXT,
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS company_type TEXT DEFAULT 'MEI';

-- Add webhook token to asaas_company_config for tracking
COMMENT ON COLUMN public.asaas_company_config.subaccount_id IS 'Asaas subaccount ID when automatically created';
-- Create PAR-Q responses table
CREATE TABLE public.par_q_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  completed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 10 questions (boolean: true = YES, false = NO)
  question_1 BOOLEAN NOT NULL DEFAULT false,
  question_2 BOOLEAN NOT NULL DEFAULT false,
  question_3 BOOLEAN NOT NULL DEFAULT false,
  question_4 BOOLEAN NOT NULL DEFAULT false,
  question_5 BOOLEAN NOT NULL DEFAULT false,
  question_6 BOOLEAN NOT NULL DEFAULT false,
  question_7 BOOLEAN NOT NULL DEFAULT false,
  question_8 BOOLEAN NOT NULL DEFAULT false,
  question_9 BOOLEAN NOT NULL DEFAULT false,
  question_10 BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional details for question 10
  question_10_details TEXT,
  
  -- Computed field: true if any answer is YES
  has_medical_restriction BOOLEAN NOT NULL DEFAULT false,
  
  -- Digital signature
  signature TEXT NOT NULL,
  
  -- Audit fields
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_par_q_responses_member_id ON public.par_q_responses(member_id);
CREATE INDEX idx_par_q_responses_company_id ON public.par_q_responses(company_id);
CREATE INDEX idx_par_q_responses_completed_date ON public.par_q_responses(completed_date DESC);

-- Enable RLS
ALTER TABLE public.par_q_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view PAR-Q responses from their company"
ON public.par_q_responses
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create PAR-Q responses for their company"
ON public.par_q_responses
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update PAR-Q responses from their company"
ON public.par_q_responses
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete PAR-Q responses from their company"
ON public.par_q_responses
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_par_q_responses_updated_at
BEFORE UPDATE ON public.par_q_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Add columns for webcam photo and metadata validation
ALTER TABLE public.par_q_responses 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS validation_metadata JSONB DEFAULT '{}';

-- Add comment to explain the validation_metadata structure
COMMENT ON COLUMN public.par_q_responses.validation_metadata IS 'Stores IP address, user agent, timestamp, and device info for legal validation';
COMMENT ON COLUMN public.par_q_responses.photo_url IS 'URL of the webcam photo taken at the moment of signature';
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view PAR-Q responses from their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can create PAR-Q responses for their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can update PAR-Q responses from their company" ON public.par_q_responses;
DROP POLICY IF EXISTS "Users can delete PAR-Q responses from their company" ON public.par_q_responses;

-- Create corrected policies using the helper function
CREATE POLICY "Users can view PAR-Q responses from their company" 
ON public.par_q_responses FOR SELECT 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can create PAR-Q responses for their company" 
ON public.par_q_responses FOR INSERT 
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update PAR-Q responses from their company" 
ON public.par_q_responses FOR UPDATE 
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete PAR-Q responses from their company" 
ON public.par_q_responses FOR DELETE 
USING (company_id = get_user_company_id(auth.uid()));
-- Make the files bucket public so PAR-Q photos can be accessed
UPDATE storage.buckets SET public = true WHERE id = 'files';
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
('internal_notify', 'NotificaÃ§Ã£o Interna', 'Notifica a equipe', 'communication', 'Bell', '{"channels": ["email"]}', null),
('rag_search', 'Pesquisar Base de Conhecimento', 'Busca na base vetorial', 'data', 'Search', '{"top_k": 5}', 'rag'),
('database_query', 'Consultar Banco de Dados', 'Consultas predefinidas', 'data', 'Database', '{}', null),
('contact_lookup', 'Buscar Contato', 'Busca informaÃ§Ãµes do contato', 'data', 'User', '{}', null),
('call_agent', 'Chamar Outro Agente', 'Invoca outro agente', 'workflow', 'Bot', '{}', null),
('schedule_appointment', 'Agendar Compromisso', 'Agenda no calendÃ¡rio', 'workflow', 'Calendar', '{"duration_minutes": 60}', 'calendar'),
('create_ticket', 'Criar Ticket', 'Cria ticket de atendimento', 'workflow', 'Ticket', '{}', null),
('transfer_conversation', 'Transferir Conversa', 'Transfere para humano', 'workflow', 'ArrowRightLeft', '{}', null),
('n8n_workflow', 'Executar Workflow N8N', 'Dispara workflow externo', 'integration', 'Workflow', '{"workflow_url": ""}', 'n8n'),
('webhook_call', 'Chamar Webhook', 'Chamada HTTP externa', 'integration', 'Globe', '{"url": "", "method": "POST"}', null),
('calendar_check', 'Verificar CalendÃ¡rio', 'Verifica disponibilidade', 'integration', 'CalendarDays', '{}', 'google_calendar'),
('web_search', 'Pesquisar na Web', 'Busca na internet', 'ai', 'Globe', '{"max_results": 5}', null),
('sentiment_analysis', 'AnÃ¡lise de Sentimento', 'Analisa emoÃ§Ã£o do cliente', 'ai', 'Heart', '{}', null),
('text_classification', 'Classificar Texto', 'Classifica mensagens', 'ai', 'Tags', '{"categories": []}', null),
('image_analysis', 'Analisar Imagem', 'Analisa imagens', 'ai', 'Image', '{}', null);

-- Insert default templates
INSERT INTO ai_agent_templates (name, description, category, agent_config, is_public) VALUES
('Agendador de Consultas', 'Agente especializado em agendar consultas e compromissos.', 'scheduling', '{"agent_type": "scheduling", "tone": "friendly", "tools": ["schedule_appointment", "calendar_check", "contact_lookup"]}', true),
('Qualificador de Leads', 'Agente focado em qualificar leads para vendas.', 'sales', '{"agent_type": "sales", "tone": "professional", "tools": ["contact_lookup", "database_query", "transfer_conversation"]}', true),
('Suporte ao Cliente', 'Agente de atendimento para dÃºvidas e problemas.', 'customer_service', '{"agent_type": "customer_service", "tone": "empathetic", "tools": ["rag_search", "create_ticket", "transfer_conversation"]}', true),
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
-- Add ai_agent_id to queues table
ALTER TABLE public.queues
ADD COLUMN IF NOT EXISTS ai_agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_queues_ai_agent_id ON public.queues(ai_agent_id);

-- Add handoff_keywords column to ai_agents for keyword-based handoff
ALTER TABLE public.ai_agents
ADD COLUMN IF NOT EXISTS handoff_keywords TEXT[] DEFAULT ARRAY['ATENDENTE', 'HUMANO', 'PESSOA', 'ATENDIMENTO'];

COMMENT ON COLUMN public.queues.ai_agent_id IS 'AI Agent that will automatically respond to tickets in this queue';
COMMENT ON COLUMN public.ai_agents.handoff_keywords IS 'Keywords that trigger handoff to human agent';
-- Add default_queue_id to whatsapps table
ALTER TABLE public.whatsapps
ADD COLUMN IF NOT EXISTS default_queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapps_default_queue_id ON public.whatsapps(default_queue_id);

COMMENT ON COLUMN public.whatsapps.default_queue_id IS 'Default queue for new tickets from this WhatsApp connection';
-- Create junction table for whatsapp-queue many-to-many relationship
CREATE TABLE public.whatsapp_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_id UUID NOT NULL REFERENCES public.whatsapps(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(whatsapp_id, queue_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_queues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view whatsapp_queues from their company" 
ON public.whatsapp_queues 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapps w 
    JOIN public.profiles p ON p.company_id = w.company_id 
    WHERE w.id = whatsapp_queues.whatsapp_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage whatsapp_queues from their company" 
ON public.whatsapp_queues 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapps w 
    JOIN public.profiles p ON p.company_id = w.company_id 
    WHERE w.id = whatsapp_queues.whatsapp_id AND p.user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX idx_whatsapp_queues_whatsapp_id ON public.whatsapp_queues(whatsapp_id);
CREATE INDEX idx_whatsapp_queues_queue_id ON public.whatsapp_queues(queue_id);
-- Knowledge Base table for AI agents
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view knowledge base entries from their company"
  ON public.knowledge_base FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = knowledge_base.company_id
    )
  );

CREATE POLICY "Admins can insert knowledge base entries"
  ON public.knowledge_base FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = knowledge_base.company_id
      AND profiles.profile IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can update knowledge base entries"
  ON public.knowledge_base FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = knowledge_base.company_id
      AND profiles.profile IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can delete knowledge base entries"
  ON public.knowledge_base FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.company_id = knowledge_base.company_id
      AND profiles.profile IN ('admin', 'super_admin')
    )
  );

-- Create index for full-text search
CREATE INDEX idx_knowledge_base_search ON public.knowledge_base 
  USING GIN (to_tsvector('portuguese', title || ' ' || content));

-- Create index for company and agent
CREATE INDEX idx_knowledge_base_company ON public.knowledge_base(company_id);
CREATE INDEX idx_knowledge_base_agent ON public.knowledge_base(agent_id);

-- Trigger for updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Admins can insert knowledge base entries" ON public.knowledge_base;

-- Create corrected INSERT policy using the helper function
CREATE POLICY "Admins can insert knowledge base entries" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.profile IN ('admin', 'super_admin')
  )
);
-- Rebuild knowledge_base RLS policies to use roles table (has_role) + company helper

-- SELECT: company users can read their company knowledge base
DROP POLICY IF EXISTS "Users can view knowledge base entries from their company" ON public.knowledge_base;
CREATE POLICY "Users can view knowledge base entries from their company"
ON public.knowledge_base
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
);

-- INSERT: admins/super can insert into their company
DROP POLICY IF EXISTS "Admins can insert knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can insert knowledge base entries"
ON public.knowledge_base
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);

-- UPDATE: admins/super can update within their company
DROP POLICY IF EXISTS "Admins can update knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can update knowledge base entries"
ON public.knowledge_base
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);

-- DELETE: admins/super can delete within their company
DROP POLICY IF EXISTS "Admins can delete knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can delete knowledge base entries"
ON public.knowledge_base
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);
-- Fix: created_by should reference profiles.user_id, not profiles.id
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_created_by_fkey;

ALTER TABLE public.knowledge_base 
ADD CONSTRAINT knowledge_base_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
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
  ('member_info', 'InformaÃ§Ãµes do Aluno', 'Retorna informaÃ§Ãµes completas do aluno (plano, vencimento, aulas)', 'data'::ai_agent_tool_type, 'UserCheck', true, '{}'::jsonb),
  ('member_bookings', 'Aulas Agendadas', 'Lista as aulas agendadas do aluno', 'data'::ai_agent_tool_type, 'CalendarCheck', true, '{}'::jsonb),
  
  -- Scheduling Sub-Agent Tools
  ('class_availability', 'Verificar Disponibilidade', 'Verifica horÃ¡rios disponÃ­veis para aulas', 'workflow'::ai_agent_tool_type, 'Clock', true, '{"days_ahead": 7}'::jsonb),
  ('class_book', 'Agendar Aula', 'Agenda uma aula experimental ou regular para o cliente', 'workflow'::ai_agent_tool_type, 'CalendarPlus', true, '{}'::jsonb),
  ('class_cancel', 'Cancelar Agendamento', 'Cancela um agendamento existente', 'workflow'::ai_agent_tool_type, 'CalendarX', true, '{}'::jsonb),
  ('class_reschedule', 'Remarcar Aula', 'Remarca uma aula para outro horÃ¡rio', 'workflow'::ai_agent_tool_type, 'CalendarClock', true, '{}'::jsonb),
  
  -- Confirmation Tools
  ('confirm_action', 'Confirmar AÃ§Ã£o', 'Confirma uma aÃ§Ã£o pendente do cliente', 'workflow'::ai_agent_tool_type, 'CheckCircle', true, '{}'::jsonb),
  ('cancel_action', 'Cancelar AÃ§Ã£o', 'Cancela uma aÃ§Ã£o pendente', 'workflow'::ai_agent_tool_type, 'XCircle', true, '{}'::jsonb)
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
-- Add tools and context_variables columns to ai_sub_agents
ALTER TABLE public.ai_sub_agents 
ADD COLUMN IF NOT EXISTS tools jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS context_variables jsonb DEFAULT '[]'::jsonb;

-- Add comments
COMMENT ON COLUMN public.ai_sub_agents.tools IS 'Array of tool configurations for this sub-agent';
COMMENT ON COLUMN public.ai_sub_agents.context_variables IS 'Context variables specific to this sub-agent';
-- Make parent_agent_id nullable so sub-agents can exist independently
ALTER TABLE public.ai_sub_agents ALTER COLUMN parent_agent_id DROP NOT NULL;

-- Create junction table for agent-subagent relationships
CREATE TABLE IF NOT EXISTS public.ai_agent_subagents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  sub_agent_id uuid NOT NULL REFERENCES public.ai_sub_agents(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  execution_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_id, sub_agent_id)
);

-- Enable RLS
ALTER TABLE public.ai_agent_subagents ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_agent_subagents
CREATE POLICY "Users can view agent-subagent links for their company" 
  ON public.ai_agent_subagents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ai_agent_subagents.agent_id AND p.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage agent-subagent links for their company" 
  ON public.ai_agent_subagents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_agents a
      JOIN public.profiles p ON p.company_id = a.company_id
      WHERE a.id = ai_agent_subagents.agent_id AND p.id = auth.uid()
    )
  );

-- Update trigger for updated_at
CREATE TRIGGER update_ai_agent_subagents_updated_at
  BEFORE UPDATE ON public.ai_agent_subagents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can view agent-subagent links for their company" ON public.ai_agent_subagents;

-- Create proper RLS policies with WITH CHECK for INSERT/UPDATE
CREATE POLICY "Users can view agent-subagent links for their company"
ON public.ai_agent_subagents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can insert agent-subagent links for their company"
ON public.ai_agent_subagents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can update agent-subagent links for their company"
ON public.ai_agent_subagents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = agent_id 
    AND p.id = auth.uid()
  )
);

CREATE POLICY "Users can delete agent-subagent links for their company"
ON public.ai_agent_subagents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM ai_agents a
    JOIN profiles p ON p.company_id = a.company_id
    WHERE a.id = ai_agent_subagents.agent_id 
    AND p.id = auth.uid()
  )
);
-- Fix RLS policies for ai_agent_subagents: profiles join must use user_id (auth uid)

DROP POLICY IF EXISTS "Users can view agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can insert agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can update agent-subagent links for their company" ON public.ai_agent_subagents;
DROP POLICY IF EXISTS "Users can delete agent-subagent links for their company" ON public.ai_agent_subagents;

CREATE POLICY "Users can view agent-subagent links for their company"
ON public.ai_agent_subagents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can insert agent-subagent links for their company"
ON public.ai_agent_subagents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can update agent-subagent links for their company"
ON public.ai_agent_subagents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);

CREATE POLICY "Users can delete agent-subagent links for their company"
ON public.ai_agent_subagents
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.ai_agents a
    JOIN public.profiles p ON p.company_id = a.company_id
    WHERE a.id = public.ai_agent_subagents.agent_id
      AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.profile = 'super_admin'
  )
);
-- Create table for trial class bookings (for leads who are not members yet)
CREATE TABLE public.trial_class_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  class_session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'attended', 'no_show')),
  booked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  attended_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trial_class_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view trial bookings from their company"
  ON public.trial_class_bookings FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can create trial bookings in their company"
  ON public.trial_class_bookings FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update trial bookings in their company"
  ON public.trial_class_bookings FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete trial bookings in their company"
  ON public.trial_class_bookings FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()));

-- Service role policy for edge functions
CREATE POLICY "Service role can manage trial bookings"
  ON public.trial_class_bookings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for performance
CREATE INDEX idx_trial_bookings_session ON public.trial_class_bookings(class_session_id);
CREATE INDEX idx_trial_bookings_contact ON public.trial_class_bookings(contact_id);
CREATE INDEX idx_trial_bookings_company ON public.trial_class_bookings(company_id);

-- Add trigger for updated_at
CREATE TRIGGER update_trial_bookings_updated_at
  BEFORE UPDATE ON public.trial_class_bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.trial_class_bookings;
-- Create structured knowledge base configuration table for AI agents
CREATE TABLE public.ai_agent_knowledge_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  
  -- Planos e Valores
  plans_from_system BOOLEAN DEFAULT true,
  plans_manual TEXT,
  
  -- HorÃ¡rios (sempre automÃ¡tico do sistema)
  schedules_auto BOOLEAN DEFAULT true,
  
  -- EndereÃ§o e Contato
  address TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  
  -- Agregadores e ConvÃªnios
  accepts_wellhub BOOLEAN DEFAULT false,
  wellhub_plans TEXT,
  accepts_totalpass BOOLEAN DEFAULT false,
  totalpass_plans TEXT,
  accepts_gympass BOOLEAN DEFAULT false,
  gympass_plans TEXT,
  other_aggregators TEXT,
  
  -- Estrutura e Comodidades
  has_showers BOOLEAN DEFAULT false,
  has_lockers BOOLEAN DEFAULT false,
  has_parking BOOLEAN DEFAULT false,
  has_air_conditioning BOOLEAN DEFAULT false,
  has_wifi BOOLEAN DEFAULT false,
  other_amenities TEXT,
  
  -- Links e Redes
  google_maps_link TEXT,
  whatsapp_group_enabled BOOLEAN DEFAULT false,
  whatsapp_group_link TEXT,
  
  -- PolÃ­ticas e Regras
  offers_trial_class BOOLEAN DEFAULT false,
  trial_class_details TEXT,
  accepts_children BOOLEAN DEFAULT false,
  children_min_age INTEGER,
  has_enrollment_fee BOOLEAN DEFAULT false,
  enrollment_fee_value DECIMAL(10,2),
  has_family_discount BOOLEAN DEFAULT false,
  family_discount_details TEXT,
  
  -- InformaÃ§Ãµes Adicionais
  opening_hours TEXT,
  additional_info TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agent_knowledge_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their company knowledge config"
  ON public.ai_agent_knowledge_config FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their company knowledge config"
  ON public.ai_agent_knowledge_config FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_ai_agent_knowledge_config_updated_at
  BEFORE UPDATE ON public.ai_agent_knowledge_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_ai_agent_knowledge_config_company ON public.ai_agent_knowledge_config(company_id);
CREATE INDEX idx_ai_agent_knowledge_config_agent ON public.ai_agent_knowledge_config(agent_id);
-- Create rooms/spaces table for gyms to organize classes
CREATE TABLE public.class_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add room_id to class_schedules (optional)
ALTER TABLE public.class_schedules 
ADD COLUMN room_id UUID REFERENCES public.class_rooms(id) ON DELETE SET NULL;

-- Add room_id to class_sessions (optional)
ALTER TABLE public.class_sessions
ADD COLUMN room_id UUID REFERENCES public.class_rooms(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.class_rooms ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view rooms from their company" 
ON public.class_rooms 
FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can manage rooms from their company" 
ON public.class_rooms 
FOR ALL 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_class_rooms_updated_at
BEFORE UPDATE ON public.class_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
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
 '{"name": "query_customer", "description": "Busca cliente pelo telefone para identificar tipo", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "NÃºmero de telefone do cliente"}}, "required": ["phone"]}}', true),
('register_lead', 'Cadastrar Lead', 'Registra novo lead no sistema', 'api_call',
 '{"name": "register_lead", "description": "Cadastra novo lead com nome e telefone", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do lead"}, "name": {"type": "string", "description": "Nome do lead"}}, "required": ["phone", "name"]}}', true),
('check_availability', 'Verificar Disponibilidade', 'Verifica horÃ¡rios disponÃ­veis para aulas', 'api_call',
 '{"name": "check_availability", "description": "Verifica disponibilidade de horÃ¡rios para agendar aula", "parameters": {"type": "object", "properties": {"modality": {"type": "string", "description": "Modalidade da aula"}, "date": {"type": "string", "description": "Data desejada (YYYY-MM-DD)"}, "time_preference": {"type": "string", "description": "PreferÃªncia de turno: manha, tarde, noite"}}, "required": ["date"]}}', true),
('book_appointment', 'Agendar Aula', 'Agenda aula experimental', 'api_call',
 '{"name": "book_appointment", "description": "Agenda aula experimental para o lead", "parameters": {"type": "object", "properties": {"session_id": {"type": "string", "description": "ID da sessÃ£o de aula"}, "customer_phone": {"type": "string", "description": "Telefone do cliente"}, "customer_name": {"type": "string", "description": "Nome do cliente"}}, "required": ["session_id", "customer_phone"]}}', true),
('cancel_booking', 'Cancelar Agendamento', 'Cancela agendamento existente', 'api_call',
 '{"name": "cancel_booking", "description": "Cancela um agendamento existente", "parameters": {"type": "object", "properties": {"booking_id": {"type": "string", "description": "ID do agendamento"}}, "required": ["booking_id"]}}', true),
('find_booking', 'Buscar Agendamento', 'Busca agendamentos do cliente', 'database_query',
 '{"name": "find_booking", "description": "Busca agendamentos existentes do cliente", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do cliente"}}, "required": ["phone"]}}', true),
('reschedule_booking', 'Reagendar Aula', 'Reagenda aula para novo horÃ¡rio', 'api_call',
 '{"name": "reschedule_booking", "description": "Reagenda aula para nova data/horÃ¡rio", "parameters": {"type": "object", "properties": {"booking_id": {"type": "string", "description": "ID do agendamento atual"}, "new_session_id": {"type": "string", "description": "ID da nova sessÃ£o"}}, "required": ["booking_id", "new_session_id"]}}', true),
('search_knowledge', 'Buscar Conhecimento', 'Busca na base de conhecimento (RAG)', 'rag_search',
 '{"name": "search_knowledge", "description": "Busca informaÃ§Ãµes na base de conhecimento da empresa", "parameters": {"type": "object", "properties": {"query": {"type": "string", "description": "Texto da busca"}, "category": {"type": "string", "description": "Categoria opcional: precos, modalidades, horarios, politicas"}}, "required": ["query"]}}', true),
('query_student_data', 'Consultar Aluno', 'Busca dados completos do aluno', 'database_query',
 '{"name": "query_student_data", "description": "Busca dados do aluno ativo: plano, pagamentos, aulas", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do aluno"}, "field": {"type": "string", "description": "Campo especÃ­fico: plan, payments, bookings, all"}}, "required": ["phone"]}}', true),
('transfer_to_human', 'Transferir para Atendente', 'Transfere conversa para atendente humano', 'api_call',
 '{"name": "transfer_to_human", "description": "Transfere a conversa para um atendente humano", "parameters": {"type": "object", "properties": {"reason": {"type": "string", "description": "Motivo da transferÃªncia"}}, "required": ["reason"]}}', true),
('update_customer_crm', 'Atualizar CRM', 'Atualiza dados do cliente no CRM', 'api_call',
 '{"name": "update_customer_crm", "description": "Atualiza dados do cliente/lead no sistema", "parameters": {"type": "object", "properties": {"phone": {"type": "string", "description": "Telefone do cliente"}, "fields": {"type": "object", "description": "Campos a atualizar: name, email, cpf, birth_date, etc"}}, "required": ["phone", "fields"]}}', true)
ON CONFLICT (name) DO NOTHING;

-- 17. Enable realtime for agent_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_messages;

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can manage rooms from their company" ON public.class_rooms;
DROP POLICY IF EXISTS "Users can view rooms from their company" ON public.class_rooms;

-- Create correct policies using the helper function
CREATE POLICY "Users can view rooms from their company"
ON public.class_rooms FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert rooms in their company"
ON public.class_rooms FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update rooms from their company"
ON public.class_rooms FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete rooms from their company"
ON public.class_rooms FOR DELETE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));
-- Fix ai_agent_templates RLS: Remove public access, require authentication
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can view public templates or their own" ON public.ai_agent_templates;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view public templates or their own"
ON public.ai_agent_templates
FOR SELECT
TO authenticated
USING (
  is_public = true 
  OR company_id = get_user_company_id(auth.uid())
  OR created_by = auth.uid()
);

-- Ensure other operations are also properly secured
DROP POLICY IF EXISTS "Users can manage their own templates" ON public.ai_agent_templates;

CREATE POLICY "Authenticated users can insert their own templates"
ON public.ai_agent_templates
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Authenticated users can update their own templates"
ON public.ai_agent_templates
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Authenticated users can delete their own templates"
ON public.ai_agent_templates
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND created_by = auth.uid()
);
-- =============================================
-- SECURITY FIX: Role-based access and SECURITY DEFINER authorization
-- =============================================

-- Step 1: Create helper function to check if user can access ALL contacts (admin/super)
CREATE OR REPLACE FUNCTION public.can_access_all_contacts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
    AND role IN ('admin', 'super')
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
    AND profile IN ('admin', 'supervisor')
  )
$$;

-- Step 2: Create function to check if user has access to a specific contact
CREATE OR REPLACE FUNCTION public.can_user_access_contact(_user_id uuid, _contact_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN can_access_all_contacts(_user_id) THEN true
      ELSE 
        -- Regular users can only access contacts from tickets they're assigned to
        EXISTS (
          SELECT 1 FROM public.tickets t
          JOIN public.profiles p ON p.user_id = _user_id
          WHERE t.contact_id = _contact_id
          AND t.user_id = p.id
        )
    END
$$;

-- Step 3: Drop existing overlapping policies on contacts
DROP POLICY IF EXISTS "Users can manage contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can view contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can update contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Super admins can manage all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can manage all company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can view accessible contacts" ON public.contacts;
DROP POLICY IF EXISTS "Users can create contacts in their company" ON public.contacts;
DROP POLICY IF EXISTS "Users can update accessible contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admins can delete contacts" ON public.contacts;

-- Step 4: Create new role-based policies

-- Admins can manage ALL contacts in their company
CREATE POLICY "Admins full access to company contacts"
ON public.contacts
FOR ALL
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
);

-- Regular users can VIEW contacts they have access to via assigned tickets
CREATE POLICY "Users view assigned contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    can_access_all_contacts(auth.uid())
    OR can_user_access_contact(auth.uid(), id)
  )
);

-- Any user can CREATE contacts in their company
CREATE POLICY "Users create company contacts"
ON public.contacts
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- Users can UPDATE contacts they have access to
CREATE POLICY "Users update assigned contacts"
ON public.contacts
FOR UPDATE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND (
    can_access_all_contacts(auth.uid())
    OR can_user_access_contact(auth.uid(), id)
  )
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
);

-- Only admins can DELETE contacts
CREATE POLICY "Admins delete contacts"
ON public.contacts
FOR DELETE
TO authenticated
USING (
  company_id = get_user_company_id(auth.uid())
  AND can_access_all_contacts(auth.uid())
);

-- =============================================
-- FIX 2: SECURITY DEFINER functions with authorization
-- =============================================

-- Update generate_sessions_from_schedule with ownership verification
CREATE OR REPLACE FUNCTION public.generate_sessions_from_schedule(
  p_schedule_id uuid, 
  p_start_date date DEFAULT CURRENT_DATE, 
  p_weeks_ahead integer DEFAULT 8
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_current_date DATE;
  v_end_date DATE;
  v_sessions_created INTEGER := 0;
  v_user_company_id UUID;
BEGIN
  -- Authorization check: verify user owns this schedule
  v_user_company_id := get_user_company_id(auth.uid());
  
  -- Get schedule details with ownership verification
  SELECT * INTO v_schedule 
  FROM class_schedules 
  WHERE id = p_schedule_id
    AND company_id = v_user_company_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found or access denied';
  END IF;
  
  IF NOT v_schedule.is_active THEN
    RETURN 0;
  END IF;
  
  v_end_date := p_start_date + (p_weeks_ahead * 7);
  v_current_date := p_start_date;
  
  WHILE EXTRACT(DOW FROM v_current_date) != v_schedule.day_of_week AND v_current_date <= v_end_date LOOP
    v_current_date := v_current_date + 1;
  END LOOP;
  
  WHILE v_current_date <= v_end_date LOOP
    IF NOT EXISTS (
      SELECT 1 FROM class_sessions 
      WHERE class_schedule_id = p_schedule_id 
      AND session_date = v_current_date
    ) THEN
      INSERT INTO class_sessions (
        company_id, class_type_id, class_schedule_id, instructor_id,
        session_date, start_time, end_time, max_capacity, current_bookings, is_cancelled
      ) VALUES (
        v_schedule.company_id, v_schedule.class_type_id, p_schedule_id, v_schedule.instructor_id,
        v_current_date, v_schedule.start_time, v_schedule.end_time,
        COALESCE(v_schedule.max_capacity, (SELECT max_capacity FROM class_types WHERE id = v_schedule.class_type_id)),
        0, false
      );
      v_sessions_created := v_sessions_created + 1;
    END IF;
    v_current_date := v_current_date + 7;
  END LOOP;
  
  RETURN v_sessions_created;
END;
$$;

-- Update generate_all_company_sessions with ownership verification
CREATE OR REPLACE FUNCTION public.generate_all_company_sessions(
  p_company_id uuid, 
  p_weeks_ahead integer DEFAULT 8
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_schedule RECORD;
  v_total_created INTEGER := 0;
  v_created INTEGER;
  v_user_company_id UUID;
BEGIN
  v_user_company_id := get_user_company_id(auth.uid());
  
  IF v_user_company_id IS NULL OR v_user_company_id != p_company_id THEN
    RAISE EXCEPTION 'Access denied: you can only generate sessions for your own company';
  END IF;

  FOR v_schedule IN 
    SELECT id FROM class_schedules 
    WHERE company_id = p_company_id AND is_active = true
  LOOP
    SELECT generate_sessions_from_schedule(v_schedule.id, CURRENT_DATE, p_weeks_ahead) INTO v_created;
    v_total_created := v_total_created + v_created;
  END LOOP;
  
  RETURN v_total_created;
END;
$$;

-- Fix update_ai_agents_updated_at to include search_path
CREATE OR REPLACE FUNCTION public.update_ai_agents_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Add last_message_at column to tickets table if it doesn't exist
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();
-- Security & Performance Optimization Migration
-- Generated by Database Architect Agent

-- 1. Add missing indexes for Foreign Keys in AI Agent tables
-- These are critical for JOIN performance and cascading deletes

-- agent_conversations
CREATE INDEX IF NOT EXISTS idx_agent_conversations_company ON public.agent_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_customer ON public.agent_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_ticket ON public.agent_conversations(ticket_id);

-- agent_execution_logs
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_company ON public.agent_execution_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_execution_logs_conversation ON public.agent_execution_logs(conversation_id);

-- agent_messages
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON public.agent_messages(conversation_id);

-- ai_agent_conversations
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_agent ON public.ai_agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_company ON public.ai_agent_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_contact ON public.ai_agent_conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conversations_ticket ON public.ai_agent_conversations(ticket_id);

-- ai_agent_flows
CREATE INDEX IF NOT EXISTS idx_ai_agent_flows_agent ON public.ai_agent_flows(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_flows_next_stage ON public.ai_agent_flows(next_stage_id);

-- ai_agent_messages
CREATE INDEX IF NOT EXISTS idx_ai_agent_messages_conversation ON public.ai_agent_messages(conversation_id);

-- ai_agent_subagents
CREATE INDEX IF NOT EXISTS idx_ai_agent_subagents_agent ON public.ai_agent_subagents(agent_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_subagents_sub_agent ON public.ai_agent_subagents(sub_agent_id);

-- 2. Add Data Integrity Constraints

-- Ensure fees and ages are positive (Check Constraints)
ALTER TABLE public.ai_agent_knowledge_config 
  ADD CONSTRAINT check_enrollment_fee_positive CHECK (enrollment_fee_value >= 0),
  ADD CONSTRAINT check_children_min_age_positive CHECK (children_min_age >= 0);

-- 3. Optimization
-- Enable PG Stat Statements if not enabled (for query monitoring by tools)
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- Security Fix: Restrict Public Write Access to AI Agent Conversations
-- Generated by Penetration Tester Agent
-- Vulnerability: Publicly accessible INSERT/UPDATE policies allowing IDOR and Data Tampering

-- 1. Drop Insecure Policies (which allowed WITH CHECK (true))
DROP POLICY IF EXISTS "Service can insert conversations" ON public.ai_agent_conversations;
DROP POLICY IF EXISTS "Service can update conversations" ON public.ai_agent_conversations;
DROP POLICY IF EXISTS "Service can insert messages" ON public.ai_agent_messages;

-- 2. Create Secure Policies (Scoped to Company)
-- Users can only create/update conversations if they belong to the company
-- or are super_admin

CREATE POLICY "Users can create conversations for their company" ON public.ai_agent_conversations
  FOR INSERT WITH CHECK (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can update conversations for their company" ON public.ai_agent_conversations
  FOR UPDATE USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND profile = 'super_admin')
  );

CREATE POLICY "Users can create messages for their company conversations" ON public.ai_agent_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.ai_agent_conversations 
      WHERE company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND profile = 'super_admin')
  );

-- 3. Explicit Service Role Access
-- Service Role bypasses RLS by default, but adding explicit policies ensures clarity
-- and prevents implicit fallback to "deny all" if RLS behavior changes.

CREATE POLICY "Service role full access to ai_agent_conversations"
  ON public.ai_agent_conversations FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role full access to ai_agent_messages"
  ON public.ai_agent_messages FOR ALL
  TO service_role
  USING (true);
-- Function to update ticket details when a new message is inserted
CREATE OR REPLACE FUNCTION public.update_ticket_on_new_message()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing open/pending ticket
    -- We assume there is only one open/pending ticket per contact at a time
    UPDATE public.tickets
    SET
        last_message = NEW.body,
        updated_at = NOW(),
        -- Increment unread count if message is incoming (from_me = false)
        -- Reset to 0 if message is outgoing (from_me = true)
        unread_messages = CASE
            WHEN NEW.from_me = FALSE THEN unread_messages + 1
            ELSE 0
        END
    WHERE contact_id = NEW.contact_id
      AND status IN ('open', 'pending');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove existing trigger if it exists (to ensure clean slate or update)
DROP TRIGGER IF EXISTS update_ticket_on_message_trigger ON public.messages;

-- Create the trigger
CREATE TRIGGER update_ticket_on_message_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_ticket_on_new_message();
-- Migration: Drop AI Agents Tables
-- Description: Removes all tables and functions related to the AI Agents feature.

-- Drop Triggers (if any specific to these tables, cascading drops usually handle this)

-- Drop Tables (Order matters for Foreign Keys)
DROP TABLE IF EXISTS "agent_execution_logs";
DROP TABLE IF EXISTS "agent_memory";
DROP TABLE IF EXISTS "agent_messages";
DROP TABLE IF EXISTS "agent_conversations";
DROP TABLE IF EXISTS "agent_tools";
DROP TABLE IF EXISTS "ai_agent_knowledge_config";
DROP TABLE IF EXISTS "ai_agents";

-- Drop Functions (if any specific ones were created, e.g. for matching tools)
-- DROP FUNCTION IF EXISTS match_agent_tools; 

-- Note: We are NOT dropping 'knowledge_base' generic table if it is used by other features.
-- If 'knowledge_base' was created SOLELY for agents, we can drop it.
-- Based on 'ai_agent_knowledge_config' linking to it, it might be independent.
-- For safety, we keep knowledge_base for now or drop if empty.
-- Proceeding with dropping agent-specific tables only.
-- Migration: Init Premium AI Agents
-- Description: Sets up schema for Agents, Canvas Flows, Automations, and Vector Memory.

-- 1. Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. AI Agents Table (Core Config)
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000', -- Multi-tenant readiness
    name TEXT NOT NULL,
    role TEXT DEFAULT 'assistente', -- 'supervisor', 'specialist', etc.
    description TEXT,
    system_prompt TEXT, -- The core personality
    is_active BOOLEAN DEFAULT false,
    model TEXT DEFAULT 'gpt-4o', -- or 'gemini-1.5-pro'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AI Agent Flows (Canvas Structure)
-- Stores the React Flow nodes/edges JSON for the "Canvas Mode"
CREATE TABLE IF NOT EXISTS public.ai_agent_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    nodes JSONB DEFAULT '[]', -- React Flow Nodes
    edges JSONB DEFAULT '[]', -- React Flow Edges
    viewport JSONB DEFAULT '{}', -- Zoom/Pan state
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id)
);

-- 4. AI Tools (Available Tools Configuration)
CREATE TABLE IF NOT EXISTS public.ai_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'schedule', 'customer_lookup', 'tag_manager', 'automation_trigger'
    config JSONB DEFAULT '{}', -- Tool specific config
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AI Automations (Integrated Campaign/Workflow)
CREATE TABLE IF NOT EXISTS public.ai_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'tag_added', 'conversation_end', 'manual'
    steps JSONB DEFAULT '[]', -- Sequence of actions (send_message, wait, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AI Memories (Vector Store)
CREATE TABLE IF NOT EXISTS public.ai_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- The text chunk
    metadata JSONB DEFAULT '{}', -- Source info (filename, page)
    embedding vector(1536), -- OpenAI embedding size
    created_at TIMESTAMPTZ DEFAULT now()
);

-- High-performance index for vector search (HNSW)
-- NOTE: IVFFlat is faster to build, HNSW is faster to query. For small-medium datasets, IVFFlat is fine or even no index.
-- We'll use IVFFlat for compatibility/simplicity, users can switch to HNSW.
CREATE INDEX IF NOT EXISTS ai_memories_embedding_idx ON public.ai_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 7. AI Conversations & Messages (History)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    customer_phone TEXT, -- Link to customer via phone preferably
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'handoff'
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    tool_calls JSONB, -- For tool calling logging
    tstamp TIMESTAMPTZ DEFAULT now()
);

-- Policies (RLS) - Basic scaffolding (Allow all for service role, authenticate later)
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for auth users" ON public.ai_agents FOR ALL USING (true); -- TODO: Tighten for prod

-- Add indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON public.ai_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_phone ON public.ai_conversations(customer_phone);

-- Migration: Add match_memories RPC
-- Description: Adds a function to search for similar memories using pgvector.

CREATE OR REPLACE FUNCTION match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_agent_id uuid
)
returns table (
  id uuid,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    ai_memories.id,
    ai_memories.content,
    1 - (ai_memories.embedding <=> query_embedding) as similarity
  from ai_memories
  where 1 - (ai_memories.embedding <=> query_embedding) > match_threshold
  and ai_memories.agent_id = p_agent_id
  order by ai_memories.embedding <=> query_embedding
  limit match_count;
end;
$$;
