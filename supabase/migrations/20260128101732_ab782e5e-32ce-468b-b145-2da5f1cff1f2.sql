-- Create junction table for whatsapp-queue many-to-many relationship
CREATE TABLE public.whatsapp_queues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  whatsapp_id UUID NOT NULL REFERENCES public.whatsapps(id) ON DELETE CASCADE,
  queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(whatsapp_id, queue_id)
);

-- Enable RLS
ALTER TABLE public.whatsapp_queues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view whatsapp_queues from their company" 
ON public.whatsapp_queues 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapps w 
    JOIN public.profiles p ON p.company_id = w.company_id 
    WHERE w.id = whatsapp_queues.whatsapp_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage whatsapp_queues from their company" 
ON public.whatsapp_queues 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapps w 
    JOIN public.profiles p ON p.company_id = w.company_id 
    WHERE w.id = whatsapp_queues.whatsapp_id AND p.user_id = auth.uid()
  )
);

-- Add index for performance
CREATE INDEX idx_whatsapp_queues_whatsapp_id ON public.whatsapp_queues(whatsapp_id);
CREATE INDEX idx_whatsapp_queues_queue_id ON public.whatsapp_queues(queue_id);