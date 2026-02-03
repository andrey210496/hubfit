import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Connection {
  name: string;
  status: 'connected' | 'disconnected' | 'warning';
}

interface ConnectionStatusWidgetProps {
  connections: Connection[];
  totalConnected: number;
  total: number;
}

export function ConnectionStatusWidget({ 
  connections, 
  totalConnected, 
  total 
}: ConnectionStatusWidgetProps) {
  const getStatusIcon = (status: Connection['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gradient-teal">{totalConnected}</span>
            <span className="text-muted-foreground">/ {total}</span>
          </div>
          <p className="text-sm text-muted-foreground">conexões ativas</p>
        </div>
        <div className="w-16 h-16 relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="3"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="hsl(var(--secondary))"
              strokeWidth="3"
              strokeDasharray={`${(totalConnected / total) * 94.2} 94.2`}
              className="drop-shadow-md"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">
            {Math.round((totalConnected / total) * 100)}%
          </span>
        </div>
      </div>

      {/* Connection List */}
      <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
        {connections.map((conn, idx) => (
          <div 
            key={idx}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg",
              "neu-pressed"
            )}
          >
            <span className="text-sm font-medium truncate">{conn.name}</span>
            {getStatusIcon(conn.status)}
          </div>
        ))}
      </div>
    </div>
  );
}
