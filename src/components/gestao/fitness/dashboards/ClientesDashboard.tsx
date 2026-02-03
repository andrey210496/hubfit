import { motion } from 'framer-motion';
import { Users, UserMinus, AlertTriangle, Clock, Gift } from 'lucide-react';
import { useClientesDashboardStats } from '@/hooks/useClientesDashboardStats';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { cn } from '@/lib/utils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export function ClientesDashboard() {
  const { stats, loading } = useClientesDashboardStats();

  if (loading || !stats) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Ativos</span></div>
          <p className="text-2xl font-bold text-green-500">{stats.status.active}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><UserMinus className="h-4 w-4 text-gray-500" /><span className="text-xs text-muted-foreground">Inativos</span></div>
          <p className="text-2xl font-bold">{stats.status.inactive}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-cyan-500" /><span className="text-xs text-muted-foreground">Retenção</span></div>
          <p className="text-2xl font-bold">{stats.retention.retentionRate}%</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Em Risco</span></div>
          <p className="text-2xl font-bold text-amber-500">{stats.riskMembers.length}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Gift className="h-4 w-4 text-pink-500" /><span className="text-xs text-muted-foreground">Aniversários</span></div>
          <p className="text-2xl font-bold">{stats.birthdaysThisWeek.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição por Plano</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={stats.membersByPlan} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" label={({ name, percentage }) => `${name} ${percentage}%`}>
                {stats.membersByPlan.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Alunos em Risco (sem treinar 5+ dias)</h3>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
            {stats.riskMembers.slice(0, 8).map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                <span className="text-sm truncate flex-1">{m.name}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full", m.daysSinceCheckin >= 7 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>{m.daysSinceCheckin}d</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="module-card p-4">
        <h3 className="text-sm font-semibold mb-3">Planos Vencendo em 30 dias</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
          {stats.expiringMembers.slice(0, 9).map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="truncate flex-1"><p className="text-sm font-medium truncate">{m.name}</p><p className="text-xs text-muted-foreground">{m.plan}</p></div>
              <span className={cn("text-xs px-2 py-0.5 rounded-full flex-shrink-0", m.daysUntilExpiry <= 7 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400")}>{m.daysUntilExpiry}d</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
