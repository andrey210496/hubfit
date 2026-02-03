import { motion } from 'framer-motion';
import { Calendar, Clock, Users, TrendingUp, AlertCircle } from 'lucide-react';
import { useOperacionalDashboardStats } from '@/hooks/useOperacionalDashboardStats';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { cn } from '@/lib/utils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function OperacionalDashboard() {
  const { stats, loading } = useOperacionalDashboardStats();

  if (loading || !stats) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Calendar className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Aulas Hoje</span></div>
          <p className="text-2xl font-bold">{stats.classes.todayClasses}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Check-ins Hoje</span></div>
          <p className="text-2xl font-bold">{stats.checkins.todayCheckins}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Ocupação Média</span></div>
          <p className="text-2xl font-bold">{stats.classes.avgOccupancy}%</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-cyan-500" /><span className="text-xs text-muted-foreground">Horário Pico</span></div>
          <p className="text-xl font-bold">{stats.checkins.peakHour}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><AlertCircle className="h-4 w-4 text-red-500" /><span className="text-xs text-muted-foreground">Canceladas</span></div>
          <p className="text-2xl font-bold text-red-500">{stats.classes.cancelledToday}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Ocupação por Dia da Semana</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.classesByDay}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="day" fontSize={10} /><YAxis fontSize={10} /><Tooltip />
                <Bar dataKey="occupancy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Próximas Aulas</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {stats.upcomingClasses.length === 0 ? <p className="text-xs text-muted-foreground italic">Nenhuma aula agendada</p> : 
              stats.upcomingClasses.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                  <div><p className="text-sm font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.time} • {c.instructor}</p></div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", c.booked >= c.capacity ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400")}>{c.booked}/{c.capacity}</span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
