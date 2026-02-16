-- ============================================================
-- RESTORE WHITELABEL COMPATIBILITY
-- Fixes conflicts between FomeFeed and Whitelabel schemas
-- ============================================================
-- 1. Ensure `profiles` table has Whitelabel columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile TEXT DEFAULT 'user';
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS whatsapp_id UUID;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS online BOOLEAN DEFAULT false;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS token_version INTEGER DEFAULT 0;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS name TEXT;
-- 2. Relax FomeFeed Constraints (to allow Whitelabel users)
DO $$ BEGIN -- Try to drop NOT NULL from role if it exists
IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE public.profiles
ALTER COLUMN role DROP NOT NULL;
END IF;
END $$;
-- 3. Data Migration (CRITICAL)
-- FomeFeed uses `id` as auth_id. Whitelabel uses `user_id` as auth_id.
-- If user_id is missing, copy it from id to allow Whitelabel to find the user.
UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;
-- 4. Restore Foreign Key for Company
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_company_id_fkey'
) THEN
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
END IF;
END $$;
-- 5. Restore Whitelabel RLS Policies for Profiles
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
CREATE POLICY "Users can view profiles in their company" ON public.profiles FOR
SELECT USING (
        company_id IN (
            SELECT company_id
            FROM public.profiles
            WHERE user_id = auth.uid()
        )
        OR user_id = auth.uid()
        OR profile = 'super_admin'
    );
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (
    profile = 'admin'
    OR profile = 'super_admin'
);
-- 6. Ensure `user_roles` table exists (Whitelabel specific)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    -- Simplified from enum to text to avoid conflict
    UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR
SELECT USING (user_id = auth.uid());