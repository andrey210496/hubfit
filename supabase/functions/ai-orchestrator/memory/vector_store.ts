
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import OpenAI from "https://esm.sh/openai@4.24.1";

export async function searchMemory(supabase: SupabaseClient, query: string, agentId: string) {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return [];

    const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
    });

    const embedding = embeddingResponse.data[0].embedding;

    const { data: documents, error } = await supabase.rpc('match_memories', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
        p_agent_id: agentId
    });

    if (error) {
        console.error("Vector search error:", error);
        return [];
    }

    return documents.map((d: any) => d.content).join("\n\n");
}
