
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

    return data.map(m => `- ${m.name}: ${m.description || ''}`).join('\n');
}

export async function getSystemPlans(supabase: SupabaseClient, companyId: string): Promise<string> {
    const { data, error } = await supabase
        .from('plans')
        .select('name, price, periodicity, description')
        .eq('company_id', companyId)
        .eq('is_active', true);

    if (error || !data || data.length === 0) return "No plans found.";

    return data.map(p => {
        return `- ${p.name} (${p.periodicity}): R$ ${p.price}. ${p.description || ''}`;
    }).join('\n');
}

export async function getSystemSchedules(supabase: SupabaseClient, companyId: string): Promise<string> {
    // Basic schedule fetch - fetching active schedules
    // Enhacement: Fetch specific to day of week?
    // For now, dump all active class schedules
    const { data, error } = await supabase
        .from('class_schedules')
        .select('week_day, start_time, end_time, modality:modalities(name), coach:profiles(full_name)')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('week_day');

    if (error || !data || data.length === 0) return "No schedules found.";

    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return data.map(s => {
        const day = days[s.week_day] || s.week_day;
        const mod = s.modality?.name || 'Aula';
        const coach = s.coach?.full_name || 'Instrutor';
        return `- ${day} | ${s.start_time} - ${s.end_time}: ${mod} (${coach})`;
    }).join('\n');
}
