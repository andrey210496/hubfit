
-- Migration: Add match_memories RPC
-- Description: Adds a function to search for similar memories using pgvector.

CREATE OR REPLACE FUNCTION match_memories (
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
as $$
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
$$;
