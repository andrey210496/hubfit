import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Announcement {
  id: string;
  title: string;
  text: string;
  priority: number | null;
  status: boolean | null;
  media_path: string | null;
  media_name: string | null;
  company_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AnnouncementFormData {
  title: string;
  text: string;
  priority: number;
  status: boolean;
  media_path?: string | null;
  media_name?: string | null;
}

export function useAnnouncements(companyId?: string) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('announcements')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      toast({
        title: 'Erro ao carregar anúncios',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [companyId, toast]);

  const createAnnouncement = async (data: AnnouncementFormData, targetCompanyId: string) => {
    try {
      const { error } = await supabase.from('announcements').insert({
        ...data,
        company_id: targetCompanyId,
      });

      if (error) throw error;

      toast({
        title: 'Anúncio criado',
        description: 'O anúncio foi criado com sucesso.',
      });
      
      await fetchAnnouncements();
      return true;
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      toast({
        title: 'Erro ao criar anúncio',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateAnnouncement = async (id: string, data: Partial<AnnouncementFormData>) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Anúncio atualizado',
        description: 'O anúncio foi atualizado com sucesso.',
      });
      
      await fetchAnnouncements();
      return true;
    } catch (error: any) {
      console.error('Error updating announcement:', error);
      toast({
        title: 'Erro ao atualizar anúncio',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Anúncio excluído',
        description: 'O anúncio foi excluído com sucesso.',
      });
      
      await fetchAnnouncements();
      return true;
    } catch (error: any) {
      console.error('Error deleting announcement:', error);
      toast({
        title: 'Erro ao excluir anúncio',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    return updateAnnouncement(id, { status: !currentStatus });
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  return {
    announcements,
    loading,
    fetchAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    toggleStatus,
  };
}

// Hook for public announcements (login page)
export function usePublicAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPublicAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from('announcements')
          .select('*')
          .eq('status', true)
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (error) {
        console.error('Error fetching public announcements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPublicAnnouncements();
  }, []);

  return { announcements, loading };
}
