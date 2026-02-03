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