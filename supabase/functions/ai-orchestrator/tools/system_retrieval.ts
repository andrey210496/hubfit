
import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Fetch System Data for Context Injection
 */

export async function getSystemModalities(supabase: SupabaseClient, companyId: string): Promise<string> {
    const { data, error } = await supabase
        .from('modalities')
        .select('name, description')
        .eq('company_id', companyId)
        .eq('is_active', true);

    if (error || !data || data.length === 0) return "No modalities found.";

    return data.map((m: any) => `- ${m.name}: ${m.description || ''}`).join('\n');
}

export async function getSystemPlans(supabase: SupabaseClient, companyId: string): Promise<string> {
    const { data, error } = await supabase
        .from('plans')
        .select('name, price, periodicity, description')
        .eq('company_id', companyId)
        .eq('is_active', true);

    if (error || !data || data.length === 0) return "No plans found.";

    return data.map((p: any) => {
        return `- ${p.name} (${p.periodicity}): R$ ${p.price}. ${p.description || ''}`;
    }).join('\n');
}

export async function getSystemSchedules(supabase: SupabaseClient, companyId: string): Promise<string> {
    console.log("[getSystemSchedules] companyId:", companyId);

    // STEP 1: Simple query WITHOUT joins (joins were causing silent failures)
    const { data, error } = await supabase
        .from('class_schedules')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('week_day')
        .order('start_time');

    console.log("[getSystemSchedules] error:", JSON.stringify(error));
    console.log("[getSystemSchedules] data count:", data?.length);

    if (error || !data || data.length === 0) {
        console.log("[getSystemSchedules] FALLBACK: querying without filters");
        const { data: raw, error: rawErr } = await supabase
            .from('class_schedules')
            .select('id')
            .limit(1);
        console.log("[getSystemSchedules] raw exists:", raw?.length > 0, "raw error:", rawErr ? "yes" : "no");
        return "No schedules found.";
    }

    // console.log("[getSystemSchedules] first row keys:", Object.keys(data[0]));
    // console.log("[getSystemSchedules] sample:", JSON.stringify(data[0]));

    // STEP 2: Try to get modality names separately (if modality_id exists)
    let modalityMap: Record<string, string> = {};
    const firstRow = data[0];
    const modalityKey = firstRow.modality_id || firstRow.modality || null;

    if (modalityKey !== null) {
        const modalityIds = [...new Set(data.map((s: any) => s.modality_id || s.modality).filter(Boolean))];
        if (modalityIds.length > 0) {
            const { data: mods } = await supabase
                .from('modalities')
                .select('id, name')
                .in('id', modalityIds);
            if (mods) {
                mods.forEach((m: any) => { modalityMap[m.id] = m.name; });
            }
        }
    }

    const dayMap: Record<number, string> = {
        0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
        7: 'Domingo'
    };

    // Group by Day
    const checkinsByDay: Record<string, string[]> = {};

    data.forEach((s: any) => {
        const dayName = dayMap[s.week_day] || `Dia ${s.week_day}`;
        if (!checkinsByDay[dayName]) checkinsByDay[dayName] = [];

        const modName = modalityMap[s.modality_id] || modalityMap[s.modality] || s.name || 'Aula';
        const startTime = typeof s.start_time === 'string' ? s.start_time.slice(0, 5) : s.start_time;
        const endTime = typeof s.end_time === 'string' ? s.end_time.slice(0, 5) : s.end_time;

        checkinsByDay[dayName].push(`${startTime}-${endTime}: ${modName}`);
    });

    return Object.entries(checkinsByDay).map(([day, classes]) => {
        return `[${day.toUpperCase()}]\n${classes.map(c => `- ${c}`).join('\n')}`;
    }).join('\n\n');
}
