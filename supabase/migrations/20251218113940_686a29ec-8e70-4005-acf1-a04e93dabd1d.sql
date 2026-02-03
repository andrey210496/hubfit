-- Create contact_tags junction table
CREATE TABLE public.contact_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

-- Enable RLS
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for company access
CREATE POLICY "Company access" ON public.contact_tags
FOR ALL USING (
  contact_id IN (
    SELECT id FROM public.contacts
    WHERE company_id IN (
      SELECT company_id FROM public.profiles
      WHERE user_id = auth.uid()
    )
  )
);