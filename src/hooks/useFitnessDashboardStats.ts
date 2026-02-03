import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, format, differenceInDays, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear, startOfDay, endOfDay } from 'date-fns';

export type PeriodFilter = 'today' | 'week' | 'month' | 'quarter' | 'year';

interface RiskMember {
  id: string;
  name: string;
  daysSinceLastCheckin: number;
  lastCheckinDate: string | null;
}

interface RiskZone {
  days3: RiskMember[];
  days5: RiskMember[];
  days7: RiskMember[];
}

interface FitnessDashboardStats {
  members: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
    newThisMonth: number;
    expiringIn7Days: number;
    expiringIn30Days: number;
  };
  financial: {
    revenueThisMonth: number;
    revenueLastMonth: number;
    pendingPayments: number;
    overduePayments: number;
    overdueAmount: number;
  };
  classes: {
    totalToday: number;
    bookedToday: number;
    attendedToday: number;
    occupancyRate: number;
    totalThisWeek: number;
  };
  plans: {
    total: number;
    mostPopular: string;
    mostPopularCount: number;
  };
  accessLogs: {
    checkinsToday: number;
    checkinsThisWeek: number;
  };
  riskZone: RiskZone;
}

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface MembersByPlan {
  name: string;
  count: number;
  color: string;
}

interface ClassOccupancy {
  name: string;
  booked: number;
  capacity: number;
}

const PLAN_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899'
];

