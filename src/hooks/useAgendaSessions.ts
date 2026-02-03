import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, subDays, startOfWeek, endOfWeek } from 'date-fns';

export interface SessionBooking {
  id: string;
  member_id: string | null;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  booked_at: string;
  attended_at: string | null;
  cancelled_at: string | null;
  is_trial?: boolean; // Flag para aulas experimentais
  member: {
    id: string;
    contact: {
      id: string;
      name: string;
      number: string;
      profile_pic_url: string | null;
    };
    fitness_plan: {
      id: string;
      name: string;
    } | null;
  } | null;
  // Para trial bookings sem member
  contact?: {
    id: string;
    name: string;
    number: string;
    profile_pic_url: string | null;
  };
}

export interface AgendaSession {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  is_cancelled: boolean;
  notes: string | null;
  class_type: {
    id: string;
    name: string;
    color: string;
    duration_minutes: number;
  };
  instructor: {
    id: string;
    name: string;
  } | null;
  bookings: SessionBooking[];
}

export function useAgendaSessions(selectedDate: Date) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch sessions for the selected date
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['agenda-sessions', profile?.company_id, format(selectedDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch regular class sessions with member bookings
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('class_sessions')
        .select(`
          *,
          class_type:class_types(id, name, color, duration_minutes),
          instructor:profiles(id, name),
          bookings:class_bookings(
            id,
            member_id,
            status,
            booked_at,
            attended_at,
            cancelled_at,
            member:members(
              id,
              contact:contacts(id, name, number, profile_pic_url),
              fitness_plan:fitness_plans(id, name)
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('session_date', dateStr)
        .order('start_time', { ascending: true });

      if (sessionsError) throw sessionsError;

      // Fetch trial class bookings for the same date
      const { data: trialBookings, error: trialError } = await supabase
        .from('trial_class_bookings')
        .select(`
          id,
          contact_id,
          class_session_id,
          status,
          created_at,
          contact:contacts(id, name, number, profile_pic_url)
        `)
        .eq('company_id', profile.company_id)
        .neq('status', 'cancelled');

      if (trialError) {
        console.error('Error fetching trial bookings:', trialError);
      }

      // Merge trial bookings into sessions
      return (sessionsData || []).map(session => {
        const regularBookings = (session.bookings || [])
          .filter((b: any) => b.status !== 'cancelled')
          .map((b: any) => ({ ...b, is_trial: false }));

        // Find trial bookings for this session
        const sessionTrialBookings = (trialBookings || [])
          .filter((tb: any) => tb.class_session_id === session.id)
          .map((tb: any) => ({
            id: tb.id,
            member_id: null,
            status: tb.status as 'confirmed' | 'cancelled' | 'attended' | 'no_show',
            booked_at: tb.created_at,
            attended_at: null,
            cancelled_at: null,
            is_trial: true,
            member: null,
            contact: tb.contact,
          }));

        return {
          ...session,
          bookings: [...regularBookings, ...sessionTrialBookings],
        };
      }) as AgendaSession[];
    },
    enabled: !!profile?.company_id,
  });

  // Fetch sessions for a date range (for calendar view)
  const fetchSessionsRange = async (startDate: Date, endDate: Date) => {
    if (!profile?.company_id) return [];

    const { data, error } = await supabase
      .from('class_sessions')
      .select(`
        id,
        session_date,
        start_time,
        current_bookings,
        max_capacity,
        is_cancelled,
        class_type:class_types(id, name, color)
      `)
      .eq('company_id', profile.company_id)
      .gte('session_date', format(startDate, 'yyyy-MM-dd'))
      .lte('session_date', format(endDate, 'yyyy-MM-dd'))
      .order('session_date')
      .order('start_time');

    if (error) throw error;
    return data || [];
  };

  // Mark booking as attended
  const markAttended = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('class_bookings')
        .update({
          status: 'attended',
          attended_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-sessions'] });
      toast.success('Presença confirmada!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao confirmar presença: ' + error.message);
    },
  });

  // Mark booking as no-show
  const markNoShow = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('class_bookings')
        .update({
          status: 'no_show',
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-sessions'] });
      toast.success('Marcado como falta');
    },
    onError: (error: Error) => {
      toast.error('Erro ao marcar falta: ' + error.message);
    },
  });

  // Cancel a session
  const cancelSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase
        .from('class_sessions')
        .update({
          is_cancelled: true,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda-sessions'] });
      toast.success('Sessão cancelada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar sessão: ' + error.message);
    },
  });

  return {
    sessions,
    isLoading,
    refetch,
    fetchSessionsRange,
    markAttended,
    markNoShow,
    cancelSession,
  };
}
