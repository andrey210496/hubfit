-- ============================================================
-- NUCLEAR RESTORE: WHITELABEL EXECUTER ONLY
-- WARN: THIS WILL DELETE ALL DATA IN PUBLIC SCHEMA
-- ============================================================
-- 1. Wipe Everything
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- 2. Restore Permissions
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO service_role;
-- 3. Restore Extensions (Safely)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Try to create pgvector, but don't fail if missing
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION
WHEN OTHERS THEN RAISE NOTICE 'pgvector extension not available - AI features will be disabled';
END $$;
-- PG Stat Statements (Performance)
DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
EXCEPTION
WHEN OTHERS THEN NULL;
END $$;
-- 4. Content from backup_schema.sql (Modified to be safe)
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
-- Ensure profiles table exists if it was dropped by schema wipe
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    profile TEXT DEFAULT 'user',
    whatsapp_id UUID,
    token_version INTEGER DEFAULT 0,
    online BOOLEAN DEFAULT false,
    all_ticket TEXT DEFAULT 'disabled',
    reset_password TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
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
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    number TEXT NOT NULL,
    email TEXT,
    profile_pic_url TEXT,
    is_group BOOLEAN DEFAULT false,
    whatsapp_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(number, company_id)
);
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES public.queues(id) ON DELETE
    SET NULL,
        user_id UUID REFERENCES auth.users(id) ON DELETE
    SET NULL,
        whatsapp_id UUID,
        status TEXT NOT NULL DEFAULT 'open',
        last_message TEXT,
        is_group BOOLEAN DEFAULT false,
        unread_messages INTEGER DEFAULT 0,
        chatbot BOOLEAN DEFAULT false,
        from_me BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE
    SET NULL,
        company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        from_me BOOLEAN DEFAULT false,
        is_read BOOLEAN DEFAULT false,
        media_url TEXT,
        media_type TEXT,
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
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
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
-- Super admin bypass for queues (The Critical Fix)
DROP POLICY IF EXISTS "Users can view user_queues in their company" ON public.user_queues;
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
        OR EXISTS (
            SELECT 1
            FROM public.profiles
            WHERE user_id = auth.uid()
                AND profile = 'super_admin'
        )
    );
DROP POLICY IF EXISTS "Users can manage user_queues in their company" ON public.user_queues;
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
    OR EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE user_id = auth.uid()
            AND profile = 'super_admin'
    )
);
-- 6. AI Features (Conditional)
DO $$ BEGIN -- Only create if vector extension exists
IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'vector'
) THEN -- Create AI Tables
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    name TEXT NOT NULL,
    role TEXT DEFAULT 'assistente',
    description TEXT,
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT false,
    model TEXT DEFAULT 'gpt-4o',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.ai_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT now()
);
-- Create Index
CREATE INDEX IF NOT EXISTS ai_memories_embedding_idx ON public.ai_memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- Create Match Function
EXECUTE 'CREATE OR REPLACE FUNCTION match_memories (
          query_embedding vector(1536),
          match_threshold float,
          match_count int,
          p_agent_id uuid
        )
        returns table (
          id uuid,
          content text,
          similarity float
        )
        language plpgsql
        as $func$
        begin
          return query
          select
            ai_memories.id,
            ai_memories.content,
            1 - (ai_memories.embedding <=> query_embedding) as similarity
          from ai_memories
          where 1 - (ai_memories.embedding <=> query_embedding) > match_threshold
          and ai_memories.agent_id = p_agent_id
          order by ai_memories.embedding <=> query_embedding
          limit match_count;
        end;
        $func$';
END IF;
END $$;