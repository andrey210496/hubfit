import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from './useMemberAuth';

export interface AccessLogEntry {
  id: string;
  checkin_at: string;
  checkout_at: string | null;
  checkin_method: string;
  status: string;
  notes: string | null;
}

export function useMemberHistory() {
  const { memberProfile } = useMemberAuth();

  const { data: accessHistory = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-access-history', memberProfile?.member_id],
    queryFn: async () => {
      if (!memberProfile?.member_id) return [];

      const { data, error } = await supabase
        .from('access_logs')
        .select('id, checkin_at, checkout_at, checkin_method, status, notes')
        .eq('member_id', memberProfile.member_id)
        .order('checkin_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as AccessLogEntry[];
    },
    enabled: !!memberProfile?.member_id,
  });

  const totalCheckins = accessHistory.length;
  const thisMonthCheckins = accessHistory.filter(log => {
    const checkinDate = new Date(log.checkin_at);
    const now = new Date();
    return checkinDate.getMonth() === now.getMonth() && 
           checkinDate.getFullYear() === now.getFullYear();
  }).length;

  return {
    accessHistory,
    totalCheckins,
    thisMonthCheckins,
    isLoading,
    error,
    refetch,
  };
}
