import { useState, useEffect } from 'react';
import { AlertTriangle, X, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  category: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  color: string;
}

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
}

export function AlertBanner({ alerts, onDismiss }: AlertBannerProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    setVisibleAlerts(alerts.slice(0, 3));
  }, [alerts]);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex flex-col gap-2 max-w-md w-full px-4">
      {visibleAlerts.map((alert, index) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-xl animate-fade-in",
            alert.type === 'critical' && "bg-red-500/10 border-red-500/30",
            alert.type === 'warning' && "bg-yellow-500/10 border-yellow-500/30",
            alert.type === 'info' && "bg-blue-500/10 border-blue-500/30"
          )}
          style={{ 
            animationDelay: `${index * 100}ms`,
          }}
        >
          <div 
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${alert.color}20` }}
          >
            {alert.type === 'critical' ? (
              <AlertTriangle className="h-4 w-4" style={{ color: alert.color }} />
            ) : (
              <TrendingUp className="h-4 w-4" style={{ color: alert.color }} />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{alert.category}</p>
            <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 flex-shrink-0"
            onClick={() => onDismiss(alert.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
