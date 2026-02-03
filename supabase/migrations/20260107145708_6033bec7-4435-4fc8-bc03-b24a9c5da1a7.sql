
-- =============================================
-- QA FIX: Corrigir política UPDATE em chat_users (user_id é UUID)
-- =============================================

-- Remover política com erro de tipo
DROP POLICY IF EXISTS "Users can update their own chat membership" ON public.chat_users;

-- Criar política correta (user_id é UUID, não text)
CREATE POLICY "Users can update their own chat membership"
ON public.chat_users
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
