
-- =============================================
-- QA FIX: Adicionar políticas faltantes para Portal do Aluno
-- =============================================

-- 1. Membros podem ver seus contratos
CREATE POLICY "Members can view their own contracts"
ON public.client_contracts
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT mu.member_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 2. Membros podem ver suas vendas/compras
CREATE POLICY "Members can view their own sales"
ON public.client_sales
FOR SELECT
TO authenticated
USING (
  member_id IN (
    SELECT mu.member_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 3. Usuários autenticados podem ver planos (para exibir na plataforma)
CREATE POLICY "Authenticated users can view plans"
ON public.plans
FOR SELECT
TO authenticated
USING (true);

-- 4. Membros podem ver planos fitness de sua empresa
CREATE POLICY "Members can view company fitness plans"
ON public.fitness_plans
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 5. Membros podem ver horários de aulas de sua empresa
CREATE POLICY "Members can view company class schedules"
ON public.class_schedules
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);

-- 6. Membros podem ver métodos de pagamento ativos
CREATE POLICY "Members can view active payment methods"
ON public.payment_methods
FOR SELECT
TO authenticated
USING (
  is_active = true 
  AND company_id IN (
    SELECT mu.company_id 
    FROM public.member_users mu 
    WHERE mu.user_id = auth.uid()
  )
);
