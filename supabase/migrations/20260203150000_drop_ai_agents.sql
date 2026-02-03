-- Migration: Drop AI Agents Tables
-- Description: Removes all tables and functions related to the AI Agents feature.

-- Drop Triggers (if any specific to these tables, cascading drops usually handle this)

-- Drop Tables (Order matters for Foreign Keys)
DROP TABLE IF EXISTS "agent_execution_logs";
DROP TABLE IF EXISTS "agent_memory";
DROP TABLE IF EXISTS "agent_messages";
DROP TABLE IF EXISTS "agent_conversations";
DROP TABLE IF EXISTS "agent_tools";
DROP TABLE IF EXISTS "ai_agent_knowledge_config";
DROP TABLE IF EXISTS "ai_agents";

-- Drop Functions (if any specific ones were created, e.g. for matching tools)
-- DROP FUNCTION IF EXISTS match_agent_tools; 

-- Note: We are NOT dropping 'knowledge_base' generic table if it is used by other features.
-- If 'knowledge_base' was created SOLELY for agents, we can drop it.
-- Based on 'ai_agent_knowledge_config' linking to it, it might be independent.
-- For safety, we keep knowledge_base for now or drop if empty.
-- Proceeding with dropping agent-specific tables only.
