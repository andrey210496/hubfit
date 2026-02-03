import { ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

interface DataCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  accent?: string;
  style?: CSSProperties;
}

export function DataCard({ children, className, hover = true, accent, style }: DataCardProps) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-2xl",
        "bg-card border border-border/50",
        "transition-all duration-300",
        hover && "hover:border-border hover:shadow-lg hover:-translate-y-0.5",
        className
      )}
      style={style}
    >
      {accent && (
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: accent }}
        />
      )}
      {children}
    </div>
  );
}

interface DataCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function DataCardHeader({ children, className }: DataCardHeaderProps) {
  return (
    <div className={cn(
      "px-5 py-4 border-b border-border/50",
      className
    )}>
      {children}
    </div>
  );
}

interface DataCardContentProps {
  children: ReactNode;
  className?: string;
}

export function DataCardContent({ children, className }: DataCardContentProps) {
  return (
    <div className={cn("p-5", className)}>
      {children}
    </div>
  );
}
