import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DashboardStats {
  tickets: {
    total: number;
    open: number;
    pending: number;
    closed: number;
    today: number;
  };
  campaigns: {
    total: number;
    running: number;
    completed: number;
    scheduled: number;
  };
  contacts: {
    total: number;
    today: number;
  };
  messages: {
    total: number;
    today: number;
    sent: number;
    received: number;
  };
  connections: {
    total: number;
    connected: number;
  };
  users: {
    total: number;
    online: number;
  };
}

export interface TicketsByDay {
  date: string;
  open: number;
  closed: number;
}

export interface CampaignShipping {
  date: string;
  sent: number;
  delivered: number;
}

export function useDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [ticketsByDay, setTicketsByDay] = useState<TicketsByDay[]>([]);
  const [campaignShippings, setCampaignShippings] = useState<CampaignShipping[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();
      const companyId = profile.company_id;

      // Fetch tickets stats (filtered by company, excluding groups)
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, status, created_at')
        .eq('company_id', companyId)
        .eq('is_group', false);
      const ticketStats = {
        total: tickets?.length || 0,
        open: tickets?.filter(t => t.status === 'open').length || 0,
        pending: tickets?.filter(t => t.status === 'pending').length || 0,
        closed: tickets?.filter(t => t.status === 'closed').length || 0,
        today: tickets?.filter(t => new Date(t.created_at!) >= today).length || 0,
      };

      // Fetch campaigns stats (filtered by company)
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, status')
        .eq('company_id', companyId);
      const campaignStats = {
        total: campaigns?.length || 0,
        running: campaigns?.filter(c => c.status === 'running').length || 0,
        completed: campaigns?.filter(c => c.status === 'completed').length || 0,
        scheduled: campaigns?.filter(c => c.status === 'scheduled').length || 0,
      };

      // Fetch contacts stats (filtered by company, excluding groups)
      const { count: totalContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_group', false);
      const { count: todayContacts } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_group', false)
        .gte('created_at', todayISO);

      // Fetch messages stats (filtered by company)
      const { data: messages } = await supabase
        .from('messages')
        .select('id, from_me, created_at')
        .eq('company_id', companyId);
      const messageStats = {
        total: messages?.length || 0,
        today: messages?.filter(m => new Date(m.created_at!) >= today).length || 0,
        sent: messages?.filter(m => m.from_me).length || 0,
        received: messages?.filter(m => !m.from_me).length || 0,
      };

      // Fetch connections stats (filtered by company)
      const { data: connections } = await supabase
        .from('whatsapps')
        .select('id, status')
        .eq('company_id', companyId);
      const connectionStats = {
        total: connections?.length || 0,
        connected: connections?.filter(c => c.status === 'CONNECTED').length || 0,
      };

      // Fetch users stats (filtered by company)
      const { data: userProfiles } = await supabase
        .from('profiles')
        .select('id, online')
        .eq('company_id', companyId);
      const userStats = {
        total: userProfiles?.length || 0,
        online: userProfiles?.filter(p => p.online).length || 0,
      };

      setStats({
        tickets: ticketStats,
        campaigns: campaignStats,
        contacts: { total: totalContacts || 0, today: todayContacts || 0 },
        messages: messageStats,
        connections: connectionStats,
        users: userStats,
      });

      // Fetch tickets by day (last 7 days)
      const last7Days: TicketsByDay[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayTickets = tickets?.filter(t => {
          const ticketDate = new Date(t.created_at!);
          return ticketDate >= date && ticketDate < nextDate;
        }) || [];

        last7Days.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          open: dayTickets.filter(t => t.status === 'open').length,
          closed: dayTickets.filter(t => t.status === 'closed').length,
        });
      }
      setTicketsByDay(last7Days);

      // Fetch campaign shippings by day
      const { data: shippings } = await supabase
        .from('campaign_shippings')
        .select('id, created_at, delivery_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const shippingsByDay: CampaignShipping[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayShippings = shippings?.filter(s => {
          const shippingDate = new Date(s.created_at!);
          return shippingDate >= date && shippingDate < nextDate;
        }) || [];

        shippingsByDay.push({
          date: date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
          sent: dayShippings.length,
          delivered: dayShippings.filter(s => s.delivery_at).length,
        });
      }
      setCampaignShippings(shippingsByDay);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [profile?.company_id]);

  return { stats, ticketsByDay, campaignShippings, loading, refetch: fetchStats };
}
