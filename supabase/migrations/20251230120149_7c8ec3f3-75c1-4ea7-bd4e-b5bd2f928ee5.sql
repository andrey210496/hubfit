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