import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Plan {
  id: string;
  name: string;
  price: number;
  users: number;
  connections: number;
  queues: number;
  use_campaigns: boolean | null;
  use_schedules: boolean | null;
  use_internal_chat: boolean | null;
  use_external_api: boolean | null;
  use_kanban: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  plan_id: string | null;
  status: 'active' | 'inactive' | 'trial';
  due_date: string | null;
  recurrence: string | null;
  created_at: string | null;
  updated_at: string | null;
  plan?: Plan;
}

export interface PlanFormData {
  name: string;
  price: number;
  users: number;
  connections: number;
  queues: number;
  use_campaigns: boolean;
  use_schedules: boolean;
  use_internal_chat: boolean;
  use_external_api: boolean;
  use_kanban: boolean;
}

export interface CompanyFormData {
  name: string;
  email: string;
  phone: string;
  document: string;
  plan_id: string;
  status: 'active' | 'inactive' | 'trial';
  due_date: string;
  recurrence: string;
}

export function useAdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      setPlans(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar planos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (planData: PlanFormData) => {
    try {
      const { error } = await supabase.from('plans').insert(planData);
      if (error) throw error;
      toast({ title: 'Plano criado com sucesso' });
      await fetchPlans();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updatePlan = async (id: string, planData: Partial<PlanFormData>) => {
    try {
      const { error } = await supabase
        .from('plans')
        .update(planData)
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Plano atualizado com sucesso' });
      await fetchPlans();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Plano excluído com sucesso' });
      await fetchPlans();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir plano',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, loading, createPlan, updatePlan, deletePlan, refetch: fetchPlans };
}

export function useAdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*, plan:plans(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCompanies(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar empresas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: CompanyFormData) => {
    try {
      const { error } = await supabase.from('companies').insert({
        ...companyData,
        due_date: companyData.due_date || null,
        plan_id: companyData.plan_id || null,
      });
      if (error) throw error;
      toast({ title: 'Empresa criada com sucesso' });
      await fetchCompanies();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar empresa',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateCompany = async (id: string, companyData: Partial<CompanyFormData>) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          ...companyData,
          due_date: companyData.due_date || null,
          plan_id: companyData.plan_id || null,
        })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Empresa atualizada com sucesso' });
      await fetchCompanies();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar empresa',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      const { error } = await supabase.from('companies').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Empresa excluída com sucesso' });
      await fetchCompanies();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir empresa',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return { companies, loading, createCompany, updateCompany, deleteCompany, refetch: fetchCompanies };
}

export function useUserRole() {
  const { user, loading: authLoading } = useAuth();
  const [roles, setRoles] = useState<Array<'admin' | 'super' | 'user'>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      // Wait for auth to resolve
      if (authLoading) return;

      if (!user) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) throw error;

        const list = (data ?? [])
          .map((r) => r.role)
          .filter((r): r is 'admin' | 'super' | 'user' => r === 'admin' || r === 'super' || r === 'user');

        setRoles(list);
      } catch (error) {
        console.error('Error fetching role:', error);
        setRoles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoles();
  }, [user?.id, authLoading]);

  const isSuper = roles.includes('super');
  const isAdmin = isSuper || roles.includes('admin');
  const role: 'super' | 'admin' | 'user' | null = !user ? null : isSuper ? 'super' : isAdmin ? 'admin' : 'user';

  return { role, roles, isSuper, isAdmin, loading };
}
