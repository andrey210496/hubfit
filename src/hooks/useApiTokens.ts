import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ApiToken {
  id: string;
  company_id: string;
  name: string;
  token: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiLog {
  id: string;
  company_id: string;
  api_token_id: string | null;
  endpoint: string;
  method: string;
  request_body: Record<string, unknown> | null;
  response_status: number | null;
  response_body: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  duration_ms: number | null;
  created_at: string;
}

export const API_PERMISSIONS = [
  { value: 'contacts:read', label: 'Ler contatos' },
  { value: 'contacts:write', label: 'Criar/editar contatos' },
  { value: 'tickets:read', label: 'Ler tickets' },
  { value: 'tickets:write', label: 'Criar/editar tickets' },
  { value: 'messages:read', label: 'Ler mensagens' },
  { value: 'messages:write', label: 'Enviar mensagens' },
  { value: 'queues:read', label: 'Ler filas' },
  { value: 'tags:read', label: 'Ler tags' },
  { value: 'whatsapps:read', label: 'Ler conexões WhatsApp' },
] as const;

const generateToken = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'cdc_';
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
};

export function useApiTokens() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const { toast } = useToast();

  const fetchTokens = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cast the data to our ApiToken type
      setTokens((data || []) as unknown as ApiToken[]);
    } catch (error) {
      console.error('Error fetching API tokens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os tokens',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(async (tokenId?: string) => {
    try {
      setLogsLoading(true);
      let query = supabase
        .from('api_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (tokenId) {
        query = query.eq('api_token_id', tokenId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Cast the data to our ApiLog type
      setLogs((data || []) as unknown as ApiLog[]);
    } catch (error) {
      console.error('Error fetching API logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs',
        variant: 'destructive',
      });
    } finally {
      setLogsLoading(false);
    }
  }, [toast]);

  const createToken = useCallback(async (
    name: string,
    permissions: string[],
    expiresAt?: string
  ): Promise<ApiToken | null> => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) {
        throw new Error('Company not found');
      }

      const token = generateToken();

      const { data, error } = await supabase
        .from('api_tokens')
        .insert({
          company_id: profile.company_id,
          name,
          token,
          permissions,
          expires_at: expiresAt || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Token criado',
        description: 'O token foi criado com sucesso. Copie-o agora, pois não será exibido novamente.',
      });

      await fetchTokens();
      return data as unknown as ApiToken;
    } catch (error) {
      console.error('Error creating API token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o token',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchTokens]);

  const updateToken = useCallback(async (
    id: string,
    updates: { name?: string; permissions?: string[]; is_active?: boolean; expires_at?: string | null }
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Token atualizado',
        description: 'As alterações foram salvas',
      });

      await fetchTokens();
      return true;
    } catch (error) {
      console.error('Error updating API token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o token',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchTokens]);

  const deleteToken = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('api_tokens')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Token excluído',
        description: 'O token foi removido',
      });

      await fetchTokens();
      return true;
    } catch (error) {
      console.error('Error deleting API token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o token',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast, fetchTokens]);

  const regenerateToken = useCallback(async (id: string): Promise<string | null> => {
    try {
      const newToken = generateToken();

      const { error } = await supabase
        .from('api_tokens')
        .update({ token: newToken })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Token regenerado',
        description: 'Copie o novo token agora, pois não será exibido novamente.',
      });

      await fetchTokens();
      return newToken;
    } catch (error) {
      console.error('Error regenerating API token:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível regenerar o token',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast, fetchTokens]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  return {
    tokens,
    logs,
    loading,
    logsLoading,
    fetchTokens,
    fetchLogs,
    createToken,
    updateToken,
    deleteToken,
    regenerateToken,
  };
}
