import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DashboardMenu,
  DashboardCategory,
  CRMDashboard,
  GerencialDashboard,
  OperacionalDashboard,
  ClientesDashboard,
  FinanceiroDashboard,
  AgendaDashboard,
} from './dashboards';

const categoryTitles: Record<DashboardCategory, { title: string; subtitle: string }> = {
  crm: { title: 'Dashboard CRM', subtitle: 'Leads, conversões e engajamento de contatos' },
  gerencial: { title: 'Dashboard Gerencial', subtitle: 'Visão executiva com KPIs estratégicos' },
  operacional: { title: 'Dashboard Operacional', subtitle: 'Aulas, check-ins e ocupação em tempo real' },
  clientes: { title: 'Dashboard de Clientes', subtitle: 'Alunos, retenção, churn e aniversários' },
  financeiro: { title: 'Dashboard Financeiro', subtitle: 'Receitas, pagamentos e inadimplência' },
  agenda: { title: 'Dashboard Agenda', subtitle: 'Grade horária e agendamentos do dia' },
};

export function FitnessDashboardPage() {
  const [activeCategory, setActiveCategory] = useState<DashboardCategory>('gerencial');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => setRefreshKey(prev => prev + 1);

  const renderDashboard = () => {
    switch (activeCategory) {
      case 'crm': return <CRMDashboard key={refreshKey} />;
      case 'gerencial': return <GerencialDashboard key={refreshKey} />;
      case 'operacional': return <OperacionalDashboard key={refreshKey} />;
      case 'clientes': return <ClientesDashboard key={refreshKey} />;
      case 'financeiro': return <FinanceiroDashboard key={refreshKey} />;
      case 'agenda': return <AgendaDashboard key={refreshKey} />;
      default: return <GerencialDashboard key={refreshKey} />;
    }
  };

  const currentCategory = categoryTitles[activeCategory];

  return (
    <div className="p-4 lg:p-6 space-y-4 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gradient-coral">
            {currentCategory.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {currentCategory.subtitle}
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          className="neu-button h-9"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      {/* Category Menu */}
      <DashboardMenu 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />

      {/* Dashboard Content */}
      <motion.div
        key={activeCategory}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderDashboard()}
      </motion.div>
    </div>
  );
}
