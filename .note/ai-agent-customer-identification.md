# AI Agent Customer Identification System

## Overview
The system implements automatic customer identification that runs BEFORE the main AI agent processes each message. This pre-processing step enriches the agent's context with comprehensive customer data.

## Flow
1. Message received via WhatsApp
2. Customer Identifier runs (supabase/functions/ai-agent-process/customer-identifier.ts)
3. System queries: contacts → members → member_payments → fitness_plans
4. Structured context (JSON + human-readable summary) is generated
5. Context is injected into the agent's system prompt
6. Agent executes with full customer knowledge

## Customer Types

### 1. Member (Aluno Ativo)
- Has active membership in `members` table with status = 'active'
- Context includes: plan info, enrollment/expiration dates, payment status, pending amounts, instructor, medical notes, guardian info

### 2. Lead (with existing contact)
- Exists in `contacts` but no member record
- Context includes: engagement metrics, first/last interaction dates, objective, notes

### 3. Ex-Member (Ex-Aluno)
- Has member record with status != 'active' (inactive, cancelled, etc.)
- Context includes: previous plan info, enrollment/exit dates

### 4. New Lead (no record)
- Phone number not found in system
- Only phone (and name if provided) available
- Agent should collect: name, email, interest, availability and create contact record

## Context Injection
The context is added to the system prompt in two formats:
1. **Human-readable summary**: Formatted text with sections for easy reading
2. **JSON structure**: Parseable data for programmatic access

Example section injected:
```
# CONTEXTO DO CLIENTE (PRÉ-PROCESSADO)
=== CLIENTE IDENTIFICADO: ALUNO ATIVO ===
Nome: João Silva
...

## Dados Estruturados (JSON)
{
  "type": "member",
  "member_id": "uuid",
  ...
}
```

## Files
- `supabase/functions/ai-agent-process/customer-identifier.ts` - Core identification logic
- `supabase/functions/ai-agent-process/index.ts` - Imports and executes identifier
- `src/components/ai-agents/documentation/AgentDocumentation.tsx` - Documentation tab

## Benefits
- No extra LLM calls needed to fetch customer data
- Personalization from first message
- Differentiated handling based on customer type
- Automatic alerts (pending payments, expiring plans)
