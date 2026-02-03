import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type PlanPeriod = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface FitnessPlan {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  period: PlanPeriod;
  price: number;
  classes_per_week: number | null;
  benefits: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFitnessPlanData {
  name: string;
  description?: string;
  period: PlanPeriod;
  price: number;
  classes_per_week?: number | null;
  benefits?: string[];
  is_active?: boolean;
}

export function useFitnessPlans() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading, error } = useQuery({
    queryKey: ['fitness-plans', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('fitness_plans')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      return data as FitnessPlan[];
    },
    enabled: !!profile?.company_id,
  });

  const createPlan = useMutation({
    mutationFn: async (planData: CreateFitnessPlanData) => {
      // Resolve company_id from profile or via RPC if not yet loaded
      let companyId = profile?.company_id ?? null;

      if (!companyId) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error('Sessão expirada. Faça login novamente.');

        const { data: resolvedId, error: rpcError } = await supabase.rpc('get_user_company_id', {
          _user_id: userData.user.id,
        });
        if (rpcError) throw rpcError;
        companyId = resolvedId as string | null;
      }

      if (!companyId) throw new Error('Empresa não encontrada para este usuário.');

      const { data, error } = await supabase
        .from('fitness_plans')
        .insert({
          ...planData,
          company_id: companyId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness-plans'] });
      toast.success('Plano criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar plano: ' + error.message);
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...planData }: Partial<FitnessPlan> & { id: string }) => {
      const { data, error } = await supabase
        .from('fitness_plans')
        .update(planData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness-plans'] });
      toast.success('Plano atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar plano: ' + error.message);
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fitness_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fitness-plans'] });
      toast.success('Plano excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir plano: ' + error.message);
    },
  });

  return {
    plans,
    isLoading,
    error,
    createPlan,
    updatePlan,
    deletePlan,
  };
}

export function getPeriodLabel(period: PlanPeriod): string {
  const labels: Record<PlanPeriod, string> = {
    monthly: 'Mensal',
    quarterly: 'Trimestral',
    semiannual: 'Semestral',
    annual: 'Anual',
  };
  return labels[period];
}

export function getPeriodMonths(period: PlanPeriod): number {
  const months: Record<PlanPeriod, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };
  return months[period];
}
