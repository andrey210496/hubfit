import { cn } from '@/lib/utils';
import { LucideIcon, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ReactNode } from 'react';

interface SelectOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface PremiumSelectProps {
  label: string;
  icon?: LucideIcon;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}

export function PremiumSelect({
  label,
  icon: Icon,
  value,
  onValueChange,
  options,
  placeholder,
  error,
  hint,
  disabled,
  className,
}: PremiumSelectProps) {
  const hasValue = value !== undefined && value !== '';

  return (
    <div className="relative space-y-1.5">
      <div className="relative group">
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger
            className={cn(
              "relative flex items-center gap-3 px-4 h-auto py-3 rounded-xl transition-all duration-300",
              "bg-muted/30 border border-border/50",
              "focus:border-primary/50 focus:bg-background focus:shadow-sm focus:ring-0",
              "data-[state=open]:border-primary/50 data-[state=open]:bg-background data-[state=open]:shadow-sm",
              error && "border-destructive/50 bg-destructive/5",
              className
            )}
          >
            {Icon && (
              <Icon className={cn(
                "w-5 h-5 transition-colors duration-300 flex-shrink-0",
                "text-muted-foreground group-focus-within:text-primary",
                error && "text-destructive"
              )} />
            )}
            
            <div className="relative flex-1 text-left">
              <span
                className={cn(
                  "absolute left-0 transition-all duration-300 pointer-events-none",
                  "text-muted-foreground",
                  hasValue
                    ? "top-0 text-[10px] font-medium"
                    : "top-1/2 -translate-y-1/2 text-sm",
                )}
              >
                {label}
              </span>
              <div className={cn("pt-4 pb-1 text-sm", !hasValue && "opacity-0")}>
                <SelectValue placeholder={placeholder} />
              </div>
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border/50">
            {options.map((option) => (
              <SelectItem 
                key={option.value} 
                value={option.value}
                className="rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {option.icon}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hint && !error && (
        <p className="text-[11px] text-muted-foreground px-1">
          {hint}
        </p>
      )}

      {error && (
        <p className="text-[11px] text-destructive px-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
}
