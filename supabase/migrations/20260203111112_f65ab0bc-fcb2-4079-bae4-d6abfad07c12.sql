-- Add last_message_at column to tickets table if it doesn't exist
ALTER TABLE public.tickets 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now();