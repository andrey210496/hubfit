import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SystemStats {
  totalCompanies: number;
  activeCompanies: number;
  trialCompanies: number;
  inactiveCompanies: number;
  totalUsers: number;
  totalPlans: number;
  totalConnections: number;
  totalTickets: number;
  totalContacts: number;
  totalMessages: number;
}

export interface RecentCompany {
  id: string;
  name: string;
  email: string | null;
  status: string;
  created_at: string | null;
  plan?: { name: string } | null;
}

export interface RecentUser {
  id: string;
  name: string;
  email: string;
  created_at: string | null;
  company?: { name: string } | null;
}

export function useSystemStats() {
  const [stats, setStats] = useState<SystemStats>({
    totalCompanies: 0,
    activeCompanies: 0,
    trialCompanies: 0,
    inactiveCompanies: 0,
    totalUsers: 0,
    totalPlans: 0,
    totalConnections: 0,
    totalTickets: 0,
    totalContacts: 0,
    totalMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch companies stats
      const { data: companies } = await supabase.from('companies').select('status');
      const totalCompanies = companies?.length || 0;
      const activeCompanies = companies?.filter(c => c.status === 'active').length || 0;
      const trialCompanies = companies?.filter(c => c.status === 'trial').length || 0;
      const inactiveCompanies = companies?.filter(c => c.status === 'inactive').length || 0;

      // Fetch other stats
      const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      const { count: totalPlans } = await supabase.from('plans').select('*', { count: 'exact', head: true });
      const { count: totalConnections } = await supabase.from('whatsapps').select('*', { count: 'exact', head: true });
      const { count: totalTickets } = await supabase.from('tickets').select('*', { count: 'exact', head: true });
      const { count: totalContacts } = await supabase.from('contacts').select('*', { count: 'exact', head: true });
      const { count: totalMessages } = await supabase.from('messages').select('*', { count: 'exact', head: true });

      setStats({
        totalCompanies,
        activeCompanies,
        trialCompanies,
        inactiveCompanies,
        totalUsers: totalUsers || 0,
        totalPlans: totalPlans || 0,
        totalConnections: totalConnections || 0,
        totalTickets: totalTickets || 0,
        totalContacts: totalContacts || 0,
        totalMessages: totalMessages || 0,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar estatísticas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
}

export function useRecentCompanies() {
  const [companies, setCompanies] = useState<RecentCompany[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data } = await supabase
          .from('companies')
          .select('id, name, email, status, created_at, plan:plans(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        setCompanies(data || []);
      } catch (error) {
        console.error('Error fetching recent companies:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  return { companies, loading };
}

export function useRecentUsers() {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, created_at, company:companies(name)')
          .order('created_at', { ascending: false })
          .limit(5);

        setUsers(data || []);
      } catch (error) {
        console.error('Error fetching recent users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return { users, loading };
}

export function useCompanyStatusDistribution() {
  const [data, setData] = useState<{ name: string; value: number; fill: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: companies } = await supabase.from('companies').select('status');
        
        const active = companies?.filter(c => c.status === 'active').length || 0;
        const trial = companies?.filter(c => c.status === 'trial').length || 0;
        const inactive = companies?.filter(c => c.status === 'inactive').length || 0;

        setData([
          { name: 'Ativas', value: active, fill: 'hsl(var(--chart-1))' },
          { name: 'Trial', value: trial, fill: 'hsl(var(--chart-2))' },
          { name: 'Inativas', value: inactive, fill: 'hsl(var(--chart-3))' },
        ]);
      } catch (error) {
        console.error('Error fetching company distribution:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading };
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
  paid: number;
  pending: number;
  growth?: number;
  forecast?: number; // Forecasted value
  isForecast?: boolean;
}

export interface RevenueStats {
  currentMonth: number;
  previousMonth: number;
  growthPercentage: number;
  avgMonthly: number;
}

export interface RevenueForecast {
  nextMonth: number;
  next3Months: number;
  trend: 'up' | 'down' | 'stable';
  confidence: 'high' | 'medium' | 'low';
}

// Simple linear regression for trend forecasting
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  return { slope: isNaN(slope) ? 0 : slope, intercept: isNaN(intercept) ? 0 : intercept };
}

export function useMonthlyRevenue(months: number = 6) {
  const [data, setData] = useState<MonthlyRevenue[]>([]);
  const [forecast, setForecast] = useState<RevenueForecast>({
    nextMonth: 0,
    next3Months: 0,
    trend: 'stable',
    confidence: 'low',
  });
  const [stats, setStats] = useState<RevenueStats>({
    currentMonth: 0,
    previousMonth: 0,
    growthPercentage: 0,
    avgMonthly: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('value, status, created_at')
          .order('created_at', { ascending: true });

        if (!invoices) {
          setData([]);
          return;
        }

        // Group invoices by month
        const monthlyData: Record<string, { revenue: number; paid: number; pending: number }> = {};
        
        invoices.forEach((invoice) => {
          if (!invoice.created_at) return;
          
          const date = new Date(invoice.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { revenue: 0, paid: 0, pending: 0 };
          }
          
          const value = Number(invoice.value) || 0;
          monthlyData[monthKey].revenue += value;
          
          if (invoice.status === 'paid') {
            monthlyData[monthKey].paid += value;
          } else {
            monthlyData[monthKey].pending += value;
          }
        });

        // Get last N months
        const allMonths = Object.keys(monthlyData).sort().slice(-months);
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const chartData: MonthlyRevenue[] = allMonths.map((monthKey, index) => {
          const [year, month] = monthKey.split('-');
          const currentRevenue = monthlyData[monthKey].revenue;
          
          // Calculate MoM growth
          let growth: number | undefined;
          if (index > 0) {
            const prevMonthKey = allMonths[index - 1];
            const prevRevenue = monthlyData[prevMonthKey].revenue;
            if (prevRevenue > 0) {
              growth = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
            } else if (currentRevenue > 0) {
              growth = 100;
            }
          }
          
          return {
            month: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
            revenue: currentRevenue,
            paid: monthlyData[monthKey].paid,
            pending: monthlyData[monthKey].pending,
            growth,
            isForecast: false,
          };
        });

        // Calculate forecast using linear regression
        const revenueValues = chartData.map(d => d.revenue);
        const { slope, intercept } = linearRegression(revenueValues);
        const n = revenueValues.length;
        
        // Generate 3 months forecast
        const forecastMonths: MonthlyRevenue[] = [];
        if (allMonths.length > 0) {
          const lastMonthKey = allMonths[allMonths.length - 1];
          const [lastYear, lastMonth] = lastMonthKey.split('-').map(Number);
          
          for (let i = 1; i <= 3; i++) {
            let forecastMonth = lastMonth + i;
            let forecastYear = lastYear;
            if (forecastMonth > 12) {
              forecastMonth -= 12;
              forecastYear += 1;
            }
            
            const forecastValue = Math.max(0, intercept + slope * (n - 1 + i));
            
            forecastMonths.push({
              month: `${monthNames[forecastMonth - 1]}/${String(forecastYear).slice(2)}`,
              revenue: 0,
              paid: 0,
              pending: 0,
              forecast: forecastValue,
              isForecast: true,
            });
          }
        }

        // Calculate overall stats
        const currentMonthRevenue = chartData.length > 0 ? chartData[chartData.length - 1].revenue : 0;
        const previousMonthRevenue = chartData.length > 1 ? chartData[chartData.length - 2].revenue : 0;
        const totalRevenue = chartData.reduce((sum, m) => sum + m.revenue, 0);
        const avgMonthly = chartData.length > 0 ? totalRevenue / chartData.length : 0;
        
        let growthPercentage = 0;
        if (previousMonthRevenue > 0) {
          growthPercentage = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
        } else if (currentMonthRevenue > 0) {
          growthPercentage = 100;
        }

        // Determine trend and confidence
        const trend: 'up' | 'down' | 'stable' = slope > avgMonthly * 0.05 ? 'up' : slope < -avgMonthly * 0.05 ? 'down' : 'stable';
        const confidence: 'high' | 'medium' | 'low' = n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low';
        
        const nextMonthForecast = forecastMonths[0]?.forecast || 0;
        const next3MonthsForecast = forecastMonths.reduce((sum, m) => sum + (m.forecast || 0), 0);

        setForecast({
          nextMonth: nextMonthForecast,
          next3Months: next3MonthsForecast,
          trend,
          confidence,
        });

        setStats({
          currentMonth: currentMonthRevenue,
          previousMonth: previousMonthRevenue,
          growthPercentage,
          avgMonthly,
        });

        // Combine historical data with forecast
        setData([...chartData, ...forecastMonths]);
      } catch (error) {
        console.error('Error fetching monthly revenue:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [months]);

  return { data, stats, forecast, loading };
}
