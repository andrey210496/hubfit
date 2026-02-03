
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.24.1";
import { searchMemory } from "../memory/vector_store.ts";

export async function runChatChain(
    supabase: SupabaseClient,
    messages: any[],
    agentId: string,
    systemPrompt: string,
    toolDefinitions: any[],
    model: string = "gpt-4o"
) {
    // Get API key from environment variable
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured. Please add it in Supabase Dashboard > Project Settings > Edge Functions > Secrets");
    }

    const openai = new OpenAI({ apiKey });

    // RAG Context
    let context = "";
    const lastUserMessage = messages[messages.length - 1];

    // Only search memory if it's a user message (not tool output)
    if (lastUserMessage?.role === 'user') {
        try {
            console.log("Searching memory for:", lastUserMessage.content);
            context = await searchMemory(supabase, lastUserMessage.content, agentId);
        } catch (e) {
            console.error("Memory search failed:", e);
        }
    }

    const finalSystemPrompt = context
        ? `${systemPrompt}\n\nCONTEXT FROM KNOWLEDGE BASE:\n${context}`
        : systemPrompt;

    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: finalSystemPrompt },
                ...messages
            ],
            tools: toolDefinitions.length > 0 ? toolDefinitions : undefined,
            tool_choice: toolDefinitions.length > 0 ? "auto" : undefined
        });

        return completion.choices[0].message;
    } catch (error: any) {
        console.error("OpenAI API Error:", error);
        throw new Error(`OpenAI API Error: ${error.message}`);
    }
}
