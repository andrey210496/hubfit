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