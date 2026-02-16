-- Fix RLS for user_queues to allow company members to manage assignments
DROP POLICY IF EXISTS "Users can view their queue assignments" ON public.user_queues;
DROP POLICY IF EXISTS "Admins can manage user queues" ON public.user_queues;
-- Allow users to view assignments for queues belonging to their company
CREATE POLICY "Users can view user_queues in their company" ON public.user_queues FOR
SELECT USING (
        queue_id IN (
            SELECT id
            FROM public.queues
            WHERE company_id IN (
                    SELECT company_id
                    FROM public.profiles
                    WHERE user_id = auth.uid()
                )
        )
    );
-- Allow users to insert/update/delete assignments for queues belonging to their company
CREATE POLICY "Users can manage user_queues in their company" ON public.user_queues FOR ALL USING (
    queue_id IN (
        SELECT id
        FROM public.queues
        WHERE company_id IN (
                SELECT company_id
                FROM public.profiles
                WHERE user_id = auth.uid()
            )
    )
);