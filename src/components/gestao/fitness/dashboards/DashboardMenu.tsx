import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Users,
  BarChart3,
  Settings2,
  UserCheck,
  DollarSign,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';

export type DashboardCategory = 'crm' | 'gerencial' | 'operacional' | 'clientes' | 'financeiro' | 'agenda';

interface DashboardCategoryItem {
  id: DashboardCategory;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

const dashboardCategories: DashboardCategoryItem[] = [
  {
    id: 'crm',
    label: 'CRM',
    description: 'Leads, conversões e engajamento',
    icon: Users,
    color: 'text-blue-500',
    gradient: 'from-blue-500/20 to-blue-600/10',
  },
  {
    id: 'gerencial',
    label: 'Gerencial',
    description: 'Visão executiva e KPIs estratégicos',
    icon: BarChart3,
    color: 'text-purple-500',
    gradient: 'from-purple-500/20 to-purple-600/10',
  },
  {
    id: 'operacional',
    label: 'Operacional',
    description: 'Aulas, check-ins e ocupação',
    icon: Settings2,
    color: 'text-orange-500',
    gradient: 'from-orange-500/20 to-orange-600/10',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    description: 'Alunos, retenção e churn',
    icon: UserCheck,
    color: 'text-green-500',
    gradient: 'from-green-500/20 to-green-600/10',
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    description: 'Receitas, despesas e inadimplência',
    icon: DollarSign,
    color: 'text-emerald-500',
    gradient: 'from-emerald-500/20 to-emerald-600/10',
  },
  {
    id: 'agenda',
    label: 'Agenda',
    description: 'Grade horária e agendamentos',
    icon: CalendarDays,
    color: 'text-cyan-500',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
  },
];

interface DashboardMenuProps {
  activeCategory: DashboardCategory;
  onCategoryChange: (category: DashboardCategory) => void;
}

export function DashboardMenu({ activeCategory, onCategoryChange }: DashboardMenuProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {dashboardCategories.map((category) => {
        const Icon = category.icon;
        const isActive = activeCategory === category.id;
        
        return (
          <motion.button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              "border border-transparent",
              isActive 
                ? `bg-gradient-to-r ${category.gradient} border-current/20 shadow-lg` 
                : "bg-muted/50 hover:bg-muted"
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className={cn("h-4 w-4", isActive ? category.color : "text-muted-foreground")} />
            <span className={cn(isActive ? "text-foreground" : "text-muted-foreground")}>
              {category.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="dashboard-indicator"
                className={cn("absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full", category.color.replace('text-', 'bg-'))}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export { dashboardCategories };
export type { DashboardCategoryItem };
