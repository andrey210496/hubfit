import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Schedule {
  weekday: string;
  weekdayEn: string;
  startTime: string;
  endTime: string;
  enabled: boolean;
}

const defaultSchedules: Schedule[] = [
  { weekday: 'Segunda-feira', weekdayEn: 'monday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Terça-feira', weekdayEn: 'tuesday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Quarta-feira', weekdayEn: 'wednesday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Quinta-feira', weekdayEn: 'thursday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Sexta-feira', weekdayEn: 'friday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Sábado', weekdayEn: 'saturday', startTime: '08:00', endTime: '12:00', enabled: false },
  { weekday: 'Domingo', weekdayEn: 'sunday', startTime: '00:00', endTime: '00:00', enabled: false },
];

export function useCompanySchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(defaultSchedules);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data: company, error } = await supabase
        .from('companies')
        .select('schedules')
        .eq('id', profile.company_id)
        .single();

      if (error) throw error;

      if (company?.schedules && Array.isArray(company.schedules)) {
        setSchedules(company.schedules as unknown as Schedule[]);
      }
    } catch (error: any) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSchedules = async (newSchedules: Schedule[]) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('companies')
        .update({ schedules: newSchedules as any })
        .eq('id', profile.company_id);

      if (error) throw error;

      setSchedules(newSchedules);
      toast({ title: 'Horários atualizados!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar horários',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  return {
    schedules,
    loading,
    fetchSchedules,
    updateSchedules,
    setSchedules,
  };
}
