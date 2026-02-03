-- Add columns for webcam photo and metadata validation
ALTER TABLE public.par_q_responses 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS validation_metadata JSONB DEFAULT '{}';

-- Add comment to explain the validation_metadata structure
COMMENT ON COLUMN public.par_q_responses.validation_metadata IS 'Stores IP address, user agent, timestamp, and device info for legal validation';
COMMENT ON COLUMN public.par_q_responses.photo_url IS 'URL of the webcam photo taken at the moment of signature';