import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  is_active: boolean;
  headers: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string | null;
  company_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_status: number | null;
  response_body: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export const WEBHOOK_EVENTS = [
  { value: 'message.received', label: 'Mensagem Recebida' },
  { value: 'message.sent', label: 'Mensagem Enviada' },
  { value: 'ticket.created', label: 'Ticket Criado' },
  { value: 'ticket.updated', label: 'Ticket Atualizado' },
  { value: 'ticket.closed', label: 'Ticket Fechado' },
  { value: 'contact.created', label: 'Contato Criado' },
  { value: 'contact.updated', label: 'Contato Atualizado' },
  { value: 'campaign.started', label: 'Campanha Iniciada' },
  { value: 'campaign.completed', label: 'Campanha Concluída' },
  { value: 'whatsapp.connected', label: 'WhatsApp Conectado' },
  { value: 'whatsapp.disconnected', label: 'WhatsApp Desconectado' },
  { value: 'external.*', label: 'Webhooks Externos' },
];

export function useWebhooks() {
  const { profile } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    if (!profile?.company_id) return;

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhooks((data as unknown as Webhook[]) || []);
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      toast.error('Erro ao carregar webhooks');
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  const fetchLogs = useCallback(async (webhookId?: string, limit = 50) => {
    if (!profile?.company_id) return;

    setLogsLoading(true);
    try {
      let query = supabase
        .from('webhook_logs')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (webhookId) {
        query = query.eq('webhook_id', webhookId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs((data as unknown as WebhookLog[]) || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
      toast.error('Erro ao carregar logs');
    } finally {
      setLogsLoading(false);
    }
  }, [profile?.company_id]);

  const createWebhook = async (webhook: Omit<Webhook, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
    if (!profile?.company_id) return null;

    try {
      const { data, error } = await supabase
        .from('webhooks')
        .insert({
          ...webhook,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Webhook criado com sucesso');
      await fetchWebhooks();
      return data;
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast.error('Erro ao criar webhook');
      return null;
    }
  };

  const updateWebhook = async (id: string, updates: Partial<Webhook>) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Webhook atualizado com sucesso');
      await fetchWebhooks();
      return true;
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast.error('Erro ao atualizar webhook');
      return false;
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhooks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Webhook excluído com sucesso');
      await fetchWebhooks();
      return true;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast.error('Erro ao excluir webhook');
      return false;
    }
  };

  const testWebhook = async (webhook: Webhook) => {
    try {
      const { data, error } = await supabase.functions.invoke('webhook-dispatcher', {
        body: {
          companyId: webhook.company_id,
          eventType: 'test',
          data: {
            message: 'Test webhook from CodaChat',
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (error) throw error;
      toast.success('Webhook de teste enviado');
      await fetchLogs(webhook.id);
      return true;
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast.error('Erro ao testar webhook');
      return false;
    }
  };

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Subscribe to realtime updates for logs
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('webhook_logs_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_logs',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          setLogs((prev) => [payload.new as WebhookLog, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  return {
    webhooks,
    logs,
    loading,
    logsLoading,
    fetchWebhooks,
    fetchLogs,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
  };
}
