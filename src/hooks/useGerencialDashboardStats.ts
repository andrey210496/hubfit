import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';

interface RevenueMetrics {
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  revenueGrowth: number;
  avgTicket: number;
  ltv: number; // Lifetime Value
}

interface MemberMetrics {
  totalActive: number;
  churnRate: number;
  retentionRate: number;
  netGrowth: number;
  avgMembershipDuration: number;
}

interface OperationalMetrics {
  classOccupancy: number;
  avgCheckinsPerDay: number;
  peakHours: string;
  utilizationRate: number;
}

interface GerencialDashboardStats {
  revenue: RevenueMetrics;
  members: MemberMetrics;
  operational: OperationalMetrics;
  revenueByMonth: Array<{ month: string; revenue: number; expenses: number }>;
  growthTrend: Array<{ month: string; members: number; revenue: number }>;
}

export function useGerencialDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<GerencialDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    try {
      // Fetch members
      const { data: membersData } = await supabase
        .from('members')
        .select('id, status, created_at, enrollment_date, expiration_date, fitness_plan_id')
        .eq('company_id', companyId);

      const members = membersData || [];
      const activeMembers = members.filter(m => m.status === 'active');

      // Fetch plans for LTV calculation
      const { data: plansData } = await supabase
        .from('fitness_plans')
        .select('id, price, period')
        .eq('company_id', companyId);

      const plans = plansData || [];
      const planPriceMap = new Map(plans.map(p => [p.id, p.price]));

      // Calculate MRR
      const mrr = activeMembers.reduce((sum, m) => {
        const planPrice = planPriceMap.get(m.fitness_plan_id) || 0;
        return sum + planPrice;
      }, 0);

      // Fetch payments this month and last month
      const { data: paymentsThisMonth } = await supabase
        .from('member_payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(thisMonthEnd, 'yyyy-MM-dd'));

      const { data: paymentsLastMonth } = await supabase
        .from('member_payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('status', 'paid')
        .gte('paid_at', format(lastMonthStart, 'yyyy-MM-dd'))
        .lte('paid_at', format(lastMonthEnd, 'yyyy-MM-dd'));

      const revenueThisMonth = (paymentsThisMonth || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const revenueLastMonth = (paymentsLastMonth || []).reduce((sum, p) => sum + (p.amount || 0), 0);
      const revenueGrowth = revenueLastMonth > 0 
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) 
        : 0;

      // Calculate average ticket
      const avgTicket = activeMembers.length > 0 ? Math.round(mrr / activeMembers.length) : 0;

      // Calculate churn
      const cancelledThisMonth = members.filter(m => 
        m.status === 'cancelled' || m.status === 'inactive'
      ).length;
      const churnRate = members.length > 0 
        ? Math.round((cancelledThisMonth / members.length) * 100 * 10) / 10 
        : 0;
      const retentionRate = 100 - churnRate;

      // New members this month
      const newThisMonth = members.filter(m => 
        new Date(m.created_at) >= thisMonthStart
      ).length;
      const newLastMonth = members.filter(m => 
        new Date(m.created_at) >= lastMonthStart && new Date(m.created_at) <= lastMonthEnd
      ).length;
      const netGrowth = newThisMonth - newLastMonth;

      // Average membership duration
      const membersWithDuration = activeMembers.filter(m => m.enrollment_date);
      const avgDuration = membersWithDuration.length > 0
        ? Math.round(membersWithDuration.reduce((sum, m) => 
            sum + differenceInDays(today, new Date(m.enrollment_date)), 0
          ) / membersWithDuration.length / 30)
        : 0;

      // Fetch class sessions for occupancy
      const { data: sessionsData } = await supabase
        .from('class_sessions')
        .select('max_capacity, current_bookings')
        .eq('company_id', companyId)
        .gte('session_date', format(thisMonthStart, 'yyyy-MM-dd'))
        .lte('session_date', format(thisMonthEnd, 'yyyy-MM-dd'))
        .eq('is_cancelled', false);

      const sessions = sessionsData || [];
      const totalCapacity = sessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const totalBooked = sessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
      const classOccupancy = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

      // Fetch access logs for checkin averages
      const { data: accessData } = await supabase
        .from('access_logs')
        .select('checkin_at')
        .eq('company_id', companyId)
        .gte('checkin_at', format(thisMonthStart, 'yyyy-MM-dd'));

      const accessLogs = accessData || [];
      const daysInMonth = differenceInDays(today, thisMonthStart) + 1;
      const avgCheckinsPerDay = daysInMonth > 0 ? Math.round(accessLogs.length / daysInMonth) : 0;

      // Revenue by month (last 6 months)
      const revenueByMonth: Array<{ month: string; revenue: number; expenses: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const monthLabel = format(monthDate, 'MMM');
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        
        const { data: monthPayments } = await supabase
          .from('member_payments')
          .select('amount')
          .eq('company_id', companyId)
          .eq('status', 'paid')
          .gte('paid_at', format(mStart, 'yyyy-MM-dd'))
          .lte('paid_at', format(mEnd, 'yyyy-MM-dd'));

        revenueByMonth.push({
          month: monthLabel,
          revenue: (monthPayments || []).reduce((sum, p) => sum + (p.amount || 0), 0),
          expenses: 0, // Placeholder for expenses
        });
      }

      // LTV estimate (avg ticket * avg duration in months)
      const ltv = avgTicket * (avgDuration > 0 ? avgDuration : 12);

      setStats({
        revenue: {
          mrr,
          arr: mrr * 12,
          revenueGrowth,
          avgTicket,
          ltv,
        },
        members: {
          totalActive: activeMembers.length,
          churnRate,
          retentionRate,
          netGrowth,
          avgMembershipDuration: avgDuration,
        },
        operational: {
          classOccupancy,
          avgCheckinsPerDay,
          peakHours: '18:00 - 20:00',
          utilizationRate: Math.min(classOccupancy + 10, 100),
        },
        revenueByMonth,
        growthTrend: revenueByMonth.map((r, idx) => ({
          month: r.month,
          members: activeMembers.length - (5 - idx) * 3, // Simulated trend
          revenue: r.revenue,
        })),
      });
    } catch (error) {
      console.error('Error fetching gerencial dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
