import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subMonths, startOfMonth, endOfMonth, addDays, subDays } from 'date-fns';

interface RevenueMetrics {
  thisMonth: number;
  lastMonth: number;
  growth: number;
  projected: number;
}

interface PaymentMetrics {
  received: number;
  pending: number;
  overdue: number;
  overdueAmount: number;
}

interface PaymentByMethod {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface OverdueMember {
  id: string;
  name: string;
  phone: string;
  amount: number;
  daysOverdue: number;
  dueDate: string;
}

interface RevenueByDay {
  date: string;
  revenue: number;
}

interface FinanceiroDashboardStats {
  revenue: RevenueMetrics;
  payments: PaymentMetrics;
  paymentsByMethod: PaymentByMethod[];
  overdueMembers: OverdueMember[];
  revenueByDay: RevenueByDay[];
  revenueByMonth: Array<{ month: string; revenue: number }>;
  avgTicket: number;
  receivablesNext7Days: number;
}

export function useFinanceiroDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<FinanceiroDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(subMonths(today, 1));

    try {
      // Fetch all payments
      const { data: allPayments } = await supabase
        .from('member_payments')
        .select(`
          id, 
          amount, 
          status, 
          due_date, 
          paid_at, 
          payment_method,
          member:members(
            id,
            contact:contacts(id, name, number)
          )
        `)
        .eq('company_id', companyId);

      const payments = allPayments || [];

      // This month revenue
      const paidThisMonth = payments.filter(p => 
        p.status === 'paid' && 
        p.paid_at && 
        new Date(p.paid_at) >= thisMonthStart && 
        new Date(p.paid_at) <= thisMonthEnd
      );
      const revenueThisMonth = paidThisMonth.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Last month revenue
      const paidLastMonth = payments.filter(p => 
        p.status === 'paid' && 
        p.paid_at && 
        new Date(p.paid_at) >= lastMonthStart && 
        new Date(p.paid_at) <= lastMonthEnd
      );
      const revenueLastMonth = paidLastMonth.reduce((sum, p) => sum + (p.amount || 0), 0);

      const growth = revenueLastMonth > 0 
        ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100) 
        : 0;

      // Project based on days passed
      const daysPassed = today.getDate();
      const daysInMonth = thisMonthEnd.getDate();
      const projected = daysPassed > 0 
        ? Math.round((revenueThisMonth / daysPassed) * daysInMonth)
        : 0;

      // Payment status counts
      const pendingPayments = payments.filter(p => p.status === 'pending');
      const overduePayments = pendingPayments.filter(p => new Date(p.due_date) < today);
      const overdueAmount = overduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      // Payments by method
      const methodCounts = new Map<string, { amount: number; count: number }>();
      paidThisMonth.forEach(p => {
        const method = p.payment_method || 'Outros';
        const existing = methodCounts.get(method);
        if (existing) {
          existing.amount += p.amount || 0;
          existing.count++;
        } else {
          methodCounts.set(method, { amount: p.amount || 0, count: 1 });
        }
      });

      const totalPaid = paidThisMonth.length;
      const paymentsByMethod: PaymentByMethod[] = Array.from(methodCounts.entries())
        .map(([method, data]) => ({
          method,
          amount: data.amount,
          count: data.count,
          percentage: totalPaid > 0 ? Math.round((data.count / totalPaid) * 100) : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Overdue members list
      const overdueMembers: OverdueMember[] = overduePayments
        .map(p => {
          const member = p.member as any;
          const contact = member?.contact;
          const dueDate = new Date(p.due_date);
          return {
            id: member?.id || p.id,
            name: contact?.name || 'Sem nome',
            phone: contact?.number || '-',
            amount: p.amount || 0,
            daysOverdue: Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
            dueDate: format(dueDate, 'dd/MM/yyyy'),
          };
        })
        .sort((a, b) => b.daysOverdue - a.daysOverdue)
        .slice(0, 15);

      // Revenue by day (last 7 days)
      const revenueByDay: RevenueByDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayPayments = payments.filter(p => 
          p.status === 'paid' && 
          p.paid_at && 
          format(new Date(p.paid_at), 'yyyy-MM-dd') === dayStr
        );
        revenueByDay.push({
          date: format(day, 'dd/MM'),
          revenue: dayPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        });
      }

      // Revenue by month (last 6 months)
      const revenueByMonth: Array<{ month: string; revenue: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(today, i);
        const mStart = startOfMonth(monthDate);
        const mEnd = endOfMonth(monthDate);
        const monthPayments = payments.filter(p => 
          p.status === 'paid' && 
          p.paid_at && 
          new Date(p.paid_at) >= mStart && 
          new Date(p.paid_at) <= mEnd
        );
        revenueByMonth.push({
          month: format(monthDate, 'MMM'),
          revenue: monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0),
        });
      }

      // Average ticket
      const avgTicket = paidThisMonth.length > 0 
        ? Math.round(revenueThisMonth / paidThisMonth.length) 
        : 0;

      // Receivables next 7 days
      const in7Days = addDays(today, 7);
      const upcomingPayments = pendingPayments.filter(p => {
        const dueDate = new Date(p.due_date);
        return dueDate >= today && dueDate <= in7Days;
      });
      const receivablesNext7Days = upcomingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

      setStats({
        revenue: {
          thisMonth: revenueThisMonth,
          lastMonth: revenueLastMonth,
          growth,
          projected,
        },
        payments: {
          received: paidThisMonth.length,
          pending: pendingPayments.length,
          overdue: overduePayments.length,
          overdueAmount,
        },
        paymentsByMethod,
        overdueMembers,
        revenueByDay,
        revenueByMonth,
        avgTicket,
        receivablesNext7Days,
      });
    } catch (error) {
      console.error('Error fetching financeiro dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
