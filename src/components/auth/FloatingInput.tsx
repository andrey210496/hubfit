import { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface FloatingInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  error?: string;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ label, icon: Icon, error, className, type, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const hasValue = props.value && String(props.value).length > 0;

    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
      <div className="relative group">
        {/* Glow effect on focus */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-2xl opacity-0 transition-opacity duration-300 blur-md",
            "bg-gradient-to-r from-primary/50 to-secondary/50",
            isFocused && "opacity-100"
          )}
        />
        
        <div className={cn(
          "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300",
          "bg-background/80 backdrop-blur-sm border border-border/50",
          isFocused && "border-primary/50 bg-background",
          error && "border-destructive/50",
          className
        )}>
          {Icon && (
            <Icon className={cn(
              "w-5 h-5 transition-colors duration-300 flex-shrink-0",
              isFocused ? "text-primary" : "text-muted-foreground"
            )} />
          )}
          
          <div className="relative flex-1">
            <input
              ref={ref}
              type={inputType}
              className={cn(
                "w-full bg-transparent outline-none placeholder-transparent",
                "text-foreground",
                "peer pt-4 pb-1 text-base",
                "autofill:bg-transparent autofill:shadow-[0_0_0px_1000px_hsl(var(--background))_inset]",
                "[&:-webkit-autofill]:bg-transparent",
                "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0px_1000px_hsl(var(--background))_inset]",
                "[&:-webkit-autofill]:[-webkit-text-fill-color:hsl(var(--foreground))]"
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
                  ? "top-0 text-xs"
                  : "top-1/2 -translate-y-1/2 text-base",
                isFocused && "text-primary"
              )}
            >
              {label}
            </label>
          </div>

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {error && (
          <p className="absolute -bottom-5 left-0 text-xs text-destructive animate-fade-up">
            {error}
          </p>
        )}
      </div>
    );
  }
);

FloatingInput.displayName = 'FloatingInput';
