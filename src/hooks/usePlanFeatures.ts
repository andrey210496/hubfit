import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PlanFeatures {
  users: number;
  connections: number;
  queues: number;
  use_campaigns: boolean;
  use_schedules: boolean;
  use_internal_chat: boolean;
  use_external_api: boolean;
  use_kanban: boolean;
}

const defaultFeatures: PlanFeatures = {
  users: 1,
  connections: 1,
  queues: 1,
  use_campaigns: false,
  use_schedules: false,
  use_internal_chat: false,
  use_external_api: false,
  use_kanban: false,
};

export function usePlanFeatures() {
  const { profile } = useAuth();
  const [features, setFeatures] = useState<PlanFeatures>(defaultFeatures);
  const [planName, setPlanName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlanFeatures = async () => {
      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        // Get company's plan
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('plan_id')
          .eq('id', profile.company_id)
          .single();

        if (companyError || !company?.plan_id) {
          setLoading(false);
          return;
        }

        // Get plan details
        const { data: plan, error: planError } = await supabase
          .from('plans')
          .select('*')
          .eq('id', company.plan_id)
          .single();

        if (planError || !plan) {
          setLoading(false);
          return;
        }

        setFeatures({
          users: plan.users,
          connections: plan.connections,
          queues: plan.queues,
          use_campaigns: plan.use_campaigns ?? false,
          use_schedules: plan.use_schedules ?? false,
          use_internal_chat: plan.use_internal_chat ?? false,
          use_external_api: plan.use_external_api ?? false,
          use_kanban: plan.use_kanban ?? false,
        });
        setPlanName(plan.name);
      } catch (error) {
        console.error('Error fetching plan features:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlanFeatures();
  }, [profile?.company_id]);

  const canAccess = useMemo(() => ({
    campaigns: features.use_campaigns,
    schedules: features.use_schedules,
    internalChat: features.use_internal_chat,
    externalApi: features.use_external_api,
    kanban: features.use_kanban,
  }), [features]);

  const limits = useMemo(() => ({
    users: features.users,
    connections: features.connections,
    queues: features.queues,
  }), [features]);

  return {
    features,
    planName,
    canAccess,
    limits,
    loading,
  };
}
