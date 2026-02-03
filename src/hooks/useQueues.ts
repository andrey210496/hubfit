import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

export type Queue = Tables<'queues'>;

export interface QueueFormData {
  name: string;
  color: string;
  greeting_message?: string;
  out_of_hours_message?: string;
  order_queue?: number | null;
  schedules?: any;
  integration_id?: string | null;
  prompt_id?: string | null;
  ai_agent_id?: string | null;
}

export function useQueues() {
  const { profile } = useAuth();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQueues = useCallback(async () => {
    if (!profile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('queues')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('order_queue', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setQueues(data || []);
    } catch (error: any) {
      console.error('Error fetching queues:', error);
      toast.error('Erro ao carregar filas');
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  const createQueue = async (queueData: QueueFormData) => {
    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('queues')
        .insert({
          ...queueData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      
      setQueues(prev => [...prev, data]);
      toast.success('Fila criada com sucesso');
      return data;
    } catch (error: any) {
      console.error('Error creating queue:', error);
      toast.error(error.message || 'Erro ao criar fila');
      return null;
    }
  };

  const updateQueue = async (queueId: string, queueData: Partial<QueueFormData>) => {
    try {
      const { data, error } = await supabase
        .from('queues')
        .update(queueData)
        .eq('id', queueId)
        .select()
        .single();

      if (error) throw error;
      
      setQueues(prev => prev.map(q => q.id === queueId ? data : q));
      toast.success('Fila atualizada com sucesso');
      return data;
    } catch (error: any) {
      console.error('Error updating queue:', error);
      toast.error(error.message || 'Erro ao atualizar fila');
      return null;
    }
  };

  const deleteQueue = async (queueId: string) => {
    try {
      const { error } = await supabase
        .from('queues')
        .delete()
        .eq('id', queueId);

      if (error) throw error;
      
      setQueues(prev => prev.filter(q => q.id !== queueId));
      toast.success('Fila excluída com sucesso');
      return true;
    } catch (error: any) {
      console.error('Error deleting queue:', error);
      toast.error(error.message || 'Erro ao excluir fila');
      return false;
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  // Real-time subscription
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('queues-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queues',
          filter: `company_id=eq.${profile.company_id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setQueues(prev => {
              const exists = prev.some(q => q.id === (payload.new as Queue).id);
              if (exists) return prev;
              return [...prev, payload.new as Queue];
            });
          } else if (payload.eventType === 'UPDATE') {
            setQueues(prev => prev.map(q => 
              q.id === (payload.new as Queue).id ? payload.new as Queue : q
            ));
          } else if (payload.eventType === 'DELETE') {
            setQueues(prev => prev.filter(q => q.id !== (payload.old as { id: string }).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  return {
    queues,
    loading,
    createQueue,
    updateQueue,
    deleteQueue,
    refetch: fetchQueues,
  };
}
