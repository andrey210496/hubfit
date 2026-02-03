-- ETAPA 1: Sistema de Gestão Fitness para Boxes de CrossFit

-- Enum para status do membro
CREATE TYPE public.member_status AS ENUM ('active', 'inactive', 'suspended', 'cancelled');

-- Enum para período do plano
CREATE TYPE public.plan_period AS ENUM ('monthly', 'quarterly', 'semiannual', 'annual');

-- Enum para status da reserva
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled', 'attended', 'no_show');

-- Enum para status do check-in
CREATE TYPE public.checkin_status AS ENUM ('checked_in', 'checked_out');

-- =====================================================
-- 1. TABELA: fitness_plans (Planos de Adesão)
-- =====================================================
CREATE TABLE public.fitness_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  period plan_period NOT NULL DEFAULT 'monthly',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  classes_per_week INTEGER, -- NULL = ilimitado
  benefits TEXT[], -- Array de benefícios
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
  UNIQUE(company_id, contact_id) -- Um contato só pode ser membro uma vez por empresa
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
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Dom, 6=Sáb
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER, -- Sobrescreve capacidade do tipo se definido
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 5. TABELA: class_sessions (Sessões específicas de aula)
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
  UNIQUE(class_session_id, member_id) -- Um membro só pode reservar uma vez por sessão
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
-- 8. TABELA: member_payments (Pagamentos - preparado para integração)
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

-- class_schedules: empresa acessa suas grades de horário
CREATE POLICY "Company access class_schedules" ON public.class_schedules
  FOR ALL USING (company_id = get_user_company_id(auth.uid()));

-- class_sessions: empresa acessa suas sessões
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
-- FUNÇÃO: Gerar token QR Code para membro
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
-- FUNÇÃO: Atualizar contador de reservas na sessão
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