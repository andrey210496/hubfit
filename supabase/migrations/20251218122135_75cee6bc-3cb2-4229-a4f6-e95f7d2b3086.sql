-- Add column to store original message body before edit/delete
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS original_body TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.messages.original_body IS 'Stores the original message body before edit or deletion';