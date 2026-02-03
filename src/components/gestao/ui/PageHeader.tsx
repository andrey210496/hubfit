import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center",
      "pb-6 border-b border-border/50 mb-6",
      className
    )}>
      <div className="flex items-center gap-4">
        {icon && (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
            <div className="text-primary">
              {icon}
            </div>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
