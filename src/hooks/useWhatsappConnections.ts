import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WhatsappConnection {
  id: string;
  name: string;
  status: string;
  instance_id: string | null;
  is_default: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  provider: string | null;
  phone_number_id: string | null;
}

/**
 * Hook simplificado para listar conexões WhatsApp existentes.
 * A gestão de conexões (criar, conectar, desconectar) será feita via NotificaMe Hub.
 */
export function useWhatsappConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<WhatsappConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapps')
        .select('id, name, status, instance_id, is_default, created_at, updated_at, provider, phone_number_id')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConnections();

      // Subscribe to realtime changes
      const channel = supabase
        .channel('whatsapps-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'whatsapps' },
          () => fetchConnections()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    connections,
    loading,
    refetch: fetchConnections,
  };
}
