-- Add new fields to tags table for Kanban ordering and Meta Pixel integration
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS kanban_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
ADD COLUMN IF NOT EXISTS meta_access_token TEXT,
ADD COLUMN IF NOT EXISTS automation_config JSONB DEFAULT '{}';

-- Add index for kanban ordering
CREATE INDEX IF NOT EXISTS idx_tags_kanban_order ON public.tags (company_id, kanban, kanban_order);

-- Add comment for documentation
COMMENT ON COLUMN public.tags.kanban_order IS 'Order of the tag column in Kanban view';
COMMENT ON COLUMN public.tags.meta_pixel_id IS 'Meta/Facebook Pixel ID for conversion tracking';
COMMENT ON COLUMN public.tags.meta_access_token IS 'Meta Conversions API access token';
COMMENT ON COLUMN public.tags.automation_config IS 'JSON configuration for tag-based automations';