// supabase/functions/ai-agent-process/index.ts
// Bridge between webhooks (UazAPI/Meta) and ai-orchestrator.
// Receives: { ticketId, message, companyId }
// Finds the correct AI agent via queue → agent mapping, then calls ai-orchestrator.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { ticketId, message, companyId } = await req.json();

        if (!ticketId || !message) {
            return new Response(JSON.stringify({ error: 'Missing ticketId or message' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('[ai-agent-process] ticketId:', ticketId, 'msg:', message.substring(0, 80));

        // Get ticket with queue info
        const { data: ticket } = await supabase
            .from('tickets')
            .select('id, queue_id, contact_id, whatsapp_id, chatbot, status')
            .eq('id', ticketId)
            .single();

        if (!ticket) {
            console.log('[ai-agent-process] Ticket not found:', ticketId);
            return new Response(JSON.stringify({ error: 'Ticket not found' }), {
                status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // If ticket is assigned to a human (chatbot disabled), skip AI
        if (ticket.chatbot === false) {
            console.log('[ai-agent-process] Chatbot disabled for ticket:', ticketId);
            return new Response(JSON.stringify({ skipped: true, reason: 'chatbot_disabled' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Find AI agent: queue → ai_agent_id
        let agentId: string | null = null;

        if (ticket.queue_id) {
            const { data: queue } = await supabase
                .from('queues')
                .select('ai_agent_id')
                .eq('id', ticket.queue_id)
                .single();

            agentId = queue?.ai_agent_id || null;
        }

        // Fallback: find default agent for company
        if (!agentId && companyId) {
            const { data: defaultAgent } = await supabase
                .from('ai_agents')
                .select('id')
                .eq('company_id', companyId)
                .eq('is_active', true)
                .order('created_at', { ascending: true })
                .limit(1)
                .single();

            agentId = defaultAgent?.id || null;
        }

        if (!agentId) {
            console.log('[ai-agent-process] No AI agent found for company:', companyId);
            return new Response(JSON.stringify({ skipped: true, reason: 'no_agent' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('[ai-agent-process] Routing to agent:', agentId);

        // Call ai-orchestrator
        const orchestratorResponse = await fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'chat',
                agent_id: agentId,
                payload: {
                    message,
                    context: {
                        ticket_id: ticketId,
                        contact_id: ticket.contact_id,
                    }
                }
            })
        });

        const result = await orchestratorResponse.json().catch(() => ({}));

        if (!orchestratorResponse.ok) {
            console.error('[ai-agent-process] Orchestrator error:', result);
            return new Response(JSON.stringify({ error: 'AI processing failed', details: result }), {
                status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('[ai-agent-process] AI response delivered for ticket:', ticketId);

        return new Response(JSON.stringify({ success: true, agentId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[ai-agent-process] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
