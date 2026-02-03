import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, addDays, startOfMonth, endOfMonth } from 'date-fns';

interface TodayMetrics {
  totalClasses: number;
  totalBooked: number;
  totalCapacity: number;
  occupancyRate: number;
  cancelledClasses: number;
}

interface WeekMetrics {
  totalClasses: number;
  avgOccupancy: number;
  peakDay: string;
  lowDay: string;
}

interface ClassSession {
  id: string;
  time: string;
  className: string;
  instructor: string;
  booked: number;
  capacity: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

interface InstructorSchedule {
  id: string;
  name: string;
  classesToday: number;
  classesThisWeek: number;
}

interface HourlyDistribution {
  hour: string;
  classes: number;
  bookings: number;
}

interface DailyOccupancy {
  day: string;
  date: string;
  classes: number;
  occupancy: number;
}

interface AgendaDashboardStats {
  today: TodayMetrics;
  week: WeekMetrics;
  todaySessions: ClassSession[];
  instructorSchedule: InstructorSchedule[];
  hourlyDistribution: HourlyDistribution[];
  weeklyOccupancy: DailyOccupancy[];
  popularClassTypes: Array<{ name: string; bookings: number; sessions: number }>;
}

export function useAgendaDashboardStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AgendaDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!profile?.company_id) return;
    setLoading(true);
    const companyId = profile.company_id;
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    const currentTime = format(today, 'HH:mm:ss');
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

      const totalBooked = activeTodaySessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
      const totalCapacity = activeTodaySessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const occupancyRate = totalCapacity > 0 ? Math.round((totalBooked / totalCapacity) * 100) : 0;

      // Map sessions with status
      const mappedSessions: ClassSession[] = activeTodaySessions.map(s => {
        let status: ClassSession['status'] = 'upcoming';
        if (s.start_time <= currentTime && s.end_time >= currentTime) {
          status = 'ongoing';
        } else if (s.end_time < currentTime) {
          status = 'completed';
        }
        return {
          id: s.id,
          time: `${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`,
          className: (s.class_type as any)?.name || 'Aula',
          instructor: (s.instructor as any)?.name || '-',
          booked: s.current_bookings || 0,
          capacity: s.max_capacity || 0,
          status,
        };
      });

      // Fetch week sessions
      const { data: sessionsWeek } = await supabase
        .from('class_sessions')
        .select(`
          id, 
          session_date,
          start_time,
          max_capacity, 
          current_bookings,
          is_cancelled,
          class_type:class_types(id, name),
          instructor:profiles(id, name)
        `)
        .eq('company_id', companyId)
        .gte('session_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('session_date', format(weekEnd, 'yyyy-MM-dd'))
        .eq('is_cancelled', false);

      const weekSessions = sessionsWeek || [];
      const weekTotalCapacity = weekSessions.reduce((sum, s) => sum + (s.max_capacity || 0), 0);
      const weekTotalBooked = weekSessions.reduce((sum, s) => sum + (s.current_bookings || 0), 0);
      const avgWeekOccupancy = weekTotalCapacity > 0 ? Math.round((weekTotalBooked / weekTotalCapacity) * 100) : 0;

      // Calculate daily stats
      const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const dailyStats = new Map<string, { classes: number; booked: number; capacity: number }>();
      
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        dailyStats.set(dayStr, { classes: 0, booked: 0, capacity: 0 });
      }

      weekSessions.forEach(s => {
        const existing = dailyStats.get(s.session_date);
        if (existing) {
          existing.classes++;
          existing.booked += s.current_bookings || 0;
          existing.capacity += s.max_capacity || 0;
        }
      });

      const weeklyOccupancy: DailyOccupancy[] = [];
      let peakDay = { day: '', occupancy: 0 };
      let lowDay = { day: '', occupancy: 100 };

      Array.from(dailyStats.entries()).forEach(([dateStr, data], idx) => {
        const occupancy = data.capacity > 0 ? Math.round((data.booked / data.capacity) * 100) : 0;
        const dayName = dayNames[idx];
        
        weeklyOccupancy.push({
          day: dayName,
          date: format(new Date(dateStr), 'dd/MM'),
          classes: data.classes,
          occupancy,
        });

        if (occupancy > peakDay.occupancy && data.classes > 0) {
          peakDay = { day: dayName, occupancy };
        }
        if (occupancy < lowDay.occupancy && data.classes > 0) {
          lowDay = { day: dayName, occupancy };
        }
      });

      // Instructor schedule
      const instructorMap = new Map<string, { id: string; name: string; classesToday: number; classesThisWeek: number }>();
      
      weekSessions.forEach(s => {
        const instructor = s.instructor as any;
        if (instructor?.id) {
          const existing = instructorMap.get(instructor.id);
          const isToday = s.session_date === todayStr;
          if (existing) {
            existing.classesThisWeek++;
            if (isToday) existing.classesToday++;
          } else {
            instructorMap.set(instructor.id, {
              id: instructor.id,
              name: instructor.name || '-',
              classesToday: isToday ? 1 : 0,
              classesThisWeek: 1,
            });
          }
        }
      });

      const instructorSchedule = Array.from(instructorMap.values())
        .sort((a, b) => b.classesThisWeek - a.classesThisWeek);

      // Hourly distribution
      const hourlyDistribution: HourlyDistribution[] = [];
      for (let h = 6; h <= 21; h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;
        const hourClasses = activeTodaySessions.filter(s => {
          const startHour = parseInt(s.start_time.split(':')[0]);
          return startHour === h;
        });
        hourlyDistribution.push({
          hour: hourStr,
          classes: hourClasses.length,
          bookings: hourClasses.reduce((sum, c) => sum + (c.current_bookings || 0), 0),
        });
      }

      // Popular class types
      const classTypeStats = new Map<string, { name: string; bookings: number; sessions: number }>();
      weekSessions.forEach(s => {
        const typeName = (s.class_type as any)?.name || 'Aula';
        const existing = classTypeStats.get(typeName);
        if (existing) {
          existing.sessions++;
          existing.bookings += s.current_bookings || 0;
        } else {
          classTypeStats.set(typeName, { name: typeName, sessions: 1, bookings: s.current_bookings || 0 });
        }
      });

      const popularClassTypes = Array.from(classTypeStats.values())
        .sort((a, b) => b.bookings - a.bookings)
        .slice(0, 5);

      setStats({
        today: {
          totalClasses: activeTodaySessions.length,
          totalBooked,
          totalCapacity,
          occupancyRate,
          cancelledClasses: cancelledToday,
        },
        week: {
          totalClasses: weekSessions.length,
          avgOccupancy: avgWeekOccupancy,
          peakDay: peakDay.day || '-',
          lowDay: lowDay.day || '-',
        },
        todaySessions: mappedSessions,
        instructorSchedule,
        hourlyDistribution,
        weeklyOccupancy,
        popularClassTypes,
      });
    } catch (error) {
      console.error('Error fetching agenda dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
