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