-- ============================================================
-- FIX ORPHANED USERS & SET SUPER ADMIN
-- Run this AFTER recreate_whitelabel_schema.sql
-- ============================================================
-- 1. Restore Profiles for ALL existing users in Auth
INSERT INTO public.profiles (user_id, name, email, profile)
SELECT id,
    COALESCE(raw_user_meta_data->>'name', email),
    email,
    'user'
FROM auth.users ON CONFLICT (user_id) DO NOTHING;
-- 2. Restore User Roles for ALL existing users
INSERT INTO public.user_roles (user_id, role)
SELECT id,
    'user'
FROM auth.users ON CONFLICT (user_id, role) DO NOTHING;
-- 3. PROMOTE SPECIFIC USER TO SUPER ADMIN
-- Grant in Profiles
UPDATE public.profiles
SET profile = 'super_admin'
WHERE email = 'andreymarcondes70@gmail.com';
-- Adjusted email based on request (removing spaces if typo, or keeping precise)
-- Let's try both variations just in case the user typed it with spaces in the prompt but it is without in DB
UPDATE public.profiles
SET profile = 'super_admin'
WHERE email = 'andrey marcondes70@gmail.com';
-- Grant in User Roles
UPDATE public.user_roles
SET role = 'super'
WHERE user_id IN (
        SELECT id
        FROM auth.users
        WHERE email IN (
                'andreymarcondes70@gmail.com',
                'andrey marcondes70@gmail.com'
            )
    );
-- 4. Create a Default Company for the Super Admin if none exists
DO $$
DECLARE v_user_id UUID;
v_company_id UUID;
v_plan_id UUID;
BEGIN -- Get User ID
SELECT id INTO v_user_id
FROM auth.users
WHERE email IN (
        'andreymarcondes70@gmail.com',
        'andrey marcondes70@gmail.com'
    )
LIMIT 1;
IF v_user_id IS NOT NULL THEN -- Get or Create Plan
SELECT id INTO v_plan_id
FROM public.plans
LIMIT 1;
IF v_plan_id IS NULL THEN
INSERT INTO public.plans (name, connections, queues, users)
VALUES ('Super Plan', 10, 10, 10)
RETURNING id INTO v_plan_id;
END IF;
-- Create Company if user has none
IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = v_user_id
        AND company_id IS NOT NULL
) THEN
INSERT INTO public.companies (name, email, plan_id)
VALUES (
        'Admin Company',
        'andreymarcondes70@gmail.com',
        v_plan_id
    )
RETURNING id INTO v_company_id;
-- Link User to Company
UPDATE public.profiles
SET company_id = v_company_id
WHERE user_id = v_user_id;
END IF;
END IF;
END $$;