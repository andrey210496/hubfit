import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemberAuth } from './useMemberAuth';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, addDays } from 'date-fns';

export interface ClassSession {
  id: string;
  company_id: string;
  class_type_id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  current_bookings: number;
  is_cancelled: boolean;
  notes: string | null;
  class_type?: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    duration_minutes: number;
  };
}

export interface ClassBooking {
  id: string;
  class_session_id: string;
  member_id: string;
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show';
  booked_at: string;
  attended_at: string | null;
  cancelled_at: string | null;
  class_session?: ClassSession;
}

export function useMemberSchedule(daysAhead: number = 7) {
  const { memberProfile } = useMemberAuth();
  const queryClient = useQueryClient();

  // Fetch available sessions for the next X days
  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ['member-sessions', memberProfile?.company_id, daysAhead],
    queryFn: async () => {
      if (!memberProfile?.company_id) return [];
      
      const startDate = format(startOfDay(new Date()), 'yyyy-MM-dd');
      const endDate = format(endOfDay(addDays(new Date(), daysAhead)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('class_sessions')
        .select(`
          *,
          class_type:class_types(id, name, description, color, duration_minutes)
        `)
        .eq('company_id', memberProfile.company_id)
        .eq('is_cancelled', false)
        .gte('session_date', startDate)
        .lte('session_date', endDate)
        .order('session_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as ClassSession[];
    },
    enabled: !!memberProfile?.company_id,
  });

  // Fetch member's bookings
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['member-bookings', memberProfile?.member_id],
    queryFn: async () => {
      if (!memberProfile?.member_id) return [];

      const { data, error } = await supabase
        .from('class_bookings')
        .select(`
          *,
          class_session:class_sessions(
            *,
            class_type:class_types(id, name, description, color, duration_minutes)
          )
        `)
        .eq('member_id', memberProfile.member_id)
        .neq('status', 'cancelled')
        .order('booked_at', { ascending: false });

      if (error) throw error;
      return data as ClassBooking[];
    },
    enabled: !!memberProfile?.member_id,
  });

  // Book a session (check-in)
  const bookSession = useMutation({
    mutationFn: async (sessionId: string) => {
      if (!memberProfile?.member_id || !memberProfile?.company_id) {
        throw new Error('Perfil não encontrado');
      }

      // Check if already booked
      const existingBooking = bookings.find(
        b => b.class_session_id === sessionId && b.status !== 'cancelled'
      );
      if (existingBooking) {
        throw new Error('Você já está inscrito nesta aula');
      }

      // Check capacity
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.current_bookings >= session.max_capacity) {
        throw new Error('Esta aula está lotada');
      }

      const { data, error } = await supabase
        .from('class_bookings')
        .insert({
          class_session_id: sessionId,
          member_id: memberProfile.member_id,
          company_id: memberProfile.company_id,
          status: 'confirmed',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['member-sessions'] });
      toast.success('Check-in realizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cancel a booking
  const cancelBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from('class_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['member-sessions'] });
      toast.success('Reserva cancelada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao cancelar: ' + error.message);
    },
  });

  // Check if session is booked by member
  const isSessionBooked = (sessionId: string) => {
    return bookings.some(
      b => b.class_session_id === sessionId && b.status !== 'cancelled'
    );
  };

  // Get booking for session
  const getBookingForSession = (sessionId: string) => {
    return bookings.find(
      b => b.class_session_id === sessionId && b.status !== 'cancelled'
    );
  };

  return {
    sessions,
    bookings,
    isLoading: sessionsLoading || bookingsLoading,
    bookSession,
    cancelBooking,
    isSessionBooked,
    getBookingForSession,
  };
}
