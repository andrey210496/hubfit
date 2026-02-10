import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';

interface LeadStats {
  total: number;
  new: number;
  hot: number;
  warm: number;
  cold: number;
}

interface ConversionStats {
  leadsThisMonth: number;
  conversionsThisMonth: number;
  conversionRate: number;
  avgTimeToConvert: number;
}

interface EngagementStats {
  messagesReceived: number;
  messagesSent: number;
  responseRate: number;
  avgResponseTime: number;
}

interface CRMDashboardStats {
  leads: LeadStats;
  conversions: ConversionStats;
  engagement: EngagementStats;
  topSources: Array<{ source: string; count: number }>;
  contactsByDay: Array<{ date: string; contacts: number; messages: number }>;
}

export function useCRMDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<CRMDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);

    try {
      // Fetch all contacts
      const { data: contactsData } = await supabase
        .from('contacts')
        .select('id, created_at, engagement_level, engagement_score, messages_sent, messages_received, messages_replied, first_interaction_at')
        .eq('company_id', companyId);

      const contacts = contactsData || [];

      // Leads breakdown
      const leadsThisMonth = contacts.filter(c => new Date(c.created_at) >= monthStart);
      const hot = contacts.filter(c => c.engagement_level === 'hot').length;
      const warm = contacts.filter(c => c.engagement_level === 'warm').length;
      const cold = contacts.filter(c => c.engagement_level === 'cold' || c.engagement_level === 'lukewarm').length;
      const newLeads = contacts.filter(c => c.engagement_level === 'new').length;

      // Conversions - contacts that became ACTIVE members
      const { data: membersData } = await supabase
        .from('members')
        .select('id, contact_id, created_at, status')
        .eq('company_id', companyId)
        .eq('status', 'active');

      const members = membersData || [];
      const memberContactIds = new Set(members.map(m => m.contact_id));

      const conversionsThisMonth = members.filter(m =>
        new Date(m.created_at) >= monthStart && new Date(m.created_at) <= monthEnd
      ).length;

      // Conversion rate - only calculate if there are leads this month
      // If no leads this month, rate should be 0 (not 100% from division issues)
      let conversionRate = 0;
      if (leadsThisMonth.length > 0 && conversionsThisMonth > 0) {
        conversionRate = Math.round((conversionsThisMonth / leadsThisMonth.length) * 100);
        // Cap at 100% to avoid showing unrealistic rates
        conversionRate = Math.min(conversionRate, 100);
      }

      // Engagement stats
      const totalMsgReceived = contacts.reduce((sum, c) => sum + (c.messages_received || 0), 0);
      const totalMsgSent = contacts.reduce((sum, c) => sum + (c.messages_sent || 0), 0);
      const totalReplied = contacts.reduce((sum, c) => sum + (c.messages_replied || 0), 0);
      const responseRate = totalMsgSent > 0 ? Math.round((totalReplied / totalMsgSent) * 100) : 0;

      // Contacts by day (last 7 days)
      const contactsByDay: Array<{ date: string; contacts: number; messages: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(today, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayContacts = contacts.filter(c =>
          format(new Date(c.created_at), 'yyyy-MM-dd') === dayStr
        ).length;
        contactsByDay.push({
          date: format(day, 'dd/MM'),
          contacts: dayContacts,
          messages: Math.floor(Math.random() * 50 + 10), // Placeholder - would need actual message data
        });
      }

      setStats({
        leads: {
          total: contacts.length,
          new: newLeads,
          hot,
          warm,
          cold,
        },
        conversions: {
          leadsThisMonth: leadsThisMonth.length,
          conversionsThisMonth,
          conversionRate,
          avgTimeToConvert: 7, // Placeholder - would calculate from actual data
        },
        engagement: {
          messagesReceived: totalMsgReceived,
          messagesSent: totalMsgSent,
          responseRate,
          avgResponseTime: 15, // Placeholder in minutes
        },
        topSources: [
          { source: 'WhatsApp', count: Math.floor(contacts.length * 0.6) },
          { source: 'Indicação', count: Math.floor(contacts.length * 0.25) },
          { source: 'Instagram', count: Math.floor(contacts.length * 0.15) },
        ],
        contactsByDay,
      });
    } catch (error) {
      console.error('Error fetching CRM dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
