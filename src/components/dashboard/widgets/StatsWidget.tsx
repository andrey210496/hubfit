import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsWidgetProps {
  value: number | string;
  label: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  badges?: Array<{
    label: string;
    value: number | string;
    variant?: 'primary' | 'secondary' | 'success' | 'warning';
  }>;
  color?: 'coral' | 'teal' | 'default';
}

export function StatsWidget({ 
  value, 
  label, 
  icon: Icon, 
  trend, 
  badges,
  color = 'default'
}: StatsWidgetProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn(
            "text-2xl lg:text-3xl font-bold leading-none",
            color === 'coral' && "text-gradient-coral",
            color === 'teal' && "text-gradient-teal"
          )}>
            {value}
          </p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          color === 'coral' && "gradient-coral shadow-glow-primary",
          color === 'teal' && "gradient-teal shadow-glow-secondary",
          color === 'default' && "neu-pressed"
        )}>
          <Icon className={cn(
            "h-4 w-4",
            color !== 'default' ? "text-white" : "text-muted-foreground"
          )} />
        </div>
      </div>

      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((badge, idx) => (
            <span 
              key={idx}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium",
                badge.variant === 'primary' && "gradient-coral text-white",
                badge.variant === 'success' && "bg-green-500/20 text-green-400",
                badge.variant === 'warning' && "bg-amber-500/20 text-amber-400",
                badge.variant === 'secondary' && "bg-muted text-muted-foreground"
              )}
            >
              {badge.value} {badge.label}
            </span>
          ))}
        </div>
      )}

      {trend && (
        <div className={cn(
          "flex items-center gap-1 text-xs",
          trend.positive ? "text-green-400" : "text-red-400"
        )}>
          <span className="font-medium">
            {trend.positive ? '+' : ''}{trend.value}
          </span>
          <span className="text-muted-foreground">{trend.label}</span>
        </div>
      )}
    </div>
  );
}
