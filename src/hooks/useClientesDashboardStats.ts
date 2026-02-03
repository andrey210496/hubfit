import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth, differenceInDays, addDays } from 'date-fns';

interface MemberStatusBreakdown {
  active: number;
  inactive: number;
  suspended: number;
  cancelled: number;
  total: number;
}

interface RetentionMetrics {
  retentionRate: number;
  churnRate: number;
  avgMembershipMonths: number;
  renewalRate: number;
}

interface RiskMember {
  id: string;
  name: string;
  phone: string;
  daysSinceCheckin: number;
  plan: string;
  expirationDate: string | null;
}

interface ExpiringMember {
  id: string;
  name: string;
  phone: string;
  plan: string;
  expirationDate: string;
  daysUntilExpiry: number;
}

interface MembersByPlan {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface ClientesDashboardStats {
  status: MemberStatusBreakdown;
  retention: RetentionMetrics;
  riskMembers: RiskMember[];
  expiringMembers: ExpiringMember[];
  membersByPlan: MembersByPlan[];
  newMembersByDay: Array<{ date: string; count: number }>;
  birthdaysThisWeek: Array<{ id: string; name: string; date: string }>;
}

const PLAN_COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

export function useClientesDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<ClientesDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    try {
      // Fetch members with contacts and plans
      const { data: membersData } = await supabase
        .from('members')
        .select(`
          id, 
          status, 
          created_at, 
          enrollment_date,
          expiration_date,
          birth_date,
          fitness_plan_id,
          contact:contacts(id, name, number),
          fitness_plan:fitness_plans(id, name)
        `)
        .eq('company_id', companyId);

      const members = membersData || [];

      // Status breakdown
      const active = members.filter(m => m.status === 'active').length;
      const inactive = members.filter(m => m.status === 'inactive').length;
      const suspended = members.filter(m => m.status === 'suspended').length;
      const cancelled = members.filter(m => m.status === 'cancelled').length;

      // Retention metrics
      const totalWithHistory = members.filter(m => m.enrollment_date);
      const avgMonths = totalWithHistory.length > 0
        ? Math.round(totalWithHistory.reduce((sum, m) => 
            sum + differenceInDays(today, new Date(m.enrollment_date)) / 30, 0
          ) / totalWithHistory.length)
        : 0;

      const churnRate = members.length > 0 
        ? Math.round(((inactive + cancelled) / members.length) * 100 * 10) / 10 
        : 0;
      const retentionRate = 100 - churnRate;

      // Fetch access logs for risk analysis
      const { data: accessLogs } = await supabase
        .from('access_logs')
        .select('member_id, checkin_at')
        .eq('company_id', companyId)
        .order('checkin_at', { ascending: false });

      // Get last checkin for each member
      const lastCheckinMap = new Map<string, Date>();
      (accessLogs || []).forEach(log => {
        if (!lastCheckinMap.has(log.member_id)) {
          lastCheckinMap.set(log.member_id, new Date(log.checkin_at));
        }
      });

      // Risk members (active but no checkin for 5+ days)
      const activeMembers = members.filter(m => m.status === 'active');
      const riskMembers: RiskMember[] = activeMembers
        .map(m => {
          const lastCheckin = lastCheckinMap.get(m.id);
          const daysSince = lastCheckin ? differenceInDays(today, lastCheckin) : 999;
          const contact = m.contact as any;
          const plan = m.fitness_plan as any;
          return {
            id: m.id,
            name: contact?.name || 'Sem nome',
            phone: contact?.number || '-',
            daysSinceCheckin: daysSince,
            plan: plan?.name || '-',
            expirationDate: m.expiration_date,
          };
        })
        .filter(m => m.daysSinceCheckin >= 5)
        .sort((a, b) => b.daysSinceCheckin - a.daysSinceCheckin)
        .slice(0, 15);

      // Expiring members (next 30 days)
      const in30Days = addDays(today, 30);
      const expiringMembers: ExpiringMember[] = activeMembers
        .filter(m => {
          if (!m.expiration_date) return false;
          const expDate = new Date(m.expiration_date);
          return expDate >= today && expDate <= in30Days;
        })
        .map(m => {
          const contact = m.contact as any;
          const plan = m.fitness_plan as any;
          const expDate = new Date(m.expiration_date!);
          return {
            id: m.id,
            name: contact?.name || 'Sem nome',
            phone: contact?.number || '-',
            plan: plan?.name || '-',
            expirationDate: format(expDate, 'dd/MM/yyyy'),
            daysUntilExpiry: differenceInDays(expDate, today),
          };
        })
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
        .slice(0, 15);

      // Members by plan
      const planCounts = new Map<string, { name: string; count: number }>();
      activeMembers.forEach(m => {
        const plan = m.fitness_plan as any;
        const planName = plan?.name || 'Sem plano';
        const existing = planCounts.get(planName);
        if (existing) {
          existing.count++;
        } else {
          planCounts.set(planName, { name: planName, count: 1 });
        }
      });

      const membersByPlan: MembersByPlan[] = Array.from(planCounts.values())
        .sort((a, b) => b.count - a.count)
        .map((p, idx) => ({
          ...p,
          percentage: activeMembers.length > 0 ? Math.round((p.count / activeMembers.length) * 100) : 0,
          color: PLAN_COLORS[idx % PLAN_COLORS.length],
        }));

      // New members by day (last 7 days)
      const newMembersByDay: Array<{ date: string; count: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = members.filter(m => 
          format(new Date(m.created_at), 'yyyy-MM-dd') === dayStr
        ).length;
        newMembersByDay.push({
          date: format(day, 'dd/MM'),
          count,
        });
      }

      // Birthdays this week
      const weekStart = subDays(today, today.getDay());
      const weekEnd = addDays(weekStart, 6);
      const birthdaysThisWeek = members
        .filter(m => {
          if (!m.birth_date) return false;
          const bd = new Date(m.birth_date);
          const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
          return thisYearBd >= weekStart && thisYearBd <= weekEnd;
        })
        .map(m => {
          const contact = m.contact as any;
          const bd = new Date(m.birth_date!);
          return {
            id: m.id,
            name: contact?.name || 'Sem nome',
            date: format(bd, 'dd/MM'),
          };
        })
        .slice(0, 10);

      setStats({
        status: {
          active,
          inactive,
          suspended,
          cancelled,
          total: members.length,
        },
        retention: {
          retentionRate,
          churnRate,
          avgMembershipMonths: avgMonths,
          renewalRate: Math.round(retentionRate * 0.85), // Estimate
        },
        riskMembers,
        expiringMembers,
        membersByPlan,
        newMembersByDay,
        birthdaysThisWeek,
      });
    } catch (error) {
      console.error('Error fetching clientes dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
