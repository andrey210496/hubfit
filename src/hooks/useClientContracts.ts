import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addMonths } from 'date-fns';
import { getPeriodMonths, type PlanPeriod } from './useFitnessPlans';

export type ContractStatus = 'active' | 'paused' | 'cancelled' | 'expired';

export interface ClientContract {
  id: string;
  company_id: string;
  member_id: string;
  fitness_plan_id: string | null;
  status: ContractStatus;
  start_date: string;
  end_date: string | null;
  price: number;
  payment_day: number | null;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  fitness_plan?: {
    id: string;
    name: string;
    period: PlanPeriod;
    price: number;
  } | null;
}

export interface CreateContractData {
  member_id: string;
  fitness_plan_id: string;
  start_date?: string;
  end_date?: string;
  price: number;
  payment_day?: number;
  notes?: string;
}

export function useClientContracts(memberId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: contracts = [], isLoading, error } = useQuery({
    queryKey: ['client-contracts', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      
      const { data, error } = await supabase
        .from('client_contracts')
        .select(`
          *,
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ClientContract[];
    },
    enabled: !!memberId,
  });

  const createContract = useMutation({
    mutationFn: async (contractData: CreateContractData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      // Calculate end date based on plan period
      let endDate = contractData.end_date;
      if (contractData.fitness_plan_id && !endDate) {
        const { data: plan } = await supabase
          .from('fitness_plans')
          .select('period')
          .eq('id', contractData.fitness_plan_id)
          .single();
        
        if (plan) {
          const startDate = contractData.start_date 
            ? new Date(contractData.start_date) 
            : new Date();
          const months = getPeriodMonths(plan.period as PlanPeriod);
          endDate = addMonths(startDate, months).toISOString().split('T')[0];
        }
      }

      const { data, error } = await supabase
        .from('client_contracts')
        .insert({
          ...contractData,
          company_id: profile.company_id,
          end_date: endDate,
        })
        .select(`
          *,
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .single();

      if (error) throw error;

      // Update member with new plan and expiration
      await supabase
        .from('members')
        .update({
          fitness_plan_id: contractData.fitness_plan_id,
          expiration_date: endDate,
          status: 'active',
        })
        .eq('id', contractData.member_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar contrato: ' + error.message);
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, ...contractData }: Partial<ClientContract> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_contracts')
        .update(contractData)
        .eq('id', id)
        .select(`
          *,
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
      toast.success('Contrato atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar contrato: ' + error.message);
    },
  });

  const cancelContract = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('client_contracts')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-contracts'] });
      toast.success('Contrato cancelado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar contrato: ' + error.message);
    },
  });

  const activeContract = contracts.find(c => c.status === 'active');

  return {
    contracts,
    activeContract,
    isLoading,
    error,
    createContract,
    updateContract,
    cancelContract,
  };
}

export function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    active: 'Ativo',
    paused: 'Pausado',
    cancelled: 'Cancelado',
    expired: 'Expirado',
  };
  return labels[status];
}

export function getContractStatusColor(status: ContractStatus): string {
  const colors: Record<ContractStatus, string> = {
    active: 'bg-green-500/20 text-green-400',
    paused: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
    expired: 'bg-gray-500/20 text-gray-400',
  };
  return colors[status];
}
