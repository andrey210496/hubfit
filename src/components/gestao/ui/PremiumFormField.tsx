import { useState, forwardRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PremiumFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  suffix?: ReactNode;
}

export const PremiumFormField = forwardRef<HTMLInputElement, PremiumFormFieldProps>(
  ({ label, icon: Icon, error, hint, suffix, className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = props.value !== undefined && props.value !== '' && props.value !== null;

    return (
      <div className="relative space-y-1.5">
        <div className="relative group">
          {/* Glow effect */}
          <div
            className={cn(
              "absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300 blur-sm",
              "bg-gradient-to-r from-primary/30 to-primary/10",
              isFocused && !error && "opacity-100"
            )}
          />
          
          <div className={cn(
            "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
            "bg-muted/30 border border-border/50",
            isFocused && !error && "border-primary/50 bg-background shadow-sm",
            error && "border-destructive/50 bg-destructive/5",
            className
          )}>
            {Icon && (
              <Icon className={cn(
                "w-5 h-5 transition-colors duration-300 flex-shrink-0",
                isFocused ? "text-primary" : "text-muted-foreground",
                error && "text-destructive"
              )} />
            )}
            
            <div className="relative flex-1">
              <input
                ref={ref}
                type={type}
                className={cn(
                  "w-full bg-transparent outline-none placeholder-transparent",
                  "text-foreground",
                  "peer pt-4 pb-1 text-sm",
                )}
                placeholder={label}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                {...props}
              />
              
              <label
                className={cn(
                  "absolute left-0 transition-all duration-300 pointer-events-none",
                  "text-muted-foreground",
                  (isFocused || hasValue)
                    ? "top-0 text-[10px] font-medium"
                    : "top-1/2 -translate-y-1/2 text-sm",
                  isFocused && !error && "text-primary",
                  error && "text-destructive"
                )}
              >
                {label}
              </label>
            </div>

            {suffix && (
              <div className="flex-shrink-0 text-muted-foreground">
                {suffix}
              </div>
            )}
          </div>
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
);

PremiumFormField.displayName = 'PremiumFormField';
