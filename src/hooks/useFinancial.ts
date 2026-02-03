import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface Plan {
  id: string;
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
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  detail: string | null;
  status: string | null;
  value: number | null;
  due_date: string | null;
  created_at: string | null;
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPlans = async () => {
    try {
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

  useEffect(() => {
    fetchPlans();
  }, []);

  return { plans, loading, refetch: fetchPlans };
}

export function useInvoices() {
  const { profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvoices = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar faturas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [profile?.company_id]);

  return { invoices, loading, refetch: fetchInvoices };
}

export function useCompanyPlan() {
  const [companyPlan, setCompanyPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCompanyPlan = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.company_id) return;

      const { data: company } = await supabase
        .from('companies')
        .select('plan_id')
        .eq('id', profile.company_id)
        .maybeSingle();

      if (!company?.plan_id) return;

      const { data: plan } = await supabase
        .from('plans')
        .select('*')
        .eq('id', company.plan_id)
        .maybeSingle();

      setCompanyPlan(plan);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar plano',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyPlan();
  }, []);

  return { companyPlan, loading, refetch: fetchCompanyPlan };
}
