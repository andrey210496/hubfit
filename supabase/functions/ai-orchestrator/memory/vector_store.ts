
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
// import OpenAI from "https://esm.sh/openai@4.24.1"; // Removed for performance

export async function searchMemory(supabase: SupabaseClient, query: string, agentId: string, apiKey: string) {
    if (!apiKey) return [];

    try {
        const response = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "text-embedding-3-small",
                input: query
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenAI Embedding Error:", errorText);
            return [];
        }

        const data = await response.json();
        const embedding = data.data[0].embedding;

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
    } catch (e) {
        console.error("Error in searchMemory:", e);
        return [];
    }
}
