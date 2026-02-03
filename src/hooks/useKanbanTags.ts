import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface KanbanTag {
  id: string;
  name: string;
  color: string;
  kanban_order: number;
}

export function useKanbanTags() {
  const { profile } = useAuth();
  const [tags, setTags] = useState<KanbanTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKanbanTags = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tags')
        .select('id, name, color, kanban_order')
        .eq('company_id', profile.company_id)
        .eq('kanban', 1)
        .order('kanban_order', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setTags((data || []).map(tag => ({
        ...tag,
        kanban_order: tag.kanban_order ?? 0,
      })));
    } catch (error) {
      console.error('Error fetching kanban tags:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchKanbanTags();
  }, [fetchKanbanTags]);

  return {
    tags,
    loading,
    refetch: fetchKanbanTags,
  };
}
