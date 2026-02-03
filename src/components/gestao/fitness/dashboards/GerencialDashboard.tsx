import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Users, Activity, Target, Clock } from 'lucide-react';
import { useGerencialDashboardStats } from '@/hooks/useGerencialDashboardStats';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);

export function GerencialDashboard() {
  const { stats, loading } = useGerencialDashboardStats();

  if (loading || !stats) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /><div className="h-64 bg-muted rounded-xl" /></div>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">MRR</span></div>
          <p className="text-xl font-bold text-green-500">{formatCurrency(stats.revenue.mrr)}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">ARR</span></div>
          <p className="text-xl font-bold text-purple-500">{formatCurrency(stats.revenue.arr)}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Alunos Ativos</span></div>
          <p className="text-xl font-bold">{stats.members.totalActive}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-cyan-500" /><span className="text-xs text-muted-foreground">Retenção</span></div>
          <p className="text-xl font-bold text-cyan-500">{stats.members.retentionRate}%</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Activity className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Ocupação</span></div>
          <p className="text-xl font-bold">{stats.operational.classOccupancy}%</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">LTV</span></div>
          <p className="text-xl font-bold">{formatCurrency(stats.revenue.ltv)}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Receita Mensal</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" fontSize={10} /><YAxis fontSize={10} tickFormatter={(v) => `${v/1000}k`} /><Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Tendência de Crescimento</h3>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.growthTrend}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" fontSize={10} /><YAxis fontSize={10} /><Tooltip />
                <Line type="monotone" dataKey="members" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="module-card p-4">
        <h3 className="text-sm font-semibold mb-3">Métricas Operacionais</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">Ticket Médio</p><p className="text-xl font-bold">{formatCurrency(stats.revenue.avgTicket)}</p></div>
          <div><p className="text-xs text-muted-foreground">Churn</p><p className="text-xl font-bold text-red-500">{stats.members.churnRate}%</p></div>
          <div><p className="text-xs text-muted-foreground">Média Check-ins/dia</p><p className="text-xl font-bold">{stats.operational.avgCheckinsPerDay}</p></div>
          <div><p className="text-xs text-muted-foreground">Horário Pico</p><p className="text-xl font-bold">{stats.operational.peakHours}</p></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
