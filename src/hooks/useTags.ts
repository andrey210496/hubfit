import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type Tag = Tables<'tags'>;

export interface TagFormData {
  name: string;
  color: string;
  kanban?: number | null;
  kanban_order?: number | null;
  campaign_identifier?: string | null;
  meta_pixel_id?: string | null;
  meta_access_token?: string | null;
}

export function useTags() {
  const { profile } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = async (searchParam?: string) => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('tags')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name', { ascending: true });

      if (searchParam) {
        query = query.ilike('name', `%${searchParam}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTags(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tags:', error);
      toast.error('Erro ao carregar tags');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async (data: TagFormData) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) {
        throw new Error('Empresa não encontrada');
      }

      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name: data.name,
          color: data.color,
          kanban: data.kanban || null,
          kanban_order: data.kanban_order ?? 0,
          campaign_identifier: data.campaign_identifier || null,
          meta_pixel_id: data.meta_pixel_id || null,
          meta_access_token: data.meta_access_token || null,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Tag criada com sucesso');
      await fetchTags();
      return tag;
    } catch (error: any) {
      console.error('Erro ao criar tag:', error);
      toast.error('Erro ao criar tag');
      throw error;
    }
  };

  const updateTag = async (tagId: string, data: TagFormData) => {
    try {
      const { error } = await supabase
        .from('tags')
        .update({
          name: data.name,
          color: data.color,
          kanban: data.kanban || null,
          kanban_order: data.kanban_order ?? 0,
          campaign_identifier: data.campaign_identifier || null,
          meta_pixel_id: data.meta_pixel_id || null,
          meta_access_token: data.meta_access_token || null,
        })
        .eq('id', tagId);

      if (error) throw error;
      toast.success('Tag atualizada com sucesso');
      await fetchTags();
    } catch (error: any) {
      console.error('Erro ao atualizar tag:', error);
      toast.error('Erro ao atualizar tag');
      throw error;
    }
  };

  const deleteTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) throw error;
      toast.success('Tag excluída com sucesso');
      await fetchTags();
    } catch (error: any) {
      console.error('Erro ao excluir tag:', error);
      toast.error('Erro ao excluir tag');
      throw error;
    }
  };

  useEffect(() => {
    fetchTags();

    if (!profile?.company_id) return;

    const channel = supabase
      .channel('tags-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'tags',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          fetchTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
  };
}
