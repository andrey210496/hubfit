import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export type Profile = Tables<'profiles'> & {
  user_roles?: { role: string }[];
  user_queues?: { queue_id: string }[];
};

export interface UserFormData {
  name: string;
  email: string;
  password?: string;
  profile?: string;
  all_ticket?: string;
  whatsapp_id?: string | null;
  queue_ids?: string[];
}

export function useUsers() {
  const { profile: currentProfile } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    if (!currentProfile?.company_id) return;
    
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', currentProfile.company_id)
        .order('name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch user_queues separately
      const userIds = profilesData?.map(p => p.user_id) || [];
      
      const userQueuesMap: Record<string, { queue_id: string }[]> = {};
      if (userIds.length > 0) {
        const { data: userQueuesData } = await supabase
          .from('user_queues')
          .select('user_id, queue_id')
          .in('user_id', userIds);
        
        if (userQueuesData) {
          userQueuesData.forEach(uq => {
            if (!userQueuesMap[uq.user_id]) {
              userQueuesMap[uq.user_id] = [];
            }
            userQueuesMap[uq.user_id].push({ queue_id: uq.queue_id });
          });
        }
      }

      // Combine data
      const usersWithQueues: Profile[] = (profilesData || []).map(profile => ({
        ...profile,
        user_queues: userQueuesMap[profile.user_id] || [],
      }));

      setUsers(usersWithQueues);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [currentProfile?.company_id]);

  const createUser = async (userData: UserFormData) => {
    if (!currentProfile?.company_id) {
      toast.error('Empresa não encontrada');
      return null;
    }

    try {
      // Create auth user via admin API would require edge function
      // For now, we'll just create the profile (user must sign up first)
      toast.error('Para criar usuários, utilize o convite por email ou cadastro direto.');
      return null;
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
      return null;
    }
  };

  const updateUser = async (userId: string, userData: Partial<UserFormData>) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          profile: userData.profile,
          all_ticket: userData.all_ticket,
          whatsapp_id: userData.whatsapp_id || null,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (profileError) throw profileError;

      // Update user queues if provided
      if (userData.queue_ids !== undefined) {
        // Delete existing queue associations
        await supabase
          .from('user_queues')
          .delete()
          .eq('user_id', userId);

        // Insert new queue associations
        if (userData.queue_ids.length > 0) {
          const { error: queueError } = await supabase
            .from('user_queues')
            .insert(
              userData.queue_ids.map(queueId => ({
                user_id: userId,
                queue_id: queueId,
              }))
            );

          if (queueError) throw queueError;
        }
      }

      await fetchUsers();
      toast.success('Usuário atualizado com sucesso');
      return profileData;
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
      return null;
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Delete profile (cascade will handle user_queues)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.user_id !== userId));
      toast.success('Usuário excluído com sucesso');
      return true;
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao excluir usuário');
      return false;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    createUser,
    updateUser,
    deleteUser,
    refetch: fetchUsers,
  };
}
