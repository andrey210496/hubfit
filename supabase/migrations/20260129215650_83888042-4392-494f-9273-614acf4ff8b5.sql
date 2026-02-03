
-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can manage rooms from their company" ON public.class_rooms;
DROP POLICY IF EXISTS "Users can view rooms from their company" ON public.class_rooms;

-- Create correct policies using the helper function
CREATE POLICY "Users can view rooms from their company"
ON public.class_rooms FOR SELECT
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert rooms in their company"
ON public.class_rooms FOR INSERT
TO authenticated
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can update rooms from their company"
ON public.class_rooms FOR UPDATE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete rooms from their company"
ON public.class_rooms FOR DELETE
TO authenticated
USING (company_id = get_user_company_id(auth.uid()));
