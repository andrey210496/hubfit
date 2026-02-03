-- Create structured knowledge base configuration table for AI agents
CREATE TABLE public.ai_agent_knowledge_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  
  -- Planos e Valores
  plans_from_system BOOLEAN DEFAULT true,
  plans_manual TEXT,
  
  -- Horários (sempre automático do sistema)
  schedules_auto BOOLEAN DEFAULT true,
  
  -- Endereço e Contato
  address TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  
  -- Agregadores e Convênios
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
  
  -- Políticas e Regras
  offers_trial_class BOOLEAN DEFAULT false,
  trial_class_details TEXT,
  accepts_children BOOLEAN DEFAULT false,
  children_min_age INTEGER,
  has_enrollment_fee BOOLEAN DEFAULT false,
  enrollment_fee_value DECIMAL(10,2),
  has_family_discount BOOLEAN DEFAULT false,
  family_discount_details TEXT,
  
  -- Informações Adicionais
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