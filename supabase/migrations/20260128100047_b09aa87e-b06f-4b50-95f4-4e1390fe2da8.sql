-- Add default_queue_id to whatsapps table
ALTER TABLE public.whatsapps
ADD COLUMN IF NOT EXISTS default_queue_id UUID REFERENCES public.queues(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_whatsapps_default_queue_id ON public.whatsapps(default_queue_id);

COMMENT ON COLUMN public.whatsapps.default_queue_id IS 'Default queue for new tickets from this WhatsApp connection';