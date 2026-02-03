import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ClassType {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  max_capacity: number;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateClassTypeData {
  name: string;
  description?: string;
  duration_minutes?: number;
  max_capacity?: number;
  color?: string;
  is_active?: boolean;
}

export function useClassTypes() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: classTypes = [], isLoading, error } = useQuery({
    queryKey: ['class-types', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('class_types')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      return data as ClassType[];
    },
    enabled: !!profile?.company_id,
  });

  const createClassType = useMutation({
    mutationFn: async (classTypeData: CreateClassTypeData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('class_types')
        .insert({
          ...classTypeData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] });
      toast.success('Tipo de aula criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar tipo de aula: ' + error.message);
    },
  });

  const updateClassType = useMutation({
    mutationFn: async ({ id, ...classTypeData }: Partial<ClassType> & { id: string }) => {
      const { data, error } = await supabase
        .from('class_types')
        .update(classTypeData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] });
      toast.success('Tipo de aula atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar tipo de aula: ' + error.message);
    },
  });

  const deleteClassType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('class_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-types'] });
      toast.success('Tipo de aula excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir tipo de aula: ' + error.message);
    },
  });

  return {
    classTypes,
    isLoading,
    error,
    createClassType,
    updateClassType,
    deleteClassType,
  };
}
