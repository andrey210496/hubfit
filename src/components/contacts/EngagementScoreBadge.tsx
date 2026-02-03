import { Badge } from '@/components/ui/badge';
import { Flame, TrendingUp, ThermometerSun, Snowflake, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

interface EngagementScoreBadgeProps {
  level: string | null;
  score: number | null;
  className?: string;
  showScore?: boolean;
  size?: 'sm' | 'md';
}

export function EngagementScoreBadge({ 
  level, 
  score, 
  className, 
  showScore = false,
  size = 'md' 
}: EngagementScoreBadgeProps) {
  const getLevelConfig = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'hot':
        return {
          icon: Flame,
          label: 'Quente',
          color: 'text-red-500',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/30',
          description: 'Contato altamente engajado. Alta probabilidade de conversão.',
          progressColor: 'bg-red-500',
        };
      case 'warm':
        return {
          icon: TrendingUp,
          label: 'Morno',
          color: 'text-orange-500',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-500/30',
          description: 'Contato com bom engajamento. Continue nutrindo esse relacionamento.',
          progressColor: 'bg-orange-500',
        };
      case 'lukewarm':
        return {
          icon: ThermometerSun,
          label: 'Tépido',
          color: 'text-yellow-500',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/30',
          description: 'Contato com algum engajamento. Pode precisar de mais atenção.',
          progressColor: 'bg-yellow-500',
        };
      case 'cold':
        return {
          icon: Snowflake,
          label: 'Frio',
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/20',
          borderColor: 'border-blue-400/30',
          description: 'Contato com baixo engajamento. Considere uma estratégia de reengajamento.',
          progressColor: 'bg-blue-400',
        };
      default:
        return {
          icon: UserPlus,
          label: 'Novo',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          description: 'Contato novo, sem interações suficientes para avaliar.',
          progressColor: 'bg-muted-foreground',
        };
    }
  };

  const config = getLevelConfig(level);
  const Icon = config.icon;
  const scoreValue = score ?? 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'gap-1 cursor-help',
              config.bgColor,
              config.color,
              config.borderColor,
              size === 'sm' && 'text-xs py-0',
              className
            )}
          >
            <Icon className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
            {config.label}
            {showScore && scoreValue > 0 && (
              <span className="ml-1 font-mono text-xs opacity-75">{scoreValue}</span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm font-medium">{config.description}</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Score de Engajamento</span>
                <span className="font-mono">{scoreValue}/100</span>
              </div>
              <Progress value={scoreValue} className="h-1.5" />
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
