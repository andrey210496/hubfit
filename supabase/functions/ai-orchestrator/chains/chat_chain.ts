
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.24.1";
import { searchMemory } from "../memory/vector_store.ts";

// Encryption/Decryption Logic (Copied from llm-config to avoid circular deps/complex imports)
const ENCRYPTION_KEY = Deno.env.get("LLM_ENCRYPTION_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 32);

async function decrypt(encryptedText: string): Promise<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Key derivation must match llm-config exactly
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(ENCRYPTION_KEY?.padEnd(32, "0").substring(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
    );

    // Decode base64
    const binary = atob(encryptedText);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        keyMaterial,
        encrypted
    );

    return decoder.decode(decrypted);
}

export async function runChatChain(
    supabase: SupabaseClient,
    messages: any[],
    agentId: string,
    systemPrompt: string,
    toolDefinitions: any[],
    model: string = "gpt-4o",
    companyId?: string
) {
    // 1. Try Environment Variable first
    let apiKey = Deno.env.get("OPENAI_API_KEY");

    // 2. Fallback to Database Fetch
    if (!apiKey && companyId) {
        console.log("No OPENAI_API_KEY env var, fetching from database for company:", companyId);

        // Infer provider from model (basic logic)
        // Default to openai if unsure, or checks others
        let provider = 'openai';
        if (model.startsWith('gemini')) provider = 'gemini';
        if (model.startsWith('claude')) provider = 'anthropic';

        const { data: config, error } = await supabase
            .from('llm_configurations')
            .select('api_key_encrypted, provider')
            .eq('company_id', companyId)
            .eq('provider', provider)
            .eq('is_active', true)
            .single();

        if (error) {
            console.error("Error fetching LLM config:", error);
        } else if (config?.api_key_encrypted) {
            try {
                apiKey = await decrypt(config.api_key_encrypted);
                console.log("Successfully retrieved and decrypted API key from DB");
            } catch (err) {
                console.error("Failed to decrypt API key:", err);
            }
        }
    }

    if (!apiKey) {
        throw new Error("API Key NOT configured. Please add OPENAI_API_KEY to Edge Functions Secrets OR configure 'Integrations/AI' in the application.");
    }

    // Initialize Client (Generic for now, assuming OpenAI interface for all via libs or just OpenAI)
    // Note: If using Gemini/Anthropic via OpenAI SDK, base URL might need creating.
    // For now, assuming OpenAI model or OpenAI-compatible.
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
