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

-- Tabela de associação Ticket-Tag
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

-- Tabela de Avaliações
CREATE TABLE public.user_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rate INTEGER NOT NULL CHECK (rate >= 1 AND rate <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabela de Mensagens Rápidas
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

-- Tabela de Configurações
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Tabela de Anúncios
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

-- Tabela de Integrações de Fila
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

-- Tabela de Opções de Fila (menu do chatbot)
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

-- Políticas baseadas em company_id
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

-- Índices
CREATE INDEX idx_tags_company_id ON public.tags(company_id);
CREATE INDEX idx_quick_messages_company_id ON public.quick_messages(company_id);
CREATE INDEX idx_schedules_company_id ON public.schedules(company_id);
CREATE INDEX idx_schedules_send_at ON public.schedules(send_at);
CREATE INDEX idx_prompts_company_id ON public.prompts(company_id);