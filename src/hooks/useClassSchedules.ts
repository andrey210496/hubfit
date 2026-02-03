import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ClassType } from './useClassTypes';

export interface ClassSchedule {
  id: string;
  company_id: string;
  class_type_id: string;
  instructor_id: string | null;
  room_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  class_type?: ClassType;
  instructor?: {
    id: string;
    name: string;
  };
  room?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface CreateClassScheduleData {
  class_type_id: string;
  instructor_id?: string | null;
  room_id?: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_capacity?: number | null;
  is_active?: boolean;
}

export function useClassSchedules() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: schedules = [], isLoading, error } = useQuery({
    queryKey: ['class-schedules', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('class_schedules')
        .select(`
          *,
          class_type:class_types(*),
          instructor:profiles(id, name),
          room:class_rooms(id, name, color)
        `)
        .eq('company_id', profile.company_id)
        .order('day_of_week')
        .order('start_time');

      if (error) throw error;
      return data as ClassSchedule[];
    },
    enabled: !!profile?.company_id,
  });

  const createSchedule = useMutation({
    mutationFn: async (scheduleData: CreateClassScheduleData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('class_schedules')
        .insert({
          ...scheduleData,
          company_id: profile.company_id,
        })
        .select(`
          *,
          class_type:class_types(*),
          instructor:profiles(id, name),
          room:class_rooms(id, name, color)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Horário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar horário: ' + error.message);
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ id, ...scheduleData }: Partial<ClassSchedule> & { id: string }) => {
      const { data, error } = await supabase
        .from('class_schedules')
        .update(scheduleData)
        .eq('id', id)
        .select(`
          *,
          class_type:class_types(*),
          instructor:profiles(id, name),
          room:class_rooms(id, name, color)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Horário atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar horário: ' + error.message);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-schedules'] });
      toast.success('Horário excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir horário: ' + error.message);
    },
  });

  return {
    schedules,
    isLoading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}

export const dayOfWeekLabels = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export const dayOfWeekShortLabels = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sáb',
];
