import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, AlertTriangle, CreditCard, Wallet } from 'lucide-react';
import { useFinanceiroDashboardStats } from '@/hooks/useFinanceiroDashboardStats';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
const COLORS = ['#22c55e', '#3b82f6', '#f97316', '#8b5cf6'];

export function FinanceiroDashboard() {
  const { stats, loading } = useFinanceiroDashboardStats();

  if (loading || !stats) return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /></div>;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><DollarSign className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Receita Mês</span></div>
          <p className="text-xl font-bold text-green-500">{formatCurrency(stats.revenue.thisMonth)}</p>
          <p className={cn("text-xs", stats.revenue.growth >= 0 ? "text-green-400" : "text-red-400")}>{stats.revenue.growth >= 0 ? '+' : ''}{stats.revenue.growth}% vs mês anterior</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Projetado</span></div>
          <p className="text-xl font-bold">{formatCurrency(stats.revenue.projected)}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><CreditCard className="h-4 w-4 text-amber-500" /><span className="text-xs text-muted-foreground">Pendentes</span></div>
          <p className="text-xl font-bold">{stats.payments.pending}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-red-500" /><span className="text-xs text-muted-foreground">Em Atraso</span></div>
          <p className="text-xl font-bold text-red-500">{stats.payments.overdue}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Valor em Atraso</span></div>
          <p className="text-xl font-bold text-red-500">{formatCurrency(stats.payments.overdueAmount)}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Receita Mensal</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="month" fontSize={10} /><YAxis fontSize={10} tickFormatter={(v) => `${v/1000}k`} /><Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Formas de Pagamento</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={stats.paymentsByMethod} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" label={({ method, percentage }) => `${method} ${percentage}%`}>
                {stats.paymentsByMethod.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="module-card p-4">
        <h3 className="text-sm font-semibold mb-3">Inadimplentes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
          {stats.overdueMembers.slice(0, 9).map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="truncate flex-1"><p className="text-sm font-medium truncate">{m.name}</p><p className="text-xs text-muted-foreground">{m.dueDate}</p></div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 flex-shrink-0">{formatCurrency(m.amount)}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
