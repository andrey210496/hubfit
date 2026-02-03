-- Fix chat_messages RLS policies to enforce sender identity verification
-- This prevents message spoofing where users could insert messages claiming to be from other users

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Users can access chat messages" ON public.chat_messages;

-- Create separate policies for each operation

-- SELECT: Users can read messages in chats they belong to
CREATE POLICY "Users can read chat messages" 
ON public.chat_messages FOR SELECT
USING (chat_id IN (SELECT chat_id FROM chat_users WHERE user_id = auth.uid()));

-- INSERT: Users can only send messages as themselves in chats they belong to
CREATE POLICY "Users can send chat messages" 
ON public.chat_messages FOR INSERT
WITH CHECK (
  chat_id IN (SELECT chat_id FROM chat_users WHERE user_id = auth.uid())
  AND sender_id = auth.uid()
);

-- UPDATE: Users can only update their own messages
CREATE POLICY "Users can update own messages" 
ON public.chat_messages FOR UPDATE
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

-- DELETE: Users can only delete their own messages
CREATE POLICY "Users can delete own messages" 
ON public.chat_messages FOR DELETE
USING (sender_id = auth.uid());