import { motion } from 'framer-motion';
import { Calendar, Clock, Users, TrendingUp, User } from 'lucide-react';
import { useAgendaDashboardStats } from '@/hooks/useAgendaDashboardStats';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function AgendaDashboard() {
  const { stats, loading } = useAgendaDashboardStats();

  if (loading || !stats) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Aulas Hoje</span></div>
          <p className="text-2xl font-bold">{stats.today.totalClasses}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Agendados</span></div>
          <p className="text-2xl font-bold">{stats.today.totalBooked}/{stats.today.totalCapacity}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Ocupação</span></div>
          <p className="text-2xl font-bold">{stats.today.occupancyRate}%</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-cyan-500" /><span className="text-xs text-muted-foreground">Dia Pico</span></div>
          <p className="text-xl font-bold">{stats.week.peakDay}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><User className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Instrutores</span></div>
          <p className="text-2xl font-bold">{stats.instructorSchedule.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Ocupação Semanal</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.weeklyOccupancy}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="day" fontSize={10} /><YAxis fontSize={10} /><Tooltip />
                <Bar dataKey="occupancy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Aulas de Hoje</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {stats.todaySessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <div><p className="text-sm font-medium">{s.className}</p><p className="text-xs text-muted-foreground">{s.time} • {s.instructor}</p></div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", s.status === 'ongoing' ? "bg-green-500/20 text-green-400" : s.status === 'completed' ? "bg-gray-500/20 text-gray-400" : "bg-blue-500/20 text-blue-400")}>{s.status === 'ongoing' ? 'Agora' : s.status === 'completed' ? 'Finalizada' : s.time.split(' ')[0]}</span>
                  <span className="text-xs">{s.booked}/{s.capacity}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="module-card p-4">
        <h3 className="text-sm font-semibold mb-3">Modalidades Populares</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stats.popularClassTypes.map((t) => (
            <div key={t.name} className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-lg font-bold text-primary">{t.bookings}</p>
              <p className="text-xs text-muted-foreground">{t.sessions} aulas</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
