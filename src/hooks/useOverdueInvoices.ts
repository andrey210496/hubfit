import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface OverdueInvoice {
  id: string;
  company_id: string;
  detail: string | null;
  value: number | null;
  due_date: string | null;
  created_at: string | null;
  days_overdue: number;
  company?: { 
    name: string; 
    email: string | null;
    phone: string | null;
  } | null;
}

export interface OverdueStats {
  total: number;
  totalValue: number;
  critical: number; // > 30 days
  warning: number;  // 15-30 days
  attention: number; // < 15 days
}

export function useOverdueInvoices() {
  const [invoices, setInvoices] = useState<OverdueInvoice[]>([]);
  const [stats, setStats] = useState<OverdueStats>({
    total: 0,
    totalValue: 0,
    critical: 0,
    warning: 0,
    attention: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOverdueInvoices = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('invoices')
        .select('*, company:companies(name, email, phone)')
        .neq('status', 'paid')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const overdueInvoices: OverdueInvoice[] = (data || []).map((inv) => {
        const dueDate = new Date(inv.due_date!);
        const todayDate = new Date();
        const diffTime = todayDate.getTime() - dueDate.getTime();
        const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...inv,
          days_overdue: daysOverdue,
        };
      });

      // Calculate stats
      const critical = overdueInvoices.filter(inv => inv.days_overdue > 30).length;
      const warning = overdueInvoices.filter(inv => inv.days_overdue > 15 && inv.days_overdue <= 30).length;
      const attention = overdueInvoices.filter(inv => inv.days_overdue <= 15).length;
      const totalValue = overdueInvoices.reduce((sum, inv) => sum + (inv.value || 0), 0);

      setStats({
        total: overdueInvoices.length,
        totalValue,
        critical,
        warning,
        attention,
      });

      setInvoices(overdueInvoices);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverdueInvoices();
  }, []);

  return { invoices, stats, loading, refetch: fetchOverdueInvoices };
}
