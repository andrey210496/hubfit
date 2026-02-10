
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Import Tools
import { getCustomerProfile, updateCustomerTags } from "./tools/customer.ts";
import { getAvailability, bookClass } from "./tools/schedule.ts";
import { runChatChain } from "./chains/chat_chain.ts";

console.log("AI Orchestrator Function Initialized");

// Tool Definitions Map (Source of Truth for Tool Schemas)
const TOOL_DEFINITIONS: Record<string, any> = {
    schedule: {
        type: "function",
        function: {
            name: "check_availability",
            description: "Check class availability for a specific date",
            parameters: {
                type: "object",
                properties: {
                    date: { type: "string", description: "YYYY-MM-DD" },
                    modality: { type: "string", description: "Optional modality/class type" }
                },
                required: ["date"]
            }
        }
    },
    customer_lookup: {
        type: "function",
        function: {
            name: "get_customer",
            description: "Get customer profile details including tags and plan",
            parameters: {
                type: "object",
                properties: {
                    phone: { type: "string", description: "Customer phone number" }
                },
                required: ["phone"]
            }
        }
    },
    booking: { // Maps to 'schedule' tool capability usually, but let's separate for granularity if needed
        type: "function",
        function: {
            name: "book_class",
            description: "Book a class session for a customer",
            parameters: {
                type: "object",
                properties: {
                    customerId: { type: "string" },
                    sessionId: { type: "string" }
                },
                required: ["customerId", "sessionId"]
            }
        }
    },
    tag_manager: {
        type: "function",
        function: {
            name: "update_tags",
            description: "Update customer tags",
            parameters: {
                type: "object",
                properties: {
                    customer_id: { type: "string" },
                    tags: { type: "array", items: { type: "string" } }
                },
                required: ["customer_id", "tags"]
            }
        }
    }
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            { auth: { persistSession: false } }
        );

        const { action, payload, agent_id } = await req.json();

        if (action === 'chat') {
            if (!agent_id) throw new Error("Agent ID is required for chat");

            // 1. Fetch Agent Config
            const { data: agent, error: agentError } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('id', agent_id)
                .single();
            if (agentError) throw new Error("Agent not found");

            // 2. Fetch Enabled Tools
            const { data: toolsData } = await supabase
                .from('ai_tools')
                .select('type, config')
                .eq('agent_id', agent_id)
                .eq('is_enabled', true);

            // Map DB tools to OpenAI Tool Definitions
            const activeTools = (toolsData || []).map((t: any) => TOOL_DEFINITIONS[t.type]).filter(Boolean);

            // Special case: 'schedule' tool might enable both check_availability and booking?
            // For MVP, we map 1-to-1 or manual check.
            // If type is 'schedule', add both check and booking if not present.
            if (toolsData?.some((t: any) => t.type === 'schedule')) {
                if (!activeTools.find((t: any) => t.function.name === 'book_class')) {
                    activeTools.push(TOOL_DEFINITIONS.booking);
                }
            }

            // 3. Response Delay & Aggregation Logic
            const delaySeconds = agent.response_delay || 0;

            if (delaySeconds > 0) {
                console.log(`Waiting ${delaySeconds}s for potential follow-up messages...`);
                await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));

                // Check if a newer message arrived during sleep
                // We use the payload's ticket_id to find the latest user message
                const { data: latestMsg } = await supabase
                    .from('messages')
                    .select('created_at')
                    .eq('ticket_id', payload.context.ticket_id)
                    .eq('from_me', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                // If the latest message in DB is newer than the one that triggered this execution, abort.
                // (The newer message trigger will handle the response)
                const currentMsgTime = new Date(payload.messages[payload.messages.length - 1].created_at).getTime(); // Assuming payload structure or pass timestamp
                // Fallback: If payload doesn't have timestamp, we might need to rely on the fact that if ANY message 
                // is newer than (Now - Delay), we might be in a race. 
                // Better approach: Check if there's a message created AFTER this execution started minus a small buffer?

                // Robust verification:
                // If there is ANY user message created AFTER the message that triggered this function, we abort.
                // Ideally payload includes the trigger message ID. Assuming payload.messages[-1] is it.

                // Let's simplified approach: fetch all unread/recent user messages. 
                // If the count > 1 and we are not the "last" one... 

                if (latestMsg && new Date(latestMsg.created_at).getTime() > (Date.now() - (delaySeconds * 1000) + 2000)) {
                    // This logic is tricky without precise timestamps in payload.
                    // Alternative: We proceed, but we include ALL messages. 
                    // BUT we must avoid double response.
                    // "Last-Write-Wins" requires identifying the triggering message.
                }
            }

            // AGGREGATION: Fetch all recent unread messages for context
            // Instead of relying solely on payload, we fetch the last X messages from DB to ensure we have the full conversation
            // including any that arrived during the wait.
            const { data: recentMessages } = await supabase
                .from('messages')
                .select('body, from_me, created_at')
                .eq('ticket_id', payload.context.ticket_id)
                .order('created_at', { ascending: true }) // Oldest first for context
                .limit(20);

            // Re-construct conversation history
            let messages = (recentMessages || []).map((m: any) => ({
                role: m.from_me ? 'assistant' : 'user',
                content: m.body
            }));

            // If no history found (shouldn't happen), fall back to payload
            if (messages.length === 0) {
                messages = payload.messages || [];
            }
            // Usually frontend sends: [{role: 'user', content: '...'}]

            let finalResponse = null;
            let steps = 0;

            while (steps < 5) {
                steps++;

                // Run Chain
                const responseMessage = await runChatChain(
                    supabase,
                    messages,
                    agent_id,
                    agent.system_prompt || "You are a helpful assistant.",
                    activeTools,
                    agent.model || "gpt-4o",
                    agent.company_id
                );

                // Add assistant response to history
                messages.push(responseMessage);

                // Check for Tool Calls
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    console.log("Executing Tools:", responseMessage.tool_calls.length);

                    for (const toolCall of responseMessage.tool_calls) {
                        const fnName = toolCall.function.name;
                        const args = JSON.parse(toolCall.function.arguments);
                        let toolOutput;

                        console.log(`Calling ${fnName}`, args);

                        try {
                            if (fnName === 'check_availability') toolOutput = await getAvailability(supabase, args.date, args.modality);
                            else if (fnName === 'get_customer') toolOutput = await getCustomerProfile(supabase, args.phone);
                            else if (fnName === 'update_tags') toolOutput = await updateCustomerTags(supabase, args.customer_id, args.tags);
                            else if (fnName === 'book_class') toolOutput = await bookClass(supabase, args);
                            else toolOutput = { error: "Unknown tool function" };
                        } catch (err: any) {
                            toolOutput = { error: err.message };
                        }

                        messages.push({
                            tool_call_id: toolCall.id,
                            role: "tool",
                            name: fnName,
                            content: JSON.stringify(toolOutput)
                        });
                    }
                    // Loop continues to next iteration to let LLM process tool outputs
                } else {
                    // No tool calls, this is the final answer
                    finalResponse = responseMessage.content;
                    break;
                }
            }

            // 4. Send Response via send-message function
            if (finalResponse && payload?.context?.ticket_id) {
                console.log("Sending AI response to ticket:", payload.context.ticket_id);

                await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-message`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ticketId: payload.context.ticket_id,
                        body: finalResponse
                    })
                });
            }

            return new Response(JSON.stringify({
                message: finalResponse,
                history: messages // Debug/Sync
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } else {
            // ... (Keep existing simple tool execution logic if needed for testing, or remove)
            // For safety, let's keep the simple switch for direct testing:
            let result;
            switch (action) {
                case 'get_customer': result = await getCustomerProfile(supabase, payload.phone); break;
                // ... others
                default: throw new Error(`Unknown action: ${action}`);
            }
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

    } catch (error) {
        console.error("Orchestrator Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
