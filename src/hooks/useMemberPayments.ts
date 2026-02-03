import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from './useMemberAuth';

export interface MemberPayment {
  id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  fitness_plan?: {
    id: string;
    name: string;
  } | null;
}

export function useMemberPayments() {
  const { memberProfile } = useMemberAuth();

  const { data: payments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['member-payments', memberProfile?.member_id],
    queryFn: async () => {
      if (!memberProfile?.member_id) return [];

      const { data, error } = await supabase
        .from('member_payments')
        .select(`
          id, amount, due_date, paid_at, status, payment_method, notes,
          fitness_plan:fitness_plans(id, name)
        `)
        .eq('member_id', memberProfile.member_id)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as MemberPayment[];
    },
    enabled: !!memberProfile?.member_id,
  });

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const paidPayments = payments.filter(p => p.status === 'paid');
  const overduePayments = payments.filter(p => p.status === 'overdue');

  return {
    payments,
    pendingPayments,
    paidPayments,
    overduePayments,
    isLoading,
    error,
    refetch,
  };
}
