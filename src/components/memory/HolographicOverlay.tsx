import { useEffect, useState } from 'react';
import { Brain, Cpu, Activity, Zap, Database, Network } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HolographicOverlayProps {
  totalMessages: number;
  totalContacts: number;
  activeCategories: number;
}

export function HolographicOverlay({ totalMessages, totalContacts, activeCategories }: HolographicOverlayProps) {
  const [systemStatus, setSystemStatus] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const statusMessages = [
    'PROCESSANDO DADOS NEURAIS...',
    'ANALISANDO PADRÕES SEMÂNTICOS...',
    'IDENTIFICANDO TEMAS RECORRENTES...',
    'MAPEANDO CONEXÕES SINÁPTICAS...',
    'GERANDO INSIGHTS COGNITIVOS...',
    'CALIBRANDO MATRIZ NEURAL...',
    'SINCRONIZANDO MEMÓRIAS...',
    'PROCESSAMENTO COMPLETO',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % statusMessages.length);
      setSystemStatus(prev => {
        const newStatus = [...prev, statusMessages[(currentIndex + 1) % statusMessages.length]];
        return newStatus.slice(-4);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <>
      {/* Scanlines effect - more subtle */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0, 0, 0, 0.02) 3px, rgba(0, 0, 0, 0.02) 6px)',
        }}
      />

      {/* Subtle vignette */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.2) 100%)',
        }}
      />

      {/* Top HUD bar - compact */}
      <div className="absolute top-2 left-2 right-2 h-8 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-primary/30 bg-background/90 backdrop-blur">
          <Cpu className="h-3 w-3 text-primary animate-pulse" />
          <span className="text-[10px] font-mono text-primary hidden sm:inline">SISTEMA ATIVO</span>
          <div className="h-3 w-px bg-border hidden sm:block" />
          <span className="text-[10px] font-mono text-muted-foreground hidden md:inline">
            {statusMessages[currentIndex]}
          </span>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded-full border border-green-500/30 bg-background/90 backdrop-blur">
          <Activity className="h-3 w-3 text-green-500" />
          <span className="text-[10px] font-mono text-green-500">AO VIVO</span>
          <div className="flex items-center gap-0.5">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i}
                className="w-1 h-2 rounded-full bg-green-500 animate-pulse"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Corner metrics - positioned to not overlap graph */}
      <div className="absolute left-2 bottom-24 z-20 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-primary/30 bg-background/90 backdrop-blur">
          <Database className="h-3 w-3 text-primary" />
          <div>
            <p className="text-[9px] text-muted-foreground font-mono leading-none">DADOS</p>
            <p className="text-sm font-bold font-mono text-primary leading-tight">{totalMessages.toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-cyan-500/30 bg-background/90 backdrop-blur">
          <Network className="h-3 w-3 text-cyan-500" />
          <div>
            <p className="text-[9px] text-muted-foreground font-mono leading-none">NÓS</p>
            <p className="text-sm font-bold font-mono text-cyan-500 leading-tight">{totalContacts}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-green-500/30 bg-background/90 backdrop-blur">
          <Zap className="h-3 w-3 text-green-500" />
          <div>
            <p className="text-[9px] text-muted-foreground font-mono leading-none">GRUPOS</p>
            <p className="text-sm font-bold font-mono text-green-500 leading-tight">{activeCategories}</p>
          </div>
        </div>
      </div>

      {/* Right side system log - smaller and higher */}
      <div className="absolute right-2 bottom-24 z-20 w-48 hidden lg:block">
        <div className="rounded-lg border border-primary/30 bg-background/90 backdrop-blur overflow-hidden">
          <div className="px-2 py-1 border-b border-primary/20 bg-primary/10">
            <p className="text-[9px] font-mono text-primary flex items-center gap-1">
              <Brain className="h-2.5 w-2.5" />
              LOG NEURAL
            </p>
          </div>
          <div className="p-1.5 space-y-0.5 max-h-20 overflow-hidden">
            {systemStatus.slice(-3).map((status, idx) => (
              <p 
                key={idx} 
                className={cn(
                  "text-[9px] font-mono transition-opacity duration-500 truncate",
                  idx === systemStatus.length - 1 ? "text-primary" : "text-muted-foreground"
                )}
              >
                &gt; {status}
              </p>
            ))}
            {systemStatus.length === 0 && (
              <p className="text-[9px] font-mono text-muted-foreground animate-pulse">
                &gt; INICIANDO...
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
