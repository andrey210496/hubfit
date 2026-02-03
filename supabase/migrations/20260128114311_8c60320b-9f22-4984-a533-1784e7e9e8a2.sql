-- Rebuild knowledge_base RLS policies to use roles table (has_role) + company helper

-- SELECT: company users can read their company knowledge base
DROP POLICY IF EXISTS "Users can view knowledge base entries from their company" ON public.knowledge_base;
CREATE POLICY "Users can view knowledge base entries from their company"
ON public.knowledge_base
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid())
);

-- INSERT: admins/super can insert into their company
DROP POLICY IF EXISTS "Admins can insert knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can insert knowledge base entries"
ON public.knowledge_base
FOR INSERT
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);

-- UPDATE: admins/super can update within their company
DROP POLICY IF EXISTS "Admins can update knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can update knowledge base entries"
ON public.knowledge_base
FOR UPDATE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
)
WITH CHECK (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);

-- DELETE: admins/super can delete within their company
DROP POLICY IF EXISTS "Admins can delete knowledge base entries" ON public.knowledge_base;
CREATE POLICY "Admins can delete knowledge base entries"
ON public.knowledge_base
FOR DELETE
USING (
  company_id = get_user_company_id(auth.uid())
  AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super'))
);
