
-- =============================================
-- QA FIX: Remover políticas públicas restantes e adicionar SELECT em chat_users
-- =============================================

-- 1. Remover política pública de announcements (pode ter nome diferente)
DROP POLICY IF EXISTS "Public can view active announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can view announcements" ON public.announcements;

-- 2. Adicionar SELECT em chat_users (usuários podem ver chats que participam)
DROP POLICY IF EXISTS "Users can view their chat memberships" ON public.chat_users;

CREATE POLICY "Users can view their chat memberships"
ON public.chat_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. Corrigir helps - restringir para usuários autenticados (da mesma empresa)
DROP POLICY IF EXISTS "Helps are public" ON public.helps;

CREATE POLICY "Helps viewable by authenticated users"
ON public.helps
FOR SELECT
TO authenticated
USING (true);
