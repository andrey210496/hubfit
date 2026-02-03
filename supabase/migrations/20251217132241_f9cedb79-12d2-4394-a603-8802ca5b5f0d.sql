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

-- Tabela de Configurações de Campanha
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

-- Tabela de Usuários do Chat
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

-- Tabela de Opções de Arquivo
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

-- Políticas de acesso
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

-- Helps são públicos para leitura
CREATE POLICY "Helps are public" ON public.helps FOR SELECT USING (true);

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Índices
CREATE INDEX idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_chats_company_id ON public.chats(company_id);
CREATE INDEX idx_chat_messages_chat_id ON public.chat_messages(chat_id);