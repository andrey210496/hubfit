import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary';
}

export function GlowButton({
  children,
  isLoading,
  loadingText,
  variant = 'primary',
  className,
  disabled,
  ...props
}: GlowButtonProps) {
  return (
    <div className="relative group">
      {/* Animated glow background */}
      <div
        className={cn(
          "absolute -inset-1 rounded-2xl opacity-70 blur-lg transition-all duration-500",
          "group-hover:opacity-100 group-hover:blur-xl",
          variant === 'primary' 
            ? "bg-gradient-to-r from-primary via-primary/80 to-primary" 
            : "bg-gradient-to-r from-secondary via-secondary/80 to-secondary",
          (disabled || isLoading) && "opacity-30"
        )}
      />
      
      <button
        disabled={disabled || isLoading}
        className={cn(
          "relative w-full h-14 rounded-xl font-semibold text-base",
          "flex items-center justify-center gap-2",
          "transition-all duration-300 transform",
          "group-hover:scale-[1.02] group-active:scale-[0.98]",
          variant === 'primary'
            ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground"
            : "bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground",
          "shadow-lg",
          variant === 'primary' ? "shadow-primary/25" : "shadow-secondary/25",
          (disabled || isLoading) && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{loadingText || 'Carregando...'}</span>
          </>
        ) : (
          children
        )}
      </button>
    </div>
  );
}
