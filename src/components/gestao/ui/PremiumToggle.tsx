import { cn } from '@/lib/utils';
import { LucideIcon, Check } from 'lucide-react';

interface PremiumToggleProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

export function PremiumToggle({
  label,
  description,
  icon: Icon,
  checked,
  onChange,
  className,
}: PremiumToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300",
        "border border-border/50 text-left",
        checked 
          ? "bg-primary/10 border-primary/30 shadow-sm" 
          : "bg-muted/30 hover:bg-muted/50",
        className
      )}
    >
      {Icon && (
        <div className={cn(
          "p-2.5 rounded-xl transition-colors duration-300",
          checked ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn(
            "h-5 w-5 transition-colors duration-300",
            checked ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium transition-colors duration-300",
          checked ? "text-foreground" : "text-muted-foreground"
        )}>
          {label}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {description}
          </p>
        )}
      </div>

      <div className={cn(
        "w-12 h-7 rounded-full p-1 transition-all duration-300",
        checked ? "bg-primary" : "bg-muted-foreground/30"
      )}>
        <div className={cn(
          "h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center",
          checked ? "translate-x-5" : "translate-x-0"
        )}>
          {checked && <Check className="h-3 w-3 text-primary" />}
        </div>
      </div>
    </button>
  );
}
