import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  color?: 'coral' | 'teal' | 'default';
}

interface QuickActionsWidgetProps {
  actions: QuickAction[];
}

export function QuickActionsWidget({ actions }: QuickActionsWidgetProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action, idx) => (
        <button
          key={idx}
          onClick={action.onClick}
          className={cn(
            "neu-button flex flex-col items-center gap-2 p-4 rounded-xl transition-all duration-200",
            "hover:scale-[1.02] active:scale-[0.98]",
            action.color === 'coral' && "hover:shadow-glow-primary",
            action.color === 'teal' && "hover:shadow-glow-secondary"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            action.color === 'coral' && "gradient-coral text-white",
            action.color === 'teal' && "gradient-teal text-white",
            action.color === 'default' && "neu-icon"
          )}>
            <action.icon className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
