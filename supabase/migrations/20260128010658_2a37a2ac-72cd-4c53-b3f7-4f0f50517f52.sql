-- Create PAR-Q responses table
CREATE TABLE public.par_q_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  completed_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- 10 questions (boolean: true = YES, false = NO)
  question_1 BOOLEAN NOT NULL DEFAULT false,
  question_2 BOOLEAN NOT NULL DEFAULT false,
  question_3 BOOLEAN NOT NULL DEFAULT false,
  question_4 BOOLEAN NOT NULL DEFAULT false,
  question_5 BOOLEAN NOT NULL DEFAULT false,
  question_6 BOOLEAN NOT NULL DEFAULT false,
  question_7 BOOLEAN NOT NULL DEFAULT false,
  question_8 BOOLEAN NOT NULL DEFAULT false,
  question_9 BOOLEAN NOT NULL DEFAULT false,
  question_10 BOOLEAN NOT NULL DEFAULT false,
  
  -- Additional details for question 10
  question_10_details TEXT,
  
  -- Computed field: true if any answer is YES
  has_medical_restriction BOOLEAN NOT NULL DEFAULT false,
  
  -- Digital signature
  signature TEXT NOT NULL,
  
  -- Audit fields
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_par_q_responses_member_id ON public.par_q_responses(member_id);
CREATE INDEX idx_par_q_responses_company_id ON public.par_q_responses(company_id);
CREATE INDEX idx_par_q_responses_completed_date ON public.par_q_responses(completed_date DESC);

-- Enable RLS
ALTER TABLE public.par_q_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view PAR-Q responses from their company"
ON public.par_q_responses
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create PAR-Q responses for their company"
ON public.par_q_responses
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update PAR-Q responses from their company"
ON public.par_q_responses
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete PAR-Q responses from their company"
ON public.par_q_responses
FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_par_q_responses_updated_at
BEFORE UPDATE ON public.par_q_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();