import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from './useMemberAuth';

export interface Announcement {
  id: string;
  title: string;
  text: string;
  media_name: string | null;
  media_path: string | null;
  priority: number;
  created_at: string;
}

export function useMemberAnnouncements() {
  const { memberProfile } = useMemberAuth();

  const { data: announcements = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-announcements', memberProfile?.company_id],
    queryFn: async () => {
      if (!memberProfile?.company_id) return [];

      const { data, error } = await supabase
        .from('announcements')
        .select('id, title, text, media_name, media_path, priority, created_at')
        .eq('company_id', memberProfile.company_id)
        .eq('status', true)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!memberProfile?.company_id,
  });

  return {
    announcements,
    isLoading,
    error,
    refetch,
  };
}
