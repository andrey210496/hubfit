import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface KnowledgeBaseEntry {
  id: string;
  company_id: string;
  agent_id: string | null;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  is_active: boolean;
  priority: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateKnowledgeBaseEntry {
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  agent_id?: string | null;
  priority?: number;
}

export function useKnowledgeBase(agentId?: string) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEntries = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      let query = supabase
        .from("knowledge_base" as any)
        .select("*")
        .eq("company_id", profile.company_id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      // Filter by agent if provided
      if (agentId) {
        query = query.or(`agent_id.eq.${agentId},agent_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching knowledge base:", error);
        setEntries([]);
        return;
      }

      setEntries((data || []) as unknown as KnowledgeBaseEntry[]);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id, agentId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const createEntry = async (entry: CreateKnowledgeBaseEntry) => {
    if (!profile?.company_id || !profile?.user_id) {
      toast.error("Usuário não autenticado");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("knowledge_base" as any)
        .insert({
          ...entry,
          company_id: profile.company_id,
          created_by: profile.user_id,
          tags: entry.tags || [],
          priority: entry.priority || 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Entrada adicionada!");
      await fetchEntries();
      return data;
    } catch (error: any) {
      console.error("Error creating entry:", error);
      toast.error(error.message || "Erro ao criar entrada");
      return null;
    }
  };

  const updateEntry = async (id: string, updates: Partial<CreateKnowledgeBaseEntry>) => {
    try {
      const { error } = await supabase
        .from("knowledge_base" as any)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Entrada atualizada!");
      await fetchEntries();
      return true;
    } catch (error: any) {
      console.error("Error updating entry:", error);
      toast.error(error.message || "Erro ao atualizar entrada");
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("knowledge_base" as any)
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Entrada removida!");
      await fetchEntries();
      return true;
    } catch (error: any) {
      console.error("Error deleting entry:", error);
      toast.error(error.message || "Erro ao remover entrada");
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("knowledge_base" as any)
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      await fetchEntries();
      return true;
    } catch (error: any) {
      console.error("Error toggling entry:", error);
      toast.error(error.message || "Erro ao alterar status");
      return false;
    }
  };

  return {
    entries,
    loading,
    refetch: fetchEntries,
    createEntry,
    updateEntry,
    deleteEntry,
    toggleActive,
  };
}
