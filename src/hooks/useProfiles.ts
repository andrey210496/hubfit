import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  profile: string | null;
  company_id: string | null;
}

export function useProfiles() {
  const { profile: currentProfile } = useAuth();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles', currentProfile?.company_id],
    queryFn: async () => {
      if (!currentProfile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, email, profile, company_id')
        .eq('company_id', currentProfile.company_id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Profile[];
    },
    enabled: !!currentProfile?.company_id,
  });

  return { profiles, isLoading };
}