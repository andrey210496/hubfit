import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type Schedule = Tables<'schedules'> & {
  contact?: { id: string; name: string; number: string } | null;
};

export interface ScheduleFormData {
  body: string;
  contact_id: string | null;
  send_at: string;
}

export function useSchedules() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = async (searchParam?: string) => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('schedules')
        .select('*, contact:contacts(id, name, number)')
        .eq('company_id', profile.company_id)
        .order('send_at', { ascending: true });

      if (searchParam) {
        query = query.ilike('body', `%${searchParam}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar agendamentos:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const createSchedule = async (data: ScheduleFormData) => {
    if (!profile?.company_id || !profile?.user_id) {
      toast.error('Usuário não autenticado');
      return null;
    }

    try {
      const { data: schedule, error } = await supabase
        .from('schedules')
        .insert({
          body: data.body,
          contact_id: data.contact_id,
          send_at: data.send_at,
          company_id: profile.company_id,
          user_id: profile.user_id,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Agendamento criado com sucesso');
      await fetchSchedules();
      return schedule;
    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      toast.error('Erro ao criar agendamento');
      throw error;
    }
  };

  const updateSchedule = async (scheduleId: string, data: ScheduleFormData) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({
          body: data.body,
          contact_id: data.contact_id,
          send_at: data.send_at,
        })
        .eq('id', scheduleId);

      if (error) throw error;
      toast.success('Agendamento atualizado com sucesso');
      await fetchSchedules();
    } catch (error: any) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento');
      throw error;
    }
  };

  const deleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;
      toast.success('Agendamento excluído com sucesso');
      await fetchSchedules();
    } catch (error: any) {
      console.error('Erro ao excluir agendamento:', error);
      toast.error('Erro ao excluir agendamento');
      throw error;
    }
  };

  useEffect(() => {
    fetchSchedules();

    if (!profile?.company_id) return;

    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'schedules',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          fetchSchedules();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
