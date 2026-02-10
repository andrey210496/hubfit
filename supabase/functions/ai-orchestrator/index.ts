
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Import Tools
import { getCustomerProfile, updateCustomerTags } from "./tools/customer.ts";
import { getAvailability, bookClass } from "./tools/schedule.ts";
import { runChatChain } from "./chains/chat_chain.ts";
import { getSystemModalities, getSystemPlans, getSystemSchedules } from "./tools/system_retrieval.ts";

console.log("AI Orchestrator Function Initialized");

// Tool Definitions Map
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
    booking: {
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

            console.log("[PERF] Start:", Date.now());

            // 1. Fetch Agent Config + Tools in PARALLEL
            const [agentResult, toolsResult] = await Promise.all([
                supabase.from('ai_agents').select('*').eq('id', agent_id).single(),
                supabase.from('ai_tools').select('type, config').eq('agent_id', agent_id).eq('is_enabled', true)
            ]);

            if (agentResult.error) throw new Error("Agent not found");
            const agent = agentResult.data;

            console.log("[DEBUG] Agent company_id:", agent.company_id);
            console.log("[DEBUG] memory_config:", JSON.stringify(agent.memory_config));

            const activeTools = (toolsResult.data || []).map((t: any) => TOOL_DEFINITIONS[t.type]).filter(Boolean);

            // 2. RAG: System Data Injection (SEQUENTIAL to save CPU)
            const ragConfig = agent.memory_config?.rag_sources || {};
            console.log("[DEBUG] RAG Config:", JSON.stringify(ragConfig));

            let systemContext = "";

            if (ragConfig.modalities) {
                try {
                    const mods = await getSystemModalities(supabase, agent.company_id);
                    systemContext += `\n\n[MODALIDADES DISPONÍVEIS]:\n${mods}`;
                } catch (e) {
                    console.error("Error fetching modalities:", e);
                }
            }

            if (ragConfig.plans) {
                try {
                    const plans = await getSystemPlans(supabase, agent.company_id);
                    systemContext += `\n\n[PLANOS E PREÇOS]:\n${plans}`;
                } catch (e) {
                    console.error("Error fetching plans:", e);
                }
            }

            if (ragConfig.schedules) {
                try {
                    const scheds = await getSystemSchedules(supabase, agent.company_id);
                    systemContext += `\n\n[QUADRO DE HORÁRIOS]:\n${scheds}`;
                } catch (e) {
                    console.error("Error fetching schedules:", e);
                }
            }

            // Append to System Prompt
            if (systemContext) {
                console.log("--- RAG DATA ---");
                console.log(systemContext);
                console.log("----------------");
                agent.system_prompt += `\n\nIMPORTANT SYSTEM DATA (Use this to answer user questions accurately):\n${systemContext}`;
            }

            console.log("[PERF] After RAG:", Date.now());

            // 3. Fetch recent messages (NO DELAY - removed response_delay to prevent CPU timeout)
            const { data: recentMessages } = await supabase
                .from('messages')
                .select('body, from_me, created_at')
                .eq('ticket_id', payload.context.ticket_id)
                .order('created_at', { ascending: false })
                .limit(20);

            let messages = (recentMessages || []).reverse().map((m: any) => ({
                role: m.from_me ? 'assistant' : 'user',
                content: m.body
            }));

            if (messages.length === 0) {
                messages = payload.messages || [];
            }

            console.log("[PERF] Before LLM:", Date.now(), "msgs:", messages.length);

            // 4. LLM Loop (max 3 iterations to save CPU)
            let finalResponse = null;
            let steps = 0;

            while (steps < 3) {
                steps++;

                const responseMessage = await runChatChain(
                    supabase,
                    messages,
                    agent_id,
                    agent.system_prompt || "You are a helpful assistant.",
                    activeTools,
                    agent.model || "gpt-4o",
                    agent.company_id
                );

                messages.push(responseMessage);

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    console.log("Executing Tools:", responseMessage.tool_calls.length);

                    for (const toolCall of responseMessage.tool_calls) {
                        const fnName = toolCall.function.name;
                        const args = JSON.parse(toolCall.function.arguments);
                        let toolOutput;

                        console.log(`Tool: ${fnName}`, args);

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
                } else {
                    finalResponse = responseMessage.content;
                    break;
                }
            }

            console.log("[PERF] After LLM:", Date.now());

            // 5. Send Response via send-message function
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
                history: messages
            }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });

        } else {
            let result;
            switch (action) {
                case 'get_customer': result = await getCustomerProfile(supabase, payload.phone); break;
                default: throw new Error(`Unknown action: ${action}`);
            }
            return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

    } catch (error) {
        console.error("Orchestrator Error:", error);
        return new Response(
            JSON.stringify({ error: (error as Error).message }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
});