export function useFitnessDashboardStats(periodFilter: PeriodFilter = 'month', planFilter: string = 'all') {
  const { profile } = useAuth();
  const [stats, setStats] = useState<FitnessDashboardStats | null>(null);
  const [revenueByDay, setRevenueByDay] = useState<RevenueByDay[]>([]);
  const [membersByPlan, setMembersByPlan] = useState<MembersByPlan[]>([]);
  const [classOccupancy, setClassOccupancy] = useState<ClassOccupancy[]>([]);
  const [riskZone, setRiskZone] = useState<RiskZone>({ days3: [], days5: [], days7: [] });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    
    // Calculate period dates based on filter
    let periodStart: Date;
    let periodEnd: Date;
    
    switch (periodFilter) {
      case 'today':
        periodStart = startOfDay(today);
        periodEnd = endOfDay(today);
        break;
      case 'week':
        periodStart = startOfWeek(today, { weekStartsOn: 1 });
        periodEnd = endOfWeek(today, { weekStartsOn: 1 });
        break;
      case 'quarter':
        periodStart = startOfQuarter(today);
        periodEnd = endOfQuarter(today);
        break;
      case 'year':
        periodStart = startOfYear(today);
        periodEnd = endOfYear(today);
        break;
      case 'month':
      default:
        periodStart = startOfMonth(today);
        periodEnd = endOfMonth(today);
        break;
    }
    
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const in7Days = addDays(today, 7);
    const in30Days = addDays(today, 30);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    try {
      // Fetch members stats with optional plan filter
      let membersQuery = supabase
        .from('members')
        .select('id, status, created_at, expiration_date, fitness_plan_id')
        .eq('company_id', companyId);
      
      if (planFilter !== 'all') {
        membersQuery = membersQuery.eq('fitness_plan_id', planFilter);
      }

      const { data: membersData } = await membersQuery;

      const members = membersData || [];
      const activeMembers = members.filter(m => m.status === 'active');
      const inactiveMembers = members.filter(m => m.status === 'inactive');
      const suspendedMembers = members.filter(m => m.status === 'suspended');
      const newThisPeriod = members.filter(m => 
        new Date(m.created_at) >= periodStart && new Date(m.created_at) <= periodEnd
      );
      const expiringIn7Days = activeMembers.filter(m => {
        if (!m.expiration_date) return false;
        const expDate = new Date(m.expiration_date);
        return expDate >= today && expDate <= in7Days;
      });
      const expiringIn30Days = activeMembers.filter(m => {
        if (!m.expiration_date) return false;
        const expDate = new Date(m.expiration_date);
        return expDate >= today && expDate <= in30Days;
      });

      // Fetch plans for member distribution
      const { data: plansData } = await supabase
        .from('fitness_plans')
        .select('id, name')
        .eq('company_id', companyId);

      const plans = plansData || [];
      const planCounts = plans.map((plan, idx) => ({
        name: plan.name,
        count: activeMembers.filter(m => m.fitness_plan_id === plan.id).length,
        color: PLAN_COLORS[idx % PLAN_COLORS.length]
      })).filter(p => p.count > 0).sort((a, b) => b.count - a.count);

      const mostPopular = planCounts[0] || { name: '-', count: 0 };

      // Fetch payments for revenue (based on period)
      const { data: paymentsPeriod } = await supabase
        .from('member_payments')
        .select('amount, paid_at, due_date, status')
        .eq('company_id', companyId)
        .gte('paid_at', format(periodStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(periodEnd, 'yyyy-MM-dd'))
        .eq('status', 'paid');

      const { data: paymentsLastMonth } = await supabase
        .from('member_payments')
        .select('amount')
        .eq('company_id', companyId)
        .gte('paid_at', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(lastMonthEnd, 'yyyy-MM-dd'))
        .eq('status', 'paid');

      const { data: pendingPaymentsData } = await supabase
        .from('member_payments')
        .select('amount, due_date, status')
        .eq('company_id', companyId)
        .eq('status', 'pending');

      const pending = pendingPaymentsData || [];
      const overdue = pending.filter(p => new Date(p.due_date) < today);
      const overdueAmount = overdue.reduce((sum, p) => sum + (p.amount || 0), 0);

      const revenuePeriod = (paymentsPeriod || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const revenueLastMonth = (paymentsLastMonth || []).reduce((sum, p) => sum + (p.amount || 0), 0);

      // Revenue by day (last 7 days)
      const revenueDays: RevenueByDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = addDays(today, -i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayPayments = (paymentsPeriod || []).filter(p => 
          p.paid_at && format(new Date(p.paid_at), 'yyyy-MM-dd') === dayStr
        );
        revenueDays.push({
          date: format(day, 'dd/MM'),
          revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
        });
      }

      // Fetch class sessions for today
      const { data: sessionsToday } = await supabase
        .from('class_sessions')
        .select(`
          id, 
          max_capacity, 
          current_bookings,
          class_type:class_types(name)
        `)
        .eq('company_id', companyId)
        .eq('session_date', todayStr)
        .eq('is_cancelled', false);

      const sessions = sessionsToday || [];
      const totalCapacityToday = sessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const totalBookedToday = sessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
      const occupancyRate = totalCapacityToday > 0 
        ? Math.round((totalBookedToday / totalCapacityToday) * 100) 
        : 0;

      // Class occupancy for chart
      const classOccupancyData = sessions.slice(0, 6).map(s => ({
        name: (s.class_type as any)?.name || 'Aula',
        booked: s.current_bookings || 0,
        capacity: s.max_capacity || 0
      }));

      // Fetch sessions this week
      const { data: sessionsWeek } = await supabase
        .from('class_sessions')
        .select('id')
        .eq('company_id', companyId)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('is_cancelled', false);

      // Fetch bookings attended today
      const { data: bookingsToday } = await supabase
        .from('class_bookings')
        .select('id, status, attended_at')
        .eq('company_id', companyId)
        .not('attended_at', 'is', null);

      const attendedToday = (bookingsToday || []).filter(b => 
        b.attended_at && format(new Date(b.attended_at), 'yyyy-MM-dd') === todayStr
      ).length;

      // Fetch access logs
      const { data: accessToday } = await supabase
        .from('access_logs')
        .select('id')
        .eq('company_id', companyId)
        .gte('checkin_at', `${todayStr}T00:00:00`)
        .lte('checkin_at', `${todayStr}T23:59:59`);

      const { data: accessWeek } = await supabase
        .from('access_logs')
        .select('id')
        .eq('company_id', companyId)
        .gte('checkin_at', format(weekStart, 'yyyy-MM-dd'))
        .lte('checkin_at', format(weekEnd, 'yyyy-MM-dd'));

      // Fetch risk zone - members without check-in for 3, 5, 7+ days
      const { data: allAccessLogs } = await supabase
        .from('access_logs')
        .select('member_id, checkin_at')
        .eq('company_id', companyId)
        .order('checkin_at', { ascending: false });

      // Get contacts for member names
      const activeMemberIds = activeMembers.map(m => m.id);
      const { data: membersWithContacts } = await supabase
        .from('members')
        .select('id, contact:contacts(name)')
        .in('id', activeMemberIds);

      const memberNameMap = new Map<string, string>();
      (membersWithContacts || []).forEach(m => {
        const contact = m.contact as any;
        memberNameMap.set(m.id, contact?.name || 'Sem nome');
      });

      // Get last checkin for each active member
      const lastCheckinMap = new Map<string, Date>();
      (allAccessLogs || []).forEach(log => {
        if (!lastCheckinMap.has(log.member_id)) {
          lastCheckinMap.set(log.member_id, new Date(log.checkin_at));
        }
      });

      const riskMembers: RiskMember[] = activeMembers.map(member => {
        const lastCheckin = lastCheckinMap.get(member.id);
        const daysSince = lastCheckin ? differenceInDays(today, lastCheckin) : 999;
        return {
          id: member.id,
          name: memberNameMap.get(member.id) || 'Sem nome',
          daysSinceLastCheckin: daysSince,
          lastCheckinDate: lastCheckin ? format(lastCheckin, 'dd/MM/yyyy') : null,
        };
      });

      // Filter into risk categories (exclusive - each member in only one category)
      const days7Plus = riskMembers.filter(m => m.daysSinceLastCheckin >= 7).slice(0, 10);
      const days5 = riskMembers.filter(m => m.daysSinceLastCheckin >= 5 && m.daysSinceLastCheckin < 7).slice(0, 10);
      const days3 = riskMembers.filter(m => m.daysSinceLastCheckin >= 3 && m.daysSinceLastCheckin < 5).slice(0, 10);

      const riskZoneData: RiskZone = {
        days3,
        days5,
        days7: days7Plus,
      };

      setStats({
        members: {
          total: members.length,
          active: activeMembers.length,
          inactive: inactiveMembers.length,
          suspended: suspendedMembers.length,
          newThisMonth: newThisPeriod.length,
          expiringIn7Days: expiringIn7Days.length,
          expiringIn30Days: expiringIn30Days.length,
        },
        financial: {
          revenueThisMonth: revenuePeriod,
          revenueLastMonth,
          pendingPayments: pending.length,
          overduePayments: overdue.length,
          overdueAmount,
        },
        classes: {
          totalToday: sessions.length,
          bookedToday: totalBookedToday,
          attendedToday,
          occupancyRate,
          totalThisWeek: (sessionsWeek || []).length,
        },
        plans: {
          total: plans.length,
          mostPopular: mostPopular.name,
          mostPopularCount: mostPopular.count,
        },
        accessLogs: {
          checkinsToday: (accessToday || []).length,
          checkinsThisWeek: (accessWeek || []).length,
        },
        riskZone: riskZoneData,
      });

      setRevenueByDay(revenueDays);
      setMembersByPlan(planCounts);
      setClassOccupancy(classOccupancyData);

    } catch (error) {
      console.error('Error fetching fitness dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, periodFilter, planFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    revenueByDay,
    membersByPlan,
    classOccupancy,
    riskZone,
    loading,
    refetch: fetchStats,
  };
}
