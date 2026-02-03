-- Corrigir função sem search_path
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

-- Tabela de associação Usuário-Fila
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

-- Políticas para Filas
CREATE POLICY "Users can view queues in their company" ON public.queues
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Admins can manage queues" ON public.queues
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para User Queues
CREATE POLICY "Users can view their queue assignments" ON public.user_queues
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage user queues" ON public.user_queues
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Políticas para Contatos
CREATE POLICY "Users can view contacts in their company" ON public.contacts
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage contacts in their company" ON public.contacts
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Políticas para Campos Customizados
CREATE POLICY "Users can manage contact custom fields" ON public.contact_custom_fields
  FOR ALL USING (
    contact_id IN (
      SELECT id FROM public.contacts WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Políticas para Tickets
CREATE POLICY "Users can view tickets in their company" ON public.tickets
  FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage tickets in their company" ON public.tickets
  FOR ALL USING (
    company_id IN (SELECT company_id FROM public.profiles WHERE user_id = auth.uid())
  );

-- Políticas para Mensagens
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

-- Índices para performance
CREATE INDEX idx_tickets_company_id ON public.tickets(company_id);
CREATE INDEX idx_tickets_contact_id ON public.tickets(contact_id);
CREATE INDEX idx_tickets_user_id ON public.tickets(user_id);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_messages_ticket_id ON public.messages(ticket_id);
CREATE INDEX idx_contacts_company_id ON public.contacts(company_id);
CREATE INDEX idx_contacts_number ON public.contacts(number);