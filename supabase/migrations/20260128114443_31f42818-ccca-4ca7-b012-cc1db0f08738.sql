-- Fix: created_by should reference profiles.user_id, not profiles.id
ALTER TABLE public.knowledge_base DROP CONSTRAINT IF EXISTS knowledge_base_created_by_fkey;

ALTER TABLE public.knowledge_base 
ADD CONSTRAINT knowledge_base_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;