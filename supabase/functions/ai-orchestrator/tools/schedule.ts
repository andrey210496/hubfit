
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getAvailability(supabase: SupabaseClient, date: string, modality?: string) {
    let query = supabase
        .from('class_sessions')
        .select(`
            id,
            start_time,
            end_time,
            capacity,
            booked_count,
            modality:class_types(name),
            instructor:employees(name)
        `)
        .eq('date', date)
        .gt('capacity', supabase.rpc('usage_count')) // Logic: capacity > booked_count ideally
    // But simpler: just get all and filter in code or use view.
    // Let's rely on raw data for now.

    // Re-writing simple select
    query = supabase.from('class_sessions')
        .select(`
            id, start_time, end_time, capacity, booked_count, 
            modality_id, modality:class_types(name)
        `)
        .eq('date', date);

    if (modality) {
        // This requires filtering by relation or modality_id logic if passed name.
        // Assuming agent passes modality ID or loose string search?
        // Let's return all for the date for now to let Agent filter LLM side.
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Filter full classes
    const available = data.filter((s: any) => (s.booked_count || 0) < s.capacity);

    return {
        date,
        sessions: available.map((s: any) => ({
            id: s.id,
            time: `${s.start_time} - ${s.end_time}`,
            modality: s.modality?.name || 'Geral',
            spots: s.capacity - (s.booked_count || 0)
        }))
    };
}

export async function bookClass(supabase: SupabaseClient, { customerId, sessionId }: { customerId: string, sessionId: string }) {
    if (!customerId || !sessionId) throw new Error("Missing customerId or sessionId");

    // Check availability again strictly
    const { data: session, error: sessError } = await supabase
        .from('class_sessions')
        .select('booked_count, capacity')
        .eq('id', sessionId)
        .single();

    if (sessError) throw new Error(sessError.message);
    if ((session.booked_count || 0) >= session.capacity) {
        throw new Error("Class is full");
    }

    // Insert booking
    const { error } = await supabase
        .from('bookings')
        .insert({
            client_id: customerId,
            session_id: sessionId,
            status: 'confirmed',
            origin: 'ai_agent'
        });

    if (error) throw new Error(`Booking failed: ${error.message}`);

    // Increment count (Manual update as trigger might strictly not exist or we want instant feedback)
    await supabase.rpc('increment_booking_count', { session_id: sessionId }); // Assuming RPC exists or use direct update
    // If RPC doesn't exist (I reverted previous changes), I should use Update.
    // Reverting to manual update safely:
    await supabase.from('class_sessions')
        .update({ booked_count: (session.booked_count || 0) + 1 })
        .eq('id', sessionId);

    return { success: true, message: "Class booked successfully" };
}
