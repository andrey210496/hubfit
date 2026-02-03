import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Building2, 
  Users, 
  Crown, 
  MessageSquare, 
  Smartphone, 
  Ticket, 
  Contact2,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ArrowRight,
  Minus,
  RotateCcw
} from 'lucide-react';
import { useSystemStats, useRecentCompanies, useRecentUsers, useCompanyStatusDistribution, useMonthlyRevenue } from '@/hooks/useSystemStats';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import OverdueInvoicesAlert from './OverdueInvoicesAlert';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DraggableDashboardSection } from './DraggableDashboardSection';
import { useDashboardCardOrder, DashboardCardId } from '@/hooks/useDashboardCardOrder';

export default function SuperAdminDashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState<number>(6);
  const { cardOrder, updateOrder, resetOrder } = useDashboardCardOrder();
  
  const { stats, loading: statsLoading, refetch } = useSystemStats();
  const { companies: recentCompanies, loading: companiesLoading } = useRecentCompanies();
  const { users: recentUsers, loading: usersLoading } = useRecentUsers();
  const { data: statusDistribution, loading: chartLoading } = useCompanyStatusDistribution();
  const { data: monthlyRevenue, stats: revenueStats, forecast, loading: revenueLoading } = useMonthlyRevenue(revenuePeriod);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = cardOrder.indexOf(active.id as DashboardCardId);
      const newIndex = cardOrder.indexOf(over.id as DashboardCardId);
      updateOrder(arrayMove(cardOrder, oldIndex, newIndex));
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const historicalData = monthlyRevenue.filter(d => !d.isForecast);
  const totalRevenue = historicalData.reduce((acc, curr) => acc + curr.revenue, 0);
  const totalPaid = historicalData.reduce((acc, curr) => acc + curr.paid, 0);

  const getTrendIcon = () => {
    switch (forecast.trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = () => {
    switch (forecast.confidence) {
      case 'high': return <Badge className="bg-green-500">Alta</Badge>;
      case 'medium': return <Badge variant="secondary">Média</Badge>;
      default: return <Badge variant="outline">Baixa</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'inactive':
        return <Badge variant="destructive">Inativo</Badge>;
      case 'trial':
        return <Badge variant="secondary">Trial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    description,
    trend
  }: { 
    title: string; 
    value: number; 
    icon: any; 
    description?: string;
    trend?: string;
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString('pt-BR')}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
            <TrendingUp className="h-3 w-3" />
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSection = (id: DashboardCardId) => {
    switch (id) {
      case 'stats-row-1':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                title="Total de Empresas" 
                value={stats.totalCompanies} 
                icon={Building2}
                description={`${stats.activeCompanies} ativas, ${stats.trialCompanies} trial`}
              />
              <StatCard 
                title="Total de Usuários" 
                value={stats.totalUsers} 
                icon={Users}
              />
              <StatCard 
                title="Planos Cadastrados" 
                value={stats.totalPlans} 
                icon={Crown}
              />
              <StatCard 
                title="Conexões WhatsApp" 
                value={stats.totalConnections} 
                icon={Smartphone}
              />
            </div>
          </DraggableDashboardSection>
        );
      case 'stats-row-2':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard 
                title="Total de Tickets" 
                value={stats.totalTickets} 
                icon={Ticket}
              />
              <StatCard 
                title="Total de Contatos" 
                value={stats.totalContacts} 
                icon={Contact2}
              />
              <StatCard 
                title="Total de Mensagens" 
                value={stats.totalMessages} 
                icon={MessageSquare}
              />
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status das Empresas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">{stats.activeCompanies} ativas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-sm">{stats.trialCompanies} trial</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">{stats.inactiveCompanies} inativas</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DraggableDashboardSection>
        );
      case 'overdue-invoices':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <OverdueInvoicesAlert />
          </DraggableDashboardSection>
        );
      case 'mom-indicators':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Mês Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueStats.currentMonth)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {revenueStats.growthPercentage > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : revenueStats.growthPercentage < 0 ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={`text-sm font-medium ${
                      revenueStats.growthPercentage > 0 ? 'text-green-500' : 
                      revenueStats.growthPercentage < 0 ? 'text-red-500' : 
                      'text-muted-foreground'
                    }`}>
                      {formatPercentage(revenueStats.growthPercentage)} MoM
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Mês Anterior</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueStats.previousMonth)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Base de comparação</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueStats.avgMonthly)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Últimos {revenuePeriod} meses</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Período</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">{formatCurrency(totalPaid)} pago</p>
                </CardContent>
              </Card>
              <Card className="border-dashed border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    Previsão Próx. Mês
                    {getTrendIcon()}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(forecast.nextMonth)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">Confiança:</span>
                    {getConfidenceBadge()}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-dashed border-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Previsão 3 Meses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(forecast.next3Months)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Baseado em tendência linear</p>
                </CardContent>
              </Card>
            </div>
          </DraggableDashboardSection>
        );
      case 'revenue-chart':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle>Receita Mensal + Previsão</CardTitle>
                  <CardDescription>Histórico e projeção baseada em tendência</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-3 h-3 rounded bg-[hsl(var(--chart-1))]" />
                    <span>Pago</span>
                    <div className="w-3 h-3 rounded bg-[hsl(var(--chart-3))]" />
                    <span>Pendente</span>
                    <div className="w-3 h-3 rounded bg-[hsl(var(--chart-4))] opacity-60" />
                    <span>Previsão</span>
                  </div>
                  <ToggleGroup 
                    type="single" 
                    value={String(revenuePeriod)} 
                    onValueChange={(value) => value && setRevenuePeriod(Number(value))}
                    className="bg-muted rounded-lg p-1"
                  >
                    <ToggleGroupItem value="3" className="text-xs px-3">3 meses</ToggleGroupItem>
                    <ToggleGroupItem value="6" className="text-xs px-3">6 meses</ToggleGroupItem>
                    <ToggleGroupItem value="12" className="text-xs px-3">12 meses</ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </CardHeader>
              <CardContent>
                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : monthlyRevenue.length === 0 ? (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    Nenhuma fatura encontrada
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis 
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        className="text-xs"
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [formatCurrency(value), name]}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="paid" name="Pago" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pending" name="Pendente" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="forecast" name="Previsão" fill="hsl(var(--chart-4))" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </DraggableDashboardSection>
        );
      case 'charts-tables':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Distribuição de Empresas</CardTitle>
                  <CardDescription>Por status de cadastro</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartLoading ? (
                    <div className="flex items-center justify-center h-[200px]">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : statusDistribution.length === 0 || statusDistribution.every(d => d.value === 0) ? (
                    <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                      Nenhuma empresa cadastrada
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="col-span-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Empresas Recentes</CardTitle>
                    <CardDescription>Últimas empresas cadastradas</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver todas <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  {companiesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : recentCompanies.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma empresa encontrada
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Criado em</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentCompanies.map((company) => (
                            <TableRow key={company.id}>
                              <TableCell className="font-medium">{company.name}</TableCell>
                              <TableCell>{company.plan?.name || '-'}</TableCell>
                              <TableCell>{getStatusBadge(company.status)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {formatDate(company.created_at)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </DraggableDashboardSection>
        );
      case 'recent-users':
        return (
          <DraggableDashboardSection id={id} key={id}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Usuários Recentes</CardTitle>
                  <CardDescription>Últimos usuários cadastrados no sistema</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="gap-1">
                  Ver todos <ArrowRight className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentUsers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.company?.name || '-'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(user.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </DraggableDashboardSection>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pl-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Super Admin</h2>
          <p className="text-muted-foreground">
            Visão geral do sistema • Arraste as seções para reorganizar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetOrder} className="gap-2" title="Restaurar ordem padrão">
            <RotateCcw className="h-4 w-4" />
            Resetar Layout
          </Button>
          <Button variant="outline" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={cardOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {cardOrder.map(renderSection)}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
