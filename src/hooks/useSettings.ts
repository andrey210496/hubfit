import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Setting {
  id: string;
  key: string;
  value: string | null;
  company_id: string;
}

export function useSettings() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .order('key');

      if (error) throw error;
      setSettings(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getSetting = useCallback((key: string): string | null => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value ?? null;
  }, [settings]);

  const updateSetting = async (key: string, value: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const existingSetting = settings.find((s) => s.key === key);

      if (existingSetting) {
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key, value, company_id: profile.company_id });

        if (error) throw error;
      }

      setSettings((prev) =>
        prev.map((s) => (s.key === key ? { ...s, value } : s))
      );

      toast({ title: 'Configuração atualizada!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar configuração',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    fetchSettings,
    getSetting,
    updateSetting,
  };
}
