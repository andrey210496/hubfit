import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, MessageSquare, TrendingUp, Users, Sparkles } from 'lucide-react';

interface CategoryData {
  category: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  topKeywords: { word: string; count: number }[];
  sampleMessages: string[];
}

interface NodeDetailPanelProps {
  category: CategoryData;
  color: string;
  onClose: () => void;
  aiSuggestion?: string;
  isLoadingSuggestion?: boolean;
}

export function NodeDetailPanel({ 
  category, 
  color, 
  onClose, 
  aiSuggestion,
  isLoadingSuggestion 
}: NodeDetailPanelProps) {
  return (
    <Card className="absolute right-4 top-4 bottom-4 w-80 bg-card/95 backdrop-blur-xl border-border shadow-2xl z-10 flex flex-col animate-slide-in-right">
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span 
              className="w-4 h-4 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <CardTitle className="text-lg">{category.category}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1">
        <CardContent className="space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <MessageSquare className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{category.count}</p>
              <p className="text-xs text-muted-foreground">Menções</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{category.percentage.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">do Total</p>
            </div>
          </div>

          {/* Top Keywords */}
          {category.topKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Palavras-chave
              </h4>
              <div className="flex flex-wrap gap-1">
                {category.topKeywords.map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {kw.word} ({kw.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* AI Suggestion */}
          <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              Sugestão da IA
            </h4>
            {isLoadingSuggestion ? (
              <div className="space-y-2">
                <div className="h-3 bg-primary/20 rounded animate-pulse" />
                <div className="h-3 bg-primary/20 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-primary/20 rounded animate-pulse w-1/2" />
              </div>
            ) : aiSuggestion ? (
              <p className="text-sm text-muted-foreground">{aiSuggestion}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Analisando padrões...
              </p>
            )}
          </div>

          {/* Sample Messages */}
          {category.sampleMessages.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Mensagens de exemplo
              </h4>
              <div className="space-y-2">
                {category.sampleMessages.slice(0, 3).map((msg, i) => (
                  <div 
                    key={i} 
                    className="bg-muted/30 rounded-lg p-2 text-xs text-muted-foreground border-l-2"
                    style={{ borderLeftColor: color }}
                  >
                    "{msg.length > 100 ? msg.slice(0, 100) + '...' : msg}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
