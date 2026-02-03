import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface FinancialCategory {
  id: string;
  company_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  parent_id: string | null;
  is_active: boolean | null;
  order_num: number | null;
  created_at: string | null;
  updated_at: string | null;
  parent?: FinancialCategory | null;
  children?: FinancialCategory[];
}

export interface CreateFinancialCategoryData {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export function useFinancialCategories() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['financial-categories', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('type', { ascending: true })
        .order('order_num', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      return data as FinancialCategory[];
    },
    enabled: !!companyId,
  });

  // Organize categories into tree structure
  const categoriesTree = categories.reduce((acc, category) => {
    if (!category.parent_id) {
      acc.push({
        ...category,
        children: categories.filter(c => c.parent_id === category.id),
      });
    }
    return acc;
  }, [] as FinancialCategory[]);

  const incomeCategories = categories.filter(c => c.type === 'income');
  const expenseCategories = categories.filter(c => c.type === 'expense');

  const createCategory = useMutation({
    mutationFn: async (data: CreateFinancialCategoryData) => {
      if (!companyId) throw new Error('Company ID not found');

      const { data: result, error } = await supabase
        .from('financial_categories')
        .insert({
          company_id: companyId,
          name: data.name,
          type: data.type,
          color: data.color || '#6B7280',
          icon: data.icon || 'folder',
          parent_id: data.parent_id || null,
          is_active: data.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast.success('Categoria criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast.error('Erro ao criar categoria');
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: Partial<FinancialCategory> & { id: string }) => {
      const { data: result, error } = await supabase
        .from('financial_categories')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast.success('Categoria atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating category:', error);
      toast.error('Erro ao atualizar categoria');
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-categories'] });
      toast.success('Categoria excluída com sucesso');
    },
    onError: (error) => {
      console.error('Error deleting category:', error);
      toast.error('Erro ao excluir categoria');
    },
  });

  return {
    categories,
    categoriesTree,
    incomeCategories,
    expenseCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
