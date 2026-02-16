-- ============================================================
-- RESTORE WHITELABEL FULL SCHEMA (EMERGENCY)
-- Recreates missing tables and fixes FomeFeed conflicts
-- ============================================================
-- 1. Create Core Tables (if missing) first to satisfy dependencies
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    users INTEGER NOT NULL DEFAULT 1,
    connections INTEGER NOT NULL DEFAULT 1,
    queues INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    use_campaigns BOOLEAN DEFAULT true,
    use_schedules BOOLEAN DEFAULT true,
    use_internal_chat BOOLEAN DEFAULT true,
    use_external_api BOOLEAN DEFAULT true,
    use_kanban BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan_id UUID REFERENCES public.plans(id) ON DELETE
    SET NULL,
        status text NOT NULL DEFAULT 'active',
        -- changed enum to text for safety
        due_date TIMESTAMPTZ,
        recurrence TEXT,
        phone TEXT,
        email TEXT,
        document TEXT,
        language TEXT DEFAULT 'pt-BR',
        schedules JSONB,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
-- 2. Fix Profiles (The Conflict Zone)
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
-- Relax FomeFeed constraints
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'profiles'
        AND column_name = 'role'
) THEN
ALTER TABLE public.profiles
ALTER COLUMN role DROP NOT NULL;
END IF;
END $$;
-- Migrate Data (ID -> User_ID)
UPDATE public.profiles
SET user_id = id
WHERE user_id IS NULL;
-- Restore FK
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_company_id_fkey'
) THEN
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
END IF;
END $$;
-- 3. Create Supporting Tables (Including user_roles needed for function)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    UNIQUE(user_id, role)
);
CREATE TABLE IF NOT EXISTS public.queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#7C3AED',
    greeting_message TEXT,
    order_queue INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.user_queues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    queue_id UUID NOT NULL REFERENCES public.queues(id) ON DELETE CASCADE,
    UNIQUE(user_id, queue_id)
);
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, key)
);
CREATE TABLE IF NOT EXISTS public.whatsapps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    session TEXT,
    status TEXT DEFAULT 'DISCONNECTED',
    battery TEXT,
    plugged BOOLEAN,
    qrcode TEXT,
    retries INTEGER DEFAULT 0,
    greeting_message TEXT,
    farewell_message TEXT,
    feedback_message TEXT,
    out_of_hours_message TEXT,
    is_default BOOLEAN DEFAULT false,
    token TEXT,
    provider TEXT DEFAULT 'beta',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- 4. Helper Functions (Now safe to create as tables exist)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
            AND role = _role
    )
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = _user_id
            AND (
                profile = _role
                OR profile = 'super_admin'
            )
    );
$$;
-- 5. Enable RLS & Restore Policies (Simplified)
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapps ENABLE ROW LEVEL SECURITY;
-- Plans (Public)
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
CREATE POLICY "Plans are viewable by everyone" ON public.plans FOR
SELECT USING (true);
-- Companies (Member access)
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;
CREATE POLICY "Users can view their company" ON public.companies FOR
SELECT USING (
        id IN (
            SELECT company_id
            FROM public.profiles
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE user_id = auth.uid()
                AND profile = 'super_admin'
        )
    );
-- Profiles (Member access)
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
-- Settings (Member access)
DROP POLICY IF EXISTS "Company access" ON public.settings;
CREATE POLICY "Company access" ON public.settings FOR ALL USING (
    company_id IN (
        SELECT company_id
        FROM public.profiles
        WHERE user_id = auth.uid()
    )
);