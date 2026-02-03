
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getCustomerProfile(supabase: SupabaseClient, phone: string) {
    if (!phone) throw new Error("Phone number is required");

    const { data, error } = await supabase
        .from('clients')
        .select(`
            id, 
            name, 
            phone, 
            email, 
            tags, 
            status,
            active_plan:mp_customer_subscriptions(
                plan:mp_plans(name, price),
                status
            )
        `)
        .eq('phone', phone)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw new Error(`Error fetching customer: ${error.message}`);
    }

    if (!data) return { found: false };

    return {
        found: true,
        customer: {
            id: data.id,
            name: data.name,
            tags: data.tags || [],
            plan: data.active_plan?.[0]?.plan?.name || "Sem Plano Ativo",
            status: data.status
        }
    };
}

export async function updateCustomerTags(supabase: SupabaseClient, customerId: string, tags: string[]) {
    if (!customerId) throw new Error("Customer ID is required");

    // Fetch current tags to merge or overwrite? Usually overwrite in this context or append?
    // Let's assume input 'tags' is the NEW list or we operationally append.
    // Ideally, the agent decides. We'll simply set the tags provided.

    // Check if tags is array string or jsonb. Assuming text[] or jsonb array.
    const { data, error } = await supabase
        .from('clients')
        .update({ tags: tags })
        .eq('id', customerId)
        .select()
        .single();

    if (error) throw new Error(`Error updating tags: ${error.message}`);

    return { success: true, tags: data.tags };
}
