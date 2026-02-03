-- =============================================
-- ASAAS PAYMENT GATEWAY INTEGRATION
-- =============================================

-- Table for platform-level Asaas configuration (Super Admin)
CREATE TABLE public.asaas_platform_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  api_key_sandbox TEXT,
  api_key_production TEXT,
  platform_wallet_id TEXT, -- Wallet ID da plataforma para receber comissões
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
  api_key TEXT, -- API Key própria do cliente (opcional, se tiver subconta)
  is_subaccount BOOLEAN DEFAULT false, -- Se é subconta criada pela plataforma
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
  net_value NUMERIC(10, 2), -- Valor líquido após taxas
  platform_fee NUMERIC(10, 2) DEFAULT 0, -- Comissão da plataforma
  
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
  pix_copy_paste TEXT, -- Código PIX copia e cola
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
  external_reference TEXT, -- Referência externa para vincular ao sistema
  
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