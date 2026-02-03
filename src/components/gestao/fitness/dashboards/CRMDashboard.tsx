import { motion } from 'framer-motion';
import { Users, TrendingUp, MessageSquare, Target, UserPlus, Percent } from 'lucide-react';
import { useCRMDashboardStats } from '@/hooks/useCRMDashboardStats';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const COLORS = ['#ef4444', '#f97316', '#22c55e', '#3b82f6'];

export function CRMDashboard() {
  const { stats, loading } = useCRMDashboardStats();

  if (loading || !stats) {
    return <div className="animate-pulse space-y-4"><div className="h-32 bg-muted rounded-xl" /><div className="h-64 bg-muted rounded-xl" /></div>;
  }

  const leadData = [
    { name: 'Hot', value: stats.leads.hot, color: '#ef4444' },
    { name: 'Warm', value: stats.leads.warm, color: '#f97316' },
    { name: 'Cold', value: stats.leads.cold, color: '#3b82f6' },
    { name: 'Novos', value: stats.leads.new, color: '#22c55e' },
  ].filter(d => d.value > 0);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-blue-500" /><span className="text-xs text-muted-foreground">Total Contatos</span></div>
          <p className="text-2xl font-bold">{stats.leads.total}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><UserPlus className="h-4 w-4 text-green-500" /><span className="text-xs text-muted-foreground">Leads no Mês</span></div>
          <p className="text-2xl font-bold">{stats.conversions.leadsThisMonth}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Target className="h-4 w-4 text-purple-500" /><span className="text-xs text-muted-foreground">Conversões</span></div>
          <p className="text-2xl font-bold">{stats.conversions.conversionsThisMonth}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <div className="flex items-center gap-2 mb-2"><Percent className="h-4 w-4 text-orange-500" /><span className="text-xs text-muted-foreground">Taxa Conversão</span></div>
          <p className="text-2xl font-bold">{stats.conversions.conversionRate}%</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Distribuição de Leads</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart><Pie data={leadData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {leadData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        <motion.div variants={itemVariants} className="module-card p-4">
          <h3 className="text-sm font-semibold mb-3">Contatos por Dia</h3>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.contactsByDay}><XAxis dataKey="date" fontSize={10} /><YAxis fontSize={10} /><Tooltip />
                <Area type="monotone" dataKey="contacts" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="module-card p-4">
        <h3 className="text-sm font-semibold mb-3">Engajamento</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">Msgs Recebidas</p><p className="text-xl font-bold">{stats.engagement.messagesReceived}</p></div>
          <div><p className="text-xs text-muted-foreground">Msgs Enviadas</p><p className="text-xl font-bold">{stats.engagement.messagesSent}</p></div>
          <div><p className="text-xs text-muted-foreground">Taxa Resposta</p><p className="text-xl font-bold">{stats.engagement.responseRate}%</p></div>
          <div><p className="text-xs text-muted-foreground">Tempo Médio</p><p className="text-xl font-bold">{stats.engagement.avgResponseTime}min</p></div>
        </div>
      </motion.div>
    </motion.div>
  );
}
