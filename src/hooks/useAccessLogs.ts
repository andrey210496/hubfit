import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Member } from './useMembers';

export type CheckinStatus = 'checked_in' | 'checked_out';

export interface AccessLog {
  id: string;
  company_id: string;
  member_id: string;
  checkin_at: string;
  checkout_at: string | null;
  checkin_method: string;
  status: CheckinStatus;
  notes: string | null;
  created_at: string;
  // Joined data
  member?: {
    id: string;
    contact: {
      id: string;
      name: string;
      number: string;
      profile_pic_url: string | null;
    };
    fitness_plan: {
      id: string;
      name: string;
    } | null;
    status: string;
    expiration_date: string | null;
  };
}

export interface CreateAccessLogData {
  member_id: string;
  checkin_method?: string;
  notes?: string;
}

export function useAccessLogs(date?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: accessLogs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['access-logs', profile?.company_id, date],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      let query = supabase
        .from('access_logs')
        .select(`
          *,
          member:members(
            id,
            status,
            expiration_date,
            contact:contacts(id, name, number, profile_pic_url),
            fitness_plan:fitness_plans(id, name)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('checkin_at', { ascending: false });

      // Filter by date if provided
      if (date) {
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;
        query = query.gte('checkin_at', startOfDay).lte('checkin_at', endOfDay);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return data as AccessLog[];
    },
    enabled: !!profile?.company_id,
  });

  const checkIn = useMutation({
    mutationFn: async (logData: CreateAccessLogData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      // Check if member is already checked in
      const { data: existingCheckin } = await supabase
        .from('access_logs')
        .select('id')
        .eq('member_id', logData.member_id)
        .eq('status', 'checked_in')
        .maybeSingle();

      if (existingCheckin) {
        throw new Error('Membro já está com check-in ativo');
      }

      const { data, error } = await supabase
        .from('access_logs')
        .insert({
          ...logData,
          company_id: profile.company_id,
          checkin_method: logData.checkin_method || 'manual',
        })
        .select(`
          *,
          member:members(
            id,
            status,
            expiration_date,
            contact:contacts(id, name, number, profile_pic_url),
            fitness_plan:fitness_plans(id, name)
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const checkOut = useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase
        .from('access_logs')
        .update({
          checkout_at: new Date().toISOString(),
          status: 'checked_out' as CheckinStatus,
        })
        .eq('id', logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-logs'] });
      toast.success('Check-out realizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao fazer check-out: ' + error.message);
    },
  });

  // Get members currently checked in
  const checkedInMembers = accessLogs.filter(log => log.status === 'checked_in');

  return {
    accessLogs,
    checkedInMembers,
    isLoading,
    error,
    refetch,
    checkIn,
    checkOut,
  };
}
