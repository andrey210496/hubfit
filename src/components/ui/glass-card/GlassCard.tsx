import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'elevated' | 'subtle' | 'solid';
  glow?: 'none' | 'primary' | 'secondary' | 'success';
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', glow = 'none', hover = false, children, ...props }, ref) => {
    const glowColors = {
      none: '',
      primary: 'shadow-[0_0_30px_hsl(var(--primary)/0.15)]',
      secondary: 'shadow-[0_0_30px_hsl(var(--secondary)/0.15)]',
      success: 'shadow-[0_0_30px_hsl(var(--success)/0.15)]',
    };

    const variants = {
      default: 'glass-card',
      elevated: 'glass-card-elevated',
      subtle: 'glass-card-subtle',
      solid: 'bg-card border border-border/50',
    };

    return (
      <motion.div
        ref={ref}
        className={cn(
          variants[variant],
          glowColors[glow],
          hover && 'hover:scale-[1.01] hover:shadow-lg transition-all duration-300',
          'rounded-2xl',
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

GlassCard.displayName = 'GlassCard';

export default GlassCard;
