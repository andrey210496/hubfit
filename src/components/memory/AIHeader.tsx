import { useState, useEffect } from 'react';
import { Brain, RefreshCw, Sparkles, Cpu, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AIHeaderProps {
  onRefresh: () => void;
  loading: boolean;
  periodDays: number;
}

export function AIHeader({ onRefresh, loading, periodDays }: AIHeaderProps) {
  const [glitchText, setGlitchText] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setGlitchText(true);
      setTimeout(() => setGlitchText(false), 100);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-cyan-500/5" />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 50%)',
        }}
      />
      
      {/* Animated lines */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute h-px w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"
          style={{ top: '30%', animationDuration: '2s' }}
        />
        <div 
          className="absolute h-px w-full bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent animate-pulse"
          style={{ top: '70%', animationDuration: '3s' }}
        />
      </div>

      <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6">
        <div className="flex items-center gap-4">
          {/* Animated brain icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl animate-pulse" />
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-600/20 border border-primary/30">
              <Brain className="h-8 w-8 text-primary" />
              {/* Orbiting dots */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-cyan-500" />
              </div>
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 
                className={cn(
                  "text-3xl font-bold bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent",
                  glitchText && "animate-pulse"
                )}
              >
                MEMORY BASE
              </h1>
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-green-500 animate-pulse" />
                <span className="text-xs font-mono text-green-500">AO VIVO</span>
              </div>
              <div className="h-3 w-px bg-border" />
              <p className="text-sm text-muted-foreground font-mono">
                MAPA NEURAL • ANÁLISE DE {periodDays} DIAS
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-muted/30">
            <Cpu className="h-4 w-4 text-primary" />
            <div className="text-xs font-mono">
              <span className="text-muted-foreground">PROCESSAMENTO:</span>
              <span className="text-primary ml-1">QUÂNTICO</span>
            </div>
          </div>
          
          <Button 
            onClick={onRefresh} 
            disabled={loading} 
            variant="outline"
            className="gap-2 bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            {loading ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
          </Button>
        </div>
      </div>
    </div>
  );
}
