import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Check, Loader2 } from 'lucide-react';

interface PremiumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  isSubmitting?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

export function PremiumDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  children,
  onSubmit,
  submitLabel = 'Salvar',
  submitDisabled,
  isSubmitting,
  size = 'md',
}: PremiumDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={cn(
          "p-0 gap-0 rounded-3xl border-border/50 overflow-hidden",
          "bg-gradient-to-b from-background to-muted/20",
          sizeClasses[size]
        )}
      >
        {/* Header with gradient */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          
          <DialogHeader className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {icon && (
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    {icon}
                  </div>
                )}
                <div>
                  <DialogTitle className="text-xl font-semibold">
                    {title}
                  </DialogTitle>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {children}
        </div>

        {/* Footer */}
        {onSubmit && (
          <div className="px-6 pb-6 pt-2 flex gap-3 justify-end border-t border-border/50 bg-muted/20">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-5"
            >
              Cancelar
            </Button>
            <Button 
              onClick={onSubmit}
              disabled={submitDisabled || isSubmitting}
              className={cn(
                "rounded-xl px-6 gap-2 min-w-[120px]",
                "shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30",
                "transition-all duration-300"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {submitLabel}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
