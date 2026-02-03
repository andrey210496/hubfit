import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'info' | 'destructive';
  className?: string;
}

const colorMap = {
  primary: {
    bg: 'from-primary/20 to-primary/5',
    border: 'border-primary/20',
    icon: 'text-primary',
    glow: 'shadow-primary/10',
  },
  success: {
    bg: 'from-success/20 to-success/5',
    border: 'border-success/20',
    icon: 'text-success',
    glow: 'shadow-success/10',
  },
  warning: {
    bg: 'from-warning/20 to-warning/5',
    border: 'border-warning/20',
    icon: 'text-warning',
    glow: 'shadow-warning/10',
  },
  info: {
    bg: 'from-info/20 to-info/5',
    border: 'border-info/20',
    icon: 'text-info',
    glow: 'shadow-info/10',
  },
  destructive: {
    bg: 'from-destructive/20 to-destructive/5',
    border: 'border-destructive/20',
    icon: 'text-destructive',
    glow: 'shadow-destructive/10',
  },
};

export function StatsCard({ icon, value, label, trend, color = 'primary', className }: StatsCardProps) {
  const colors = colorMap[color];
  
  return (
    <div className={cn(
      "group relative overflow-hidden rounded-2xl p-5",
      "bg-card border border-border/50",
      "hover:border-border transition-all duration-300",
      "hover:shadow-xl hover:-translate-y-0.5",
      className
    )}>
      {/* Subtle gradient background on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        `bg-gradient-to-br ${colors.bg}`
      )} />
      
      <div className="relative flex items-center gap-4">
        <div className={cn(
          "p-3 rounded-xl bg-gradient-to-br border shadow-lg",
          colors.bg,
          colors.border,
          colors.glow
        )}>
          <div className={colors.icon}>
            {icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground truncate">{label}</p>
        </div>
        {trend && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            trend.isPositive 
              ? "bg-success/10 text-success" 
              : "bg-destructive/10 text-destructive"
          )}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>
    </div>
  );
}
