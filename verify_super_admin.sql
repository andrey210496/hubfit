-- ============================================================
-- VERIFY AND FORCE SUPER ADMIN
-- Run this to check status and force the role
-- ============================================================
-- 1. Check current status (Select to see output)
SELECT au.email,
    p.profile as profile_role,
    ur.role as user_roles_role
FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email ILIKE '%andrey%';
-- 2. Force Insert/Update into User Roles (The table the frontend checks)
INSERT INTO public.user_roles (user_id, role)
SELECT id,
    'super'
FROM auth.users
WHERE email = 'andreymarcondes70@gmail.com' -- Precise email
    ON CONFLICT (user_id, role) DO NOTHING;
-- If it exists as 'user', update it
UPDATE public.user_roles
SET role = 'super'
WHERE user_id IN (
        SELECT id
        FROM auth.users
        WHERE email = 'andreymarcondes70@gmail.com'
    );
-- 3. Also fix profile just in case
UPDATE public.profiles
SET profile = 'super_admin'
WHERE email = 'andreymarcondes70@gmail.com';
-- 4. Check again to confirm
SELECT au.email,
    p.profile as profile_role,
    ur.role as user_roles_role
FROM auth.users au
    LEFT JOIN public.profiles p ON p.user_id = au.id
    LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE au.email = 'andreymarcondes70@gmail.com';