import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface QuickMessage {
  id: string;
  shortcut: string;
  message: string;
  media_name: string | null;
  media_path: string | null;
  company_id: string;
  user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuickMessageFormData {
  shortcut: string;
  message: string;
}

export function useQuickMessages() {
  const { profile, user } = useAuth();
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchQuickMessages = useCallback(async (searchTerm?: string) => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('quick_messages')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`shortcut.ilike.%${searchTerm}%,message.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setQuickMessages(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar respostas rápidas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, toast]);

  const createQuickMessage = async (formData: QuickMessageFormData) => {
    if (!profile?.company_id || !user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('quick_messages')
        .insert({
          shortcut: formData.shortcut,
          message: formData.message,
          company_id: profile.company_id,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: 'Resposta rápida criada',
        description: 'Resposta rápida criada com sucesso.',
      });

      await fetchQuickMessages();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar resposta rápida',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateQuickMessage = async (id: string, formData: QuickMessageFormData) => {
    try {
      const { error } = await supabase
        .from('quick_messages')
        .update({
          shortcut: formData.shortcut,
          message: formData.message,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Resposta rápida atualizada',
        description: 'Resposta rápida atualizada com sucesso.',
      });

      await fetchQuickMessages();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar resposta rápida',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteQuickMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Resposta rápida excluída',
        description: 'Resposta rápida excluída com sucesso.',
      });

      await fetchQuickMessages();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir resposta rápida',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchQuickMessages();

    if (!profile?.company_id) return;

    const channel = supabase
      .channel('quick_messages_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quick_messages',
          filter: `company_id=eq.${profile.company_id}`,
        },
        () => {
          fetchQuickMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchQuickMessages, profile?.company_id]);

  return {
    quickMessages,
    loading,
    fetchQuickMessages,
    createQuickMessage,
    updateQuickMessage,
    deleteQuickMessage,
  };
}
