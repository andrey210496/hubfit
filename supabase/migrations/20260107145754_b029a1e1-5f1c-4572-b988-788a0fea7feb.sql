
-- Remover política antiga de plans que não foi dropada corretamente
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
