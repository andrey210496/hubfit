import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { addMonths, addDays } from 'date-fns';
import { getPeriodMonths, type PlanPeriod } from './useFitnessPlans';

export type MemberStatus = 'active' | 'inactive' | 'suspended' | 'cancelled';

export interface Member {
  id: string;
  company_id: string;
  contact_id: string;
  fitness_plan_id: string | null;
  status: MemberStatus;
  enrollment_date: string;
  expiration_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  birth_date: string | null;
  qr_code_token: string | null;
  has_guardian: boolean | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  instructor_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  contact?: {
    id: string;
    name: string;
    number: string;
    email: string | null;
    profile_pic_url: string | null;
  };
  fitness_plan?: {
    id: string;
    name: string;
    period: PlanPeriod;
    price: number;
  };
}

export interface CreateMemberData {
  contact_id: string;
  fitness_plan_id?: string | null;
  enrollment_date?: string;
  expiration_date?: string | null;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_notes?: string;
  birth_date?: string | null;
}

export function useMembers() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading, error } = useQuery({
    queryKey: ['members', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          contact:contacts(id, name, number, email, profile_pic_url),
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Member[];
    },
    enabled: !!profile?.company_id,
  });

  const createMember = useMutation({
    mutationFn: async (memberData: CreateMemberData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      // Calculate expiration date based on plan
      let expirationDate = memberData.expiration_date;
      if (memberData.fitness_plan_id && !expirationDate) {
        const { data: plan } = await supabase
          .from('fitness_plans')
          .select('period')
          .eq('id', memberData.fitness_plan_id)
          .single();
        
        if (plan) {
          const enrollmentDate = memberData.enrollment_date 
            ? new Date(memberData.enrollment_date) 
            : new Date();
          const months = getPeriodMonths(plan.period as PlanPeriod);
          expirationDate = addMonths(enrollmentDate, months).toISOString().split('T')[0];
        }
      }

      const { data, error } = await supabase
        .from('members')
        .insert({
          ...memberData,
          company_id: profile.company_id,
          expiration_date: expirationDate,
          status: 'inactive', // Member starts inactive until a plan is purchased
        })
        .select(`
          *,
          contact:contacts(id, name, number, email, profile_pic_url),
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Membro cadastrado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cadastrar membro: ' + error.message);
    },
  });

  const updateMember = useMutation({
    mutationFn: async ({ id, ...memberData }: Partial<Member> & { id: string }) => {
      const { data, error } = await supabase
        .from('members')
        .update(memberData)
        .eq('id', id)
        .select(`
          *,
          contact:contacts(id, name, number, email, profile_pic_url),
          fitness_plan:fitness_plans(id, name, period, price)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Membro atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar membro: ' + error.message);
    },
  });

  const deleteMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Membro excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir membro: ' + error.message);
    },
  });

  return {
    members,
    isLoading,
    error,
    createMember,
    updateMember,
    deleteMember,
  };
}

export function getStatusLabel(status: MemberStatus): string {
  const labels: Record<MemberStatus, string> = {
    active: 'Ativo',
    inactive: 'Inativo',
    suspended: 'Suspenso',
    cancelled: 'Cancelado',
  };
  return labels[status];
}

export function getStatusColor(status: MemberStatus): string {
  const colors: Record<MemberStatus, string> = {
    active: 'bg-green-500/20 text-green-400',
    inactive: 'bg-gray-500/20 text-gray-400',
    suspended: 'bg-yellow-500/20 text-yellow-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };
  return colors[status];
}
