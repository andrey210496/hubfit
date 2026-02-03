-- Migration: Init Premium AI Agents
-- Description: Sets up schema for Agents, Canvas Flows, Automations, and Vector Memory.

-- 1. Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. AI Agents Table (Core Config)
CREATE TABLE IF NOT EXISTS public.ai_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000', -- Multi-tenant readiness
    name TEXT NOT NULL,
    role TEXT DEFAULT 'assistente', -- 'supervisor', 'specialist', etc.
    description TEXT,
    system_prompt TEXT, -- The core personality
    is_active BOOLEAN DEFAULT false,
    model TEXT DEFAULT 'gpt-4o', -- or 'gemini-1.5-pro'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AI Agent Flows (Canvas Structure)
-- Stores the React Flow nodes/edges JSON for the "Canvas Mode"
CREATE TABLE IF NOT EXISTS public.ai_agent_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    nodes JSONB DEFAULT '[]', -- React Flow Nodes
    edges JSONB DEFAULT '[]', -- React Flow Edges
    viewport JSONB DEFAULT '{}', -- Zoom/Pan state
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(agent_id)
);

-- 4. AI Tools (Available Tools Configuration)
CREATE TABLE IF NOT EXISTS public.ai_tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'schedule', 'customer_lookup', 'tag_manager', 'automation_trigger'
    config JSONB DEFAULT '{}', -- Tool specific config
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. AI Automations (Integrated Campaign/Workflow)
CREATE TABLE IF NOT EXISTS public.ai_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'tag_added', 'conversation_end', 'manual'
    steps JSONB DEFAULT '[]', -- Sequence of actions (send_message, wait, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. AI Memories (Vector Store)
CREATE TABLE IF NOT EXISTS public.ai_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE CASCADE,
    content TEXT NOT NULL, -- The text chunk
    metadata JSONB DEFAULT '{}', -- Source info (filename, page)
    embedding vector(1536), -- OpenAI embedding size
    created_at TIMESTAMPTZ DEFAULT now()
);

-- High-performance index for vector search (HNSW)
-- NOTE: IVFFlat is faster to build, HNSW is faster to query. For small-medium datasets, IVFFlat is fine or even no index.
-- We'll use IVFFlat for compatibility/simplicity, users can switch to HNSW.
CREATE INDEX IF NOT EXISTS ai_memories_embedding_idx ON public.ai_memories USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- 7. AI Conversations & Messages (History)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID REFERENCES public.ai_agents(id) ON DELETE SET NULL,
    customer_phone TEXT, -- Link to customer via phone preferably
    status TEXT DEFAULT 'active', -- 'active', 'closed', 'handoff'
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system', 'tool'
    content TEXT,
    tool_calls JSONB, -- For tool calling logging
    tstamp TIMESTAMPTZ DEFAULT now()
);

-- Policies (RLS) - Basic scaffolding (Allow all for service role, authenticate later)
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for auth users" ON public.ai_agents FOR ALL USING (true); -- TODO: Tighten for prod

-- Add indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_ai_agents_company ON public.ai_agents(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_phone ON public.ai_conversations(customer_phone);
