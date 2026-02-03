-- Add campaign identifier field to tags for UTM matching
ALTER TABLE public.tags 
ADD COLUMN IF NOT EXISTS campaign_identifier TEXT;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tags_campaign_identifier 
ON public.tags (company_id, campaign_identifier) 
WHERE campaign_identifier IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.tags.campaign_identifier IS 'Text pattern to match in first message for auto-tagging (e.g., [CAMPANHA_VERAO])';