import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ClassRoom {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  capacity: number | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClassRoomData {
  name: string;
  description?: string | null;
  capacity?: number | null;
  color?: string;
  is_active?: boolean;
}

export function useClassRooms() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: rooms = [], isLoading, error } = useQuery({
    queryKey: ['class-rooms', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('class_rooms')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      return data as ClassRoom[];
    },
    enabled: !!profile?.company_id,
  });

  const createRoom = useMutation({
    mutationFn: async (roomData: CreateClassRoomData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('class_rooms')
        .insert({
          ...roomData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      toast.success('Sala criada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar sala: ' + error.message);
    },
  });

  const updateRoom = useMutation({
    mutationFn: async ({ id, ...roomData }: Partial<ClassRoom> & { id: string }) => {
      const { data, error } = await supabase
        .from('class_rooms')
        .update(roomData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      toast.success('Sala atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar sala: ' + error.message);
    },
  });

  const deleteRoom = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_rooms')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-rooms'] });
      toast.success('Sala excluída com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir sala: ' + error.message);
    },
  });

  return {
    rooms,
    activeRooms: rooms.filter(r => r.is_active),
    isLoading,
    error,
    createRoom,
    updateRoom,
    deleteRoom,
  };
}
