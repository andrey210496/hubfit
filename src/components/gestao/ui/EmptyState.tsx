import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-16 px-6",
      "rounded-2xl border-2 border-dashed border-border/50",
      "bg-gradient-to-b from-muted/30 to-transparent",
      className
    )}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
        <div className="relative p-5 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shadow-xl">
          <div className="text-muted-foreground">
            {icon}
          </div>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-center max-w-sm text-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-6">
          {action}
        </div>
      )}
    </div>
  );
}
