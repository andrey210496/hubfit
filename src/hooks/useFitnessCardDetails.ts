import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, differenceInDays } from 'date-fns';
import { DetailItem } from '@/components/dashboard/CardDetailModal';

export type FitnessCardType = 
  | 'active-members'
  | 'inactive-members'
  | 'suspended-members'
  | 'new-members'
  | 'expiring-7days'
  | 'expiring-30days'
  | 'pending-payments'
  | 'overdue-payments'
  | 'classes-today'
  | 'checkins-today'
  | 'risk-zone-3'
  | 'risk-zone-5'
  | 'risk-zone-7';

interface MemberWithContact {
  id: string;
  status: string;
  created_at: string;
  expiration_date: string | null;
  contact: {
    name: string;
    number: string;
    email: string | null;
    profile_pic_url: string | null;
  } | null;
  fitness_plan: {
    name: string;
  } | null;
}

export function useFitnessCardDetails() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<DetailItem[]>([]);

  const fetchMembersByStatus = useCallback(async (status: 'active' | 'inactive' | 'suspended' | 'cancelled') => {
    if (!profile?.company_id) return [];

    const { data } = await supabase
      .from('members')
      .select(`
        id, status, created_at, expiration_date,
        contact:contacts(name, number, email, profile_pic_url),
        fitness_plan:fitness_plans(name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', status)
      .limit(100);

    return (data || []).map((m: any) => ({
      id: m.id,
      title: m.contact?.name || 'Sem nome',
      subtitle: m.fitness_plan?.name || 'Sem plano',
      avatar: m.contact?.profile_pic_url,
      status: {
        label: status === 'active' ? 'Ativo' : status === 'inactive' ? 'Inativo' : 'Suspenso',
        variant: status === 'active' ? 'success' : status === 'inactive' ? 'default' : 'warning',
      } as const,
      metadata: [
        { label: 'Telefone', value: m.contact?.number || '-' },
        m.expiration_date && { label: 'Vence', value: format(new Date(m.expiration_date), 'dd/MM/yyyy') },
      ].filter(Boolean) as Array<{ label: string; value: string }>,
    }));
  }, [profile?.company_id]);

  const fetchExpiringMembers = useCallback(async (days: number) => {
    if (!profile?.company_id) return [];

    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + days);

    const { data } = await supabase
      .from('members')
      .select(`
        id, status, expiration_date,
        contact:contacts(name, number, email, profile_pic_url),
        fitness_plan:fitness_plans(name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'active')
      .gte('expiration_date', format(today, 'yyyy-MM-dd'))
      .lte('expiration_date', format(targetDate, 'yyyy-MM-dd'))
      .limit(100);

    return (data || []).map((m: any) => {
      const daysLeft = m.expiration_date 
        ? differenceInDays(new Date(m.expiration_date), today) 
        : 0;
      return {
        id: m.id,
        title: m.contact?.name || 'Sem nome',
        subtitle: m.fitness_plan?.name || 'Sem plano',
        avatar: m.contact?.profile_pic_url,
        status: {
          label: `${daysLeft} dias`,
          variant: daysLeft <= 3 ? 'danger' : daysLeft <= 7 ? 'warning' : 'info',
        } as const,
        metadata: [
          { label: 'Telefone', value: m.contact?.number || '-' },
          { label: 'Vence em', value: format(new Date(m.expiration_date), 'dd/MM/yyyy') },
        ],
      };
    });
  }, [profile?.company_id]);

  const fetchPendingPayments = useCallback(async (overdue: boolean = false) => {
    if (!profile?.company_id) return [];

    const today = new Date();
    let query = supabase
      .from('member_payments')
      .select(`
        id, amount, due_date, status,
        member:members(
          id,
          contact:contacts(name, number, profile_pic_url)
        ),
        fitness_plan:fitness_plans(name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'pending')
      .limit(100);

    if (overdue) {
      query = query.lt('due_date', format(today, 'yyyy-MM-dd'));
    }

    const { data } = await query;

    return (data || []).map((p: any) => {
      const isOverdue = new Date(p.due_date) < today;
      const daysOverdue = isOverdue 
        ? differenceInDays(today, new Date(p.due_date))
        : 0;

      return {
        id: p.id,
        title: (p.member as any)?.contact?.name || 'Sem nome',
        subtitle: `R$ ${(p.amount || 0).toFixed(2)} - ${p.fitness_plan?.name || 'Avulso'}`,
        avatar: (p.member as any)?.contact?.profile_pic_url,
        status: {
          label: isOverdue ? `${daysOverdue} dias em atraso` : 'Pendente',
          variant: isOverdue ? 'danger' : 'warning',
        } as const,
        metadata: [
          { label: 'Vencimento', value: format(new Date(p.due_date), 'dd/MM/yyyy') },
          { label: 'Valor', value: `R$ ${(p.amount || 0).toFixed(2)}` },
        ],
      };
    });
  }, [profile?.company_id]);

  const fetchClassesToday = useCallback(async () => {
    if (!profile?.company_id) return [];

    const today = format(new Date(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('class_sessions')
      .select(`
        id, start_time, end_time, max_capacity, current_bookings, is_cancelled,
        class_type:class_types(name, color),
        instructor:profiles(name)
      `)
      .eq('company_id', profile.company_id)
      .eq('session_date', today)
      .order('start_time');

    return (data || []).map((s: any) => ({
      id: s.id,
      title: (s.class_type as any)?.name || 'Aula',
      subtitle: `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`,
      status: {
        label: s.is_cancelled ? 'Cancelada' : `${s.current_bookings || 0}/${s.max_capacity}`,
        variant: s.is_cancelled ? 'danger' : (s.current_bookings || 0) >= s.max_capacity ? 'success' : 'info',
      } as const,
      metadata: [
        { label: 'Instrutor', value: (s.instructor as any)?.name || '-' },
        { label: 'Ocupação', value: `${Math.round(((s.current_bookings || 0) / s.max_capacity) * 100)}%` },
      ],
    }));
  }, [profile?.company_id]);

  const fetchCheckinsToday = useCallback(async () => {
    if (!profile?.company_id) return [];

    const today = format(new Date(), 'yyyy-MM-dd');

    const { data } = await supabase
      .from('access_logs')
      .select(`
        id, checkin_at, checkin_method, status,
        member:members(
          id,
          contact:contacts(name, number, profile_pic_url),
          fitness_plan:fitness_plans(name)
        )
      `)
      .eq('company_id', profile.company_id)
      .gte('checkin_at', `${today}T00:00:00`)
      .lte('checkin_at', `${today}T23:59:59`)
      .order('checkin_at', { ascending: false })
      .limit(100);

    return (data || []).map((log: any) => ({
      id: log.id,
      title: (log.member as any)?.contact?.name || 'Sem nome',
      subtitle: (log.member as any)?.fitness_plan?.name || 'Sem plano',
      avatar: (log.member as any)?.contact?.profile_pic_url,
      status: {
        label: format(new Date(log.checkin_at), 'HH:mm'),
        variant: 'success',
      } as const,
      metadata: [
        { label: 'Método', value: log.checkin_method || 'Manual' },
      ],
    }));
  }, [profile?.company_id]);

  const fetchRiskZone = useCallback(async (minDays: number, maxDays?: number) => {
    if (!profile?.company_id) return [];

    const today = new Date();
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - minDays);
    const maxDate = maxDays ? new Date() : undefined;
    if (maxDate) maxDate.setDate(today.getDate() - maxDays);

    // Get active members
    const { data: members } = await supabase
      .from('members')
      .select(`
        id,
        contact:contacts(name, number, profile_pic_url),
        fitness_plan:fitness_plans(name)
      `)
      .eq('company_id', profile.company_id)
      .eq('status', 'active');

    // Get last checkin for each member
    const { data: logs } = await supabase
      .from('access_logs')
      .select('member_id, checkin_at')
      .eq('company_id', profile.company_id)
      .order('checkin_at', { ascending: false });

    const lastCheckinMap = new Map<string, Date>();
    (logs || []).forEach((log) => {
      if (!lastCheckinMap.has(log.member_id)) {
        lastCheckinMap.set(log.member_id, new Date(log.checkin_at));
      }
    });

    return (members || [])
      .map((m: any) => {
        const lastCheckin = lastCheckinMap.get(m.id);
        const daysSince = lastCheckin ? differenceInDays(today, lastCheckin) : 999;
        return { ...m, daysSince, lastCheckin };
      })
      .filter((m) => {
        if (maxDays) {
          return m.daysSince >= minDays && m.daysSince < maxDays;
        }
        return m.daysSince >= minDays;
      })
      .slice(0, 50)
      .map((m: any) => ({
        id: m.id,
        title: m.contact?.name || 'Sem nome',
        subtitle: m.fitness_plan?.name || 'Sem plano',
        avatar: m.contact?.profile_pic_url,
        status: {
          label: m.lastCheckin ? `${m.daysSince} dias` : 'Nunca treinou',
          variant: m.daysSince >= 7 ? 'danger' : m.daysSince >= 5 ? 'warning' : 'info',
        } as const,
        metadata: [
          { label: 'Telefone', value: m.contact?.number || '-' },
          m.lastCheckin && { label: 'Último treino', value: format(m.lastCheckin, 'dd/MM/yyyy') },
        ].filter(Boolean) as Array<{ label: string; value: string }>,
      }));
  }, [profile?.company_id]);

  const fetchDetails = useCallback(async (cardType: FitnessCardType) => {
    setLoading(true);
    setItems([]);

    try {
      let result: DetailItem[] = [];

      switch (cardType) {
        case 'active-members':
          result = await fetchMembersByStatus('active');
          break;
        case 'inactive-members':
          result = await fetchMembersByStatus('inactive');
          break;
        case 'suspended-members':
          result = await fetchMembersByStatus('suspended');
          break;
        case 'expiring-7days':
          result = await fetchExpiringMembers(7);
          break;
        case 'expiring-30days':
          result = await fetchExpiringMembers(30);
          break;
        case 'pending-payments':
          result = await fetchPendingPayments(false);
          break;
        case 'overdue-payments':
          result = await fetchPendingPayments(true);
          break;
        case 'classes-today':
          result = await fetchClassesToday();
          break;
        case 'checkins-today':
          result = await fetchCheckinsToday();
          break;
        case 'risk-zone-3':
          result = await fetchRiskZone(3, 5);
          break;
        case 'risk-zone-5':
          result = await fetchRiskZone(5, 7);
          break;
        case 'risk-zone-7':
          result = await fetchRiskZone(7);
          break;
      }

      setItems(result);
    } catch (error) {
      console.error('Error fetching card details:', error);
    } finally {
      setLoading(false);
    }
  }, [
    fetchMembersByStatus,
    fetchExpiringMembers,
    fetchPendingPayments,
    fetchClassesToday,
    fetchCheckinsToday,
    fetchRiskZone,
  ]);

  return {
    items,
    loading,
    fetchDetails,
  };
}
