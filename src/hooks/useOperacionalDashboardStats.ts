import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays } from 'date-fns';

interface ClassMetrics {
  todayClasses: number;
  weekClasses: number;
  avgOccupancy: number;
  cancelledToday: number;
  mostPopularClass: string;
}

interface CheckinMetrics {
  todayCheckins: number;
  weekCheckins: number;
  avgDaily: number;
  peakHour: string;
  lateCheckins: number;
}

interface InstructorMetrics {
  totalInstructors: number;
  classesToday: Array<{ name: string; classes: number }>;
  avgClassesPerInstructor: number;
}

interface ClassByHour {
  hour: string;
  classes: number;
  checkins: number;
  capacity: number;
}

interface ClassByDay {
  day: string;
  classes: number;
  occupancy: number;
}

interface OperacionalDashboardStats {
  classes: ClassMetrics;
  checkins: CheckinMetrics;
  instructors: InstructorMetrics;
  classesByHour: ClassByHour[];
  classesByDay: ClassByDay[];
  upcomingClasses: Array<{
    id: string;
    name: string;
    time: string;
    instructor: string;
    booked: number;
    capacity: number;
  }>;
}

export function useOperacionalDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<OperacionalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

    try {
      // Fetch today's sessions
      const { data: sessionsToday } = await supabase
        .from('class_sessions')
        .select(`
          id, 
          start_time, 
          end_time,
          max_capacity, 
          current_bookings,
          is_cancelled,
          class_type:class_types(id, name),
          instructor:profiles(id, name)
        `)
        .eq('company_id', companyId)
        .eq('session_date', todayStr)
        .order('start_time');

      const todaySessions = sessionsToday || [];
      const activeTodaySessions = todaySessions.filter(s => !s.is_cancelled);
      const cancelledToday = todaySessions.filter(s => s.is_cancelled).length;

      // Fetch week sessions
      const { data: sessionsWeek } = await supabase
        .from('class_sessions')
        .select('id, session_date, max_capacity, current_bookings, is_cancelled, class_type:class_types(name)')
        .eq('company_id', companyId)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'));

      const weekSessions = (sessionsWeek || []).filter(s => !s.is_cancelled);

      // Calculate occupancy
      const totalCapacity = weekSessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const totalBooked = weekSessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
      const avgOccupancy = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

      // Most popular class
      const classTypeCounts = new Map<string, number>();
      weekSessions.forEach(s => {
        const typeName = (s.class_type as any)?.name || 'Aula';
        classTypeCounts.set(typeName, (classTypeCounts.get(typeName) || 0) + (s.current_bookings || 0));
      });
      let mostPopularClass = '-';
      let maxBookings = 0;
      classTypeCounts.forEach((count, name) => {
        if (count > maxBookings) {
          maxBookings = count;
          mostPopularClass = name;
        }
      });

      // Fetch check-ins today
      const { data: checkinsToday } = await supabase
        .from('access_logs')
        .select('id, checkin_at')
        .eq('company_id', companyId)
        .gte('checkin_at', `${todayStr}T00:00:00`)
        .lte('checkin_at', `${todayStr}T23:59:59`);

      // Fetch check-ins week
      const { data: checkinsWeek } = await supabase
        .from('access_logs')
        .select('id, checkin_at')
        .eq('company_id', companyId)
        .gte('checkin_at', format(weekStart, 'yyyy-MM-dd'))
        .lte('checkin_at', format(weekEnd, 'yyyy-MM-dd'));

      const todayCheckinsData = checkinsToday || [];
      const weekCheckinsData = checkinsWeek || [];
      const avgDaily = weekCheckinsData.length > 0 ? Math.round(weekCheckinsData.length / 7) : 0;

      // Calculate peak hour
      const hourCounts = new Map<number, number>();
      todayCheckinsData.forEach(log => {
        const hour = new Date(log.checkin_at).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      let peakHour = '18:00';
      let maxCheckins = 0;
      hourCounts.forEach((count, hour) => {
        if (count > maxCheckins) {
          maxCheckins = count;
          peakHour = `${hour.toString().padStart(2, '0')}:00`;
        }
      });

      // Classes by hour
      const classesByHour: ClassByHour[] = [];
      for (let h = 6; h <= 21; h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        const hourClasses = activeTodaySessions.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          return startHour === h;
        });
        const hourCheckins = todayCheckinsData.filter(log => {
          const logHour = new Date(log.checkin_at).getHours();
          return logHour === h;
        }).length;
        classesByHour.push({
          hour: hourStr,
          classes: hourClasses.length,
          checkins: hourCheckins,
          capacity: hourClasses.reduce((sum, c) => sum + (c.max_capacity || 0), 0),
        });
      }

      // Classes by day of week
      const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      const classesByDay: ClassByDay[] = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySessions = weekSessions.filter(s => s.session_date === dayStr);
        const dayCapacity = daySessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
        const dayBooked = daySessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
        classesByDay.push({
          day: dayNames[i],
          classes: daySessions.length,
          occupancy: dayCapacity > 0 ? Math.round((dayBooked / dayCapacity) * 100) : 0,
        });
      }

      // Upcoming classes (next 5)
      const now = format(today, 'HH:mm:ss');
      const upcomingClasses = activeTodaySessions
        .filter(s => s.start_time > now)
        .slice(0, 5)
        .map(s => ({
          id: s.id,
          name: (s.class_type as any)?.name || 'Aula',
          time: s.start_time.slice(0, 5),
          instructor: (s.instructor as any)?.name || '-',
          booked: s.current_bookings || 0,
          capacity: s.max_capacity || 0,
        }));

      // Instructors metrics
      const instructorMap = new Map<string, { name: string; classes: number }>();
      activeTodaySessions.forEach(s => {
        const instructor = s.instructor as any;
        if (instructor?.id) {
          const existing = instructorMap.get(instructor.id);
          if (existing) {
            existing.classes++;
          } else {
            instructorMap.set(instructor.id, { name: instructor.name || '-', classes: 1 });
          }
        }
      });
      const instructorList = Array.from(instructorMap.values());
      const avgClassesPerInstructor = instructorList.length > 0 
        ? Math.round(instructorList.reduce((sum, i) => sum + i.classes, 0) / instructorList.length * 10) / 10
        : 0;

      setStats({
        classes: {
          todayClasses: activeTodaySessions.length,
          weekClasses: weekSessions.length,
          avgOccupancy,
          cancelledToday,
          mostPopularClass,
        },
        checkins: {
          todayCheckins: todayCheckinsData.length,
          weekCheckins: weekCheckinsData.length,
          avgDaily,
          peakHour,
          lateCheckins: 0,
        },
        instructors: {
          totalInstructors: instructorList.length,
          classesToday: instructorList.slice(0, 5),
          avgClassesPerInstructor,
        },
        classesByHour,
        classesByDay,
        upcomingClasses,
      });
    } catch (error) {
      console.error('Error fetching operacional dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
