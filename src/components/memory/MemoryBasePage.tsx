import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, RefreshCw, TrendingUp, MessageSquare, AlertTriangle, 
  CreditCard, HelpCircle, Users, Dumbbell, Clock,
  UserPlus, Heart, Medal, BarChart3, Network, Sparkles, Cpu, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ForceGraph2D from 'react-force-graph-2d';
import { NeuralParticles } from './NeuralParticles';
import { NodeDetailPanel } from './NodeDetailPanel';
import { AlertBanner } from './AlertBanner';
import { CyberpunkGrid } from './CyberpunkGrid';
import { HolographicOverlay } from './HolographicOverlay';
import { AIHeader } from './AIHeader';

// Theme categories for gyms and CrossFit boxes
const THEME_CATEGORIES = {
  'Matrículas & Planos': {
    keywords: ['matrícula', 'matricula', 'plano', 'mensalidade', 'anual', 'trimestral', 'semestral', 'inscrição', 'inscrever', 'começar', 'iniciar', 'entrar', 'fazer parte', 'preço', 'valor', 'quanto custa', 'promoção', 'desconto', 'pacote', 'black friday', 'oferta'],
    color: '#10B981',
    icon: UserPlus,
    actionLabel: 'Novos alunos interessados',
  },
  'Horários & Aulas': {
    keywords: ['horário', 'horario', 'aula', 'treino', 'wod', 'turma', 'vaga', 'lotado', 'cheio', 'disponível', 'manhã', 'tarde', 'noite', 'sábado', 'sabado', 'domingo', 'feriado', 'grade', 'calendário', 'funciona', 'abre', 'fecha', 'funcionamento'],
    color: '#3B82F6',
    icon: Clock,
    actionLabel: 'Dúvidas sobre grade',
  },
  'Pagamentos & Financeiro': {
    keywords: ['boleto', 'pix', 'cartão', 'pagar', 'pagamento', 'vencimento', 'atrasado', 'atraso', 'débito', 'fatura', 'parcela', 'mensalidade', 'cobrança', 'recibo', 'nota', 'reembolso', 'cancelar plano', 'renovar', 'renovação'],
    color: '#8B5CF6',
    icon: CreditCard,
    actionLabel: 'Questões financeiras',
  },
  'Treinos & Performance': {
    keywords: ['treino', 'wod', 'pr', 'personal', 'evolução', 'resultado', 'peso', 'carga', 'repetição', 'série', 'exercício', 'técnica', 'movimento', 'crossfit', 'musculação', 'funcional', 'hiit', 'cardio', 'força', 'condicionamento', 'emagrecer', 'ganhar massa'],
    color: '#F59E0B',
    icon: Dumbbell,
    actionLabel: 'Orientação de treino',
  },
  'Problemas & Reclamações': {
    keywords: ['problema', 'reclamação', 'reclamar', 'ruim', 'péssimo', 'insatisfeito', 'cancelar', 'desistir', 'sujo', 'quebrado', 'defeito', 'manutenção', 'equipamento', 'ar condicionado', 'vestiário', 'chuveiro', 'armário', 'barulho', 'lotado', 'demora', 'atendimento ruim'],
    color: '#EF4444',
    icon: AlertTriangle,
    actionLabel: 'Requer atenção imediata',
  },
  'Saúde & Bem-estar': {
    keywords: ['lesão', 'lesionado', 'dor', 'machucado', 'médico', 'atestado', 'fisioterapia', 'nutrição', 'nutricionista', 'dieta', 'suplemento', 'whey', 'creatina', 'saúde', 'recuperação', 'descanso', 'alongamento', 'aquecimento'],
    color: '#EC4899',
    icon: Heart,
    actionLabel: 'Cuidados com saúde',
  },
  'Competições & Eventos': {
    keywords: ['competição', 'campeonato', 'evento', 'desafio', 'challenge', 'throwdown', 'open', 'games', 'ranking', 'equipe', 'time', 'dupla', 'inscrição evento', 'medalha', 'pódio', 'classificação'],
    color: '#F97316',
    icon: Medal,
    actionLabel: 'Eventos e competições',
  },
  'Informações Gerais': {
    keywords: ['informação', 'dúvida', 'pergunta', 'como funciona', 'onde fica', 'endereço', 'localização', 'estacionamento', 'contato', 'telefone', 'whatsapp', 'instagram', 'rede social', 'site'],
    color: '#06B6D4',
    icon: HelpCircle,
    actionLabel: 'Perguntas frequentes',
  },
};

type ThemeCategory = keyof typeof THEME_CATEGORIES;

interface CategoryData {
  category: ThemeCategory;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  topKeywords: { word: string; count: number }[];
  sampleMessages: string[];
}

interface CategoryConnection {
  source: ThemeCategory;
  target: ThemeCategory;
  count: number;
}

interface AnalysisResult {
  totalMessages: number;
  totalContacts: number;
  categories: CategoryData[];
  connections: CategoryConnection[];
  periodDays: number;
}

interface GraphNode {
  id: string;
  name: string;
  count: number;
  val: number;
  color: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  value: number;
}

const categorizeMessage = (body: string): ThemeCategory[] => {
  const normalizedBody = body.toLowerCase();
  const matches: ThemeCategory[] = [];
  
  for (const [category, { keywords }] of Object.entries(THEME_CATEGORIES)) {
    if (keywords.some(kw => normalizedBody.includes(kw))) {
      matches.push(category as ThemeCategory);
    }
  }
  
  return matches.length > 0 ? matches : [];
};

interface Alert {
  id: string;
  category: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  color: string;
}

export function MemoryBasePage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [previousCounts, setPreviousCounts] = useState<Map<string, number>>(new Map());
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [, setTick] = useState(0); // Force re-render for continuous animations

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(400, width), height: Math.max(400, height) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Continuous animation tick
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 50); // 20 FPS for smooth animations
    return () => clearInterval(interval);
  }, []);

  // Check for alerts when analysis updates
  useEffect(() => {
    if (!analysis) return;

    const newAlerts: Alert[] = [];
    
    analysis.categories.forEach(cat => {
      const prevCount = previousCounts.get(cat.category) || 0;
      const increase = cat.count - prevCount;
      
      // Alert for significant increases
      if (prevCount > 0 && increase > 5) {
        const isCritical = cat.category === 'Problemas & Reclamações';
        newAlerts.push({
          id: `${cat.category}-${Date.now()}`,
          category: cat.category,
          message: `+${increase} novas menções detectadas`,
          type: isCritical ? 'critical' : 'warning',
          color: THEME_CATEGORIES[cat.category as ThemeCategory].color,
        });
      }
      
      // Alert for critical categories with high volume
      if (cat.category === 'Problemas & Reclamações' && cat.percentage > 15) {
        if (!alerts.find(a => a.category === cat.category)) {
          newAlerts.push({
            id: `critical-${cat.category}`,
            category: cat.category,
            message: `${cat.percentage.toFixed(1)}% das conversas - atenção necessária`,
            type: 'critical',
            color: THEME_CATEGORIES[cat.category as ThemeCategory].color,
          });
        }
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 5));
      // Play notification sound for critical alerts
      if (newAlerts.some(a => a.type === 'critical')) {
        toast.warning('Alerta: Aumento em categoria crítica!');
      }
    }

    // Update previous counts
    const newCounts = new Map<string, number>();
    analysis.categories.forEach(cat => {
      newCounts.set(cat.category, cat.count);
    });
    setPreviousCounts(newCounts);
  }, [analysis]);

  // Fetch AI suggestion when a category is selected
  const fetchAiSuggestion = useCallback(async (category: CategoryData) => {
    setIsLoadingSuggestion(true);
    setAiSuggestion('');
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-memory-patterns', {
        body: {
          category: category.category,
          count: category.count,
          percentage: category.percentage,
          sampleMessages: category.sampleMessages,
          topKeywords: category.topKeywords,
        }
      });

      if (error) throw error;
      setAiSuggestion(data.suggestion || 'Não foi possível gerar sugestão.');
    } catch (error) {
      console.error('Error fetching AI suggestion:', error);
      setAiSuggestion('Erro ao gerar sugestão. Tente novamente.');
    } finally {
      setIsLoadingSuggestion(false);
    }
  }, []);

  const handleDismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const analyzeMessages = useCallback(async () => {
    if (!profile?.company_id) return;

    setLoading(true);
    try {
      const { data: individualTickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, contact_id')
        .eq('company_id', profile.company_id)
        .eq('is_group', false);

      if (ticketsError) throw ticketsError;

      const ticketIds = individualTickets?.map(t => t.id) || [];
      const uniqueContacts = new Set(individualTickets?.map(t => t.contact_id) || []);

      if (ticketIds.length === 0) {
        setAnalysis({
          totalMessages: 0,
          totalContacts: 0,
          categories: [],
          connections: [],
          periodDays: 30
        });
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: messages, error } = await supabase
        .from('messages')
        .select('body, from_me, created_at')
        .eq('company_id', profile.company_id)
        .in('ticket_id', ticketIds)
        .eq('from_me', false)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('body', 'is', null)
        .limit(5000);

      if (error) throw error;

      const categoryStats = new Map<ThemeCategory, { 
        count: number; 
        keywords: Map<string, number>;
        samples: string[];
      }>();

      const connectionCounts = new Map<string, number>();

      Object.keys(THEME_CATEGORIES).forEach(cat => {
        categoryStats.set(cat as ThemeCategory, { 
          count: 0, 
          keywords: new Map(),
          samples: []
        });
      });

      messages?.forEach(msg => {
        if (!msg.body || msg.body.length < 5) return;
        
        const categories = categorizeMessage(msg.body);
        
        if (categories.length > 1) {
          for (let i = 0; i < categories.length; i++) {
            for (let j = i + 1; j < categories.length; j++) {
              const key = [categories[i], categories[j]].sort().join('|');
              connectionCounts.set(key, (connectionCounts.get(key) || 0) + 1);
            }
          }
        }
        
        categories.forEach(cat => {
          const stats = categoryStats.get(cat)!;
          stats.count++;
          
          const normalizedBody = msg.body.toLowerCase();
          THEME_CATEGORIES[cat].keywords.forEach(kw => {
            if (normalizedBody.includes(kw)) {
              stats.keywords.set(kw, (stats.keywords.get(kw) || 0) + 1);
            }
          });
          
          if (stats.samples.length < 5 && msg.body.length > 10 && msg.body.length < 200) {
            stats.samples.push(msg.body);
          }
        });
      });

      const totalCategorized = Array.from(categoryStats.values()).reduce((sum, s) => sum + s.count, 0);
      
      const categories: CategoryData[] = Array.from(categoryStats.entries())
        .map(([category, stats]) => ({
          category,
          count: stats.count,
          percentage: totalCategorized > 0 ? (stats.count / totalCategorized) * 100 : 0,
          trend: 'stable' as const,
          topKeywords: Array.from(stats.keywords.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count]) => ({ word, count })),
          sampleMessages: stats.samples
        }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);

      const connections: CategoryConnection[] = Array.from(connectionCounts.entries())
        .map(([key, count]) => {
          const [source, target] = key.split('|') as [ThemeCategory, ThemeCategory];
          return { source, target, count };
        })
        .filter(c => c.count >= 1)
        .sort((a, b) => b.count - a.count);

      setAnalysis({
        totalMessages: messages?.length || 0,
        totalContacts: uniqueContacts.size,
        categories,
        connections,
        periodDays: 30
      });

      toast.success('Análise concluída!');
    } catch (error: any) {
      console.error('Error analyzing messages:', error);
      toast.error('Erro ao analisar mensagens');
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    analyzeMessages();
  }, [analyzeMessages]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!profile?.company_id) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          // Re-analyze when new messages arrive
          analyzeMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, analyzeMessages]);

  // Build graph data from analysis with central AI Brain node
  const graphData = useMemo(() => {
    if (!analysis || analysis.categories.length === 0) {
      return { nodes: [], links: [] };
    }

    const maxCount = Math.max(...analysis.categories.map(c => c.count));
    const totalMessages = analysis.totalMessages;
    const numCategories = analysis.categories.length;
    const radius = 280; // Distance from center for theme nodes

    // Central AI Brain node - fixed at center
    const centralNode: GraphNode = {
      id: 'ai-brain',
      name: 'IA Central',
      count: totalMessages,
      val: 50,
      color: '#8B5CF6',
      fx: 0,
      fy: 0,
    };

    // Theme nodes arranged in a circle around the center
    const themeNodes: GraphNode[] = analysis.categories.map((cat, index) => {
      const angle = (index / numCategories) * 2 * Math.PI - Math.PI / 2; // Start from top
      return {
        id: cat.category,
        name: cat.category,
        count: cat.count,
        val: 12 + (cat.count / maxCount) * 18,
        color: THEME_CATEGORIES[cat.category].color,
        fx: Math.cos(angle) * radius, // Fixed position in circle
        fy: Math.sin(angle) * radius,
      };
    });

    const nodes: GraphNode[] = [centralNode, ...themeNodes];

    // All theme nodes connect to the central AI Brain
    const links: GraphLink[] = analysis.categories.map(cat => ({
      source: 'ai-brain',
      target: cat.category,
      value: cat.count,
    }));

    // Also add connections between related themes (optional secondary connections)
    analysis.connections.slice(0, 5).forEach(conn => {
      links.push({
        source: conn.source,
        target: conn.target,
        value: conn.count * 0.3,
      });
    });

    return { nodes, links };
  }, [analysis]);

  const mainCategory = analysis?.categories[0];
  const problemCategory = analysis?.categories.find(c => c.category === 'Problemas & Reclamações');

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    
    // Find the category data for this node
    if (node.id !== 'ai-brain' && analysis) {
      const categoryData = analysis.categories.find(c => c.category === node.id);
      if (categoryData) {
        setSelectedCategory(categoryData);
        fetchAiSuggestion(categoryData);
      }
    } else {
      setSelectedCategory(null);
    }
    
    if (graphRef.current && Number.isFinite(node.x) && Number.isFinite(node.y)) {
      graphRef.current.centerAt(node.x, node.y, 500);
      graphRef.current.zoom(2, 500);
    }
  }, [analysis, fetchAiSuggestion]);

  const handleCloseDetailPanel = useCallback(() => {
    setSelectedCategory(null);
    setSelectedNode(null);
    setAiSuggestion('');
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 60);
    }
  }, []);

  // Center graph when it loads
  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return;

    const t = window.setTimeout(() => {
      graphRef.current?.zoomToFit(400, 60);
    }, 250);

    return () => window.clearTimeout(t);
  }, [graphData, loading]);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Global background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 pointer-events-none" />
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at 30% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(6, 182, 212, 0.1) 0%, transparent 40%)',
        }}
      />
      
      {/* Header */}
      <div className="flex-shrink-0 border-b border-primary/20 relative z-10">
        <AIHeader 
          onRefresh={analyzeMessages} 
          loading={loading} 
          periodDays={analysis?.periodDays || 30} 
        />
      </div>

      {loading ? (
        <div className="flex-1 p-6 relative">
          {/* Loading state with futuristic styling */}
          <div className="absolute inset-6 rounded-2xl border border-primary/20 bg-background/50 backdrop-blur overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                  <Brain className="h-16 w-16 text-primary animate-pulse relative" />
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-mono text-primary animate-pulse">PROCESSANDO DADOS NEURAIS...</p>
                  <div className="flex items-center justify-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div 
                        key={i}
                        className="w-2 h-8 bg-primary/30 rounded animate-pulse"
                        style={{ animationDelay: `${i * 0.1}s`, animationDuration: '1s' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !analysis || analysis.totalMessages === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6 relative">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full animate-pulse" />
            <Card className="relative p-8 text-center max-w-md border-primary/20 bg-card/80 backdrop-blur">
              <Brain className="h-12 w-12 text-primary/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold font-mono">NENHUM DADO DETECTADO</h3>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                AGUARDANDO ENTRADA NEURAL • JANELA DE 30 DIAS
              </p>
            </Card>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="neural" className="flex-1 flex flex-col min-h-0 relative z-10">
          <div className="flex-shrink-0 px-4 md:px-6 pt-4">
            <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/50 border border-primary/20">
              <TabsTrigger value="neural" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono">
                <Network className="h-4 w-4" />
                MAPA NEURAL
              </TabsTrigger>
              <TabsTrigger value="insights" className="gap-2 data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-mono">
                <BarChart3 className="h-4 w-4" />
                INSIGHTS
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="neural" className="flex-1 min-h-0 mt-0">
            <div className="h-full p-4 md:p-6 flex gap-4">
              {/* Neural Graph */}
              <div 
                ref={containerRef}
                className="flex-1 relative rounded-2xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
                style={{
                  boxShadow: '0 0 60px rgba(139, 92, 246, 0.15), inset 0 0 60px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Cyberpunk Grid Background */}
                <CyberpunkGrid width={dimensions.width} height={dimensions.height} />
                
                {/* Neural Particles Overlay */}
                <NeuralParticles width={dimensions.width} height={dimensions.height} intensity="high" />
                
                {/* Holographic Overlay with HUD elements */}
                <HolographicOverlay 
                  totalMessages={analysis.totalMessages} 
                  totalContacts={analysis.totalContacts}
                  activeCategories={analysis.categories.length}
                />
                
                {/* Alert Banner */}
                <AlertBanner alerts={alerts} onDismiss={handleDismissAlert} />
                {graphData.nodes.length > 0 ? (
                  <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeLabel=""
                    nodeColor={node => (node as GraphNode).color}
                    nodeVal={node => (node as GraphNode).val}
                    nodeCanvasObject={(node: any, ctx, globalScale) => {
                      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                      
                      const size = node.val || 10;
                      const x = node.x;
                      const y = node.y;
                      const isHovered = hoveredNode?.id === node.id;
                      const isSelected = selectedNode?.id === node.id;
                      const isCentralBrain = node.id === 'ai-brain';
                      
                      if (isCentralBrain) {
                        // FUTURISTIC AI PROCESSOR BRAIN DESIGN
                        const time = Date.now() * 0.001;
                        const coreSize = size * 1.1;
                        
                        // Outer scanning rings
                        for (let ring = 0; ring < 3; ring++) {
                          const ringRadius = coreSize + 25 + ring * 18;
                          const ringRotation = time * (0.3 + ring * 0.15) * (ring % 2 === 0 ? 1 : -1);
                          const dashLength = 15 + ring * 5;
                          const gapLength = 10 + ring * 3;
                          
                          ctx.save();
                          ctx.translate(x, y);
                          ctx.rotate(ringRotation);
                          
                          ctx.beginPath();
                          ctx.setLineDash([dashLength, gapLength]);
                          ctx.arc(0, 0, ringRadius, 0, 2 * Math.PI);
                          ctx.strokeStyle = `rgba(139, 92, 246, ${0.4 - ring * 0.1})`;
                          ctx.lineWidth = 2 - ring * 0.4;
                          ctx.stroke();
                          ctx.setLineDash([]);
                          
                          // Data points on ring
                          const numPoints = 6 + ring * 2;
                          for (let p = 0; p < numPoints; p++) {
                            const pointAngle = (p / numPoints) * Math.PI * 2;
                            const px = Math.cos(pointAngle) * ringRadius;
                            const py = Math.sin(pointAngle) * ringRadius;
                            const pulse = (Math.sin(time * 4 + p + ring) + 1) / 2;
                            
                            ctx.beginPath();
                            ctx.arc(px, py, 2 + pulse * 1.5, 0, 2 * Math.PI);
                            ctx.fillStyle = `rgba(139, 92, 246, ${0.5 + pulse * 0.5})`;
                            ctx.fill();
                          }
                          
                          ctx.restore();
                        }
                        
                        // Hexagonal core container
                        ctx.save();
                        ctx.translate(x, y);
                        
                        const drawHexagon = (size: number, rotation: number = 0) => {
                          ctx.beginPath();
                          for (let i = 0; i < 6; i++) {
                            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2 + rotation;
                            const hx = Math.cos(angle) * size;
                            const hy = Math.sin(angle) * size;
                            if (i === 0) ctx.moveTo(hx, hy);
                            else ctx.lineTo(hx, hy);
                          }
                          ctx.closePath();
                        };
                        
                        // Outer hexagon glow
                        for (let g = 3; g > 0; g--) {
                          const glowSize = coreSize + g * 8;
                          drawHexagon(glowSize, time * 0.1);
                          ctx.fillStyle = `rgba(139, 92, 246, ${0.03 * g})`;
                          ctx.fill();
                        }
                        
                        // Main hexagon with gradient
                        const hexGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize);
                        hexGradient.addColorStop(0, '#1E1B4B');
                        hexGradient.addColorStop(0.5, '#312E81');
                        hexGradient.addColorStop(0.8, '#4C1D95');
                        hexGradient.addColorStop(1, '#6D28D9');
                        
                        drawHexagon(coreSize, time * 0.05);
                        ctx.fillStyle = hexGradient;
                        ctx.shadowColor = '#8B5CF6';
                        ctx.shadowBlur = 30;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        
                        // Hexagon border
                        drawHexagon(coreSize, time * 0.05);
                        ctx.strokeStyle = '#A78BFA';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        // Inner hexagon
                        drawHexagon(coreSize * 0.75, -time * 0.08);
                        ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        
                        // Circuit board pattern inside
                        ctx.strokeStyle = 'rgba(139, 92, 246, 0.3)';
                        ctx.lineWidth = 1;
                        
                        // Horizontal circuit lines
                        for (let l = -2; l <= 2; l++) {
                          const ly = l * coreSize * 0.2;
                          const lWidth = coreSize * (0.8 - Math.abs(l) * 0.15);
                          ctx.beginPath();
                          ctx.moveTo(-lWidth, ly);
                          ctx.lineTo(lWidth, ly);
                          ctx.stroke();
                          
                          // Circuit nodes
                          for (let n = -2; n <= 2; n++) {
                            const nx = n * lWidth * 0.4;
                            const nodePulse = (Math.sin(time * 3 + l + n) + 1) / 2;
                            ctx.beginPath();
                            ctx.rect(nx - 3, ly - 3, 6, 6);
                            ctx.fillStyle = `rgba(167, 139, 250, ${0.4 + nodePulse * 0.6})`;
                            ctx.fill();
                          }
                        }
                        
                        // Central AI core
                        const coreRadius = coreSize * 0.35;
                        const corePulse = (Math.sin(time * 2) + 1) / 2;
                        
                        // Core glow
                        const coreGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius * 1.5);
                        coreGlow.addColorStop(0, `rgba(139, 92, 246, ${0.8 + corePulse * 0.2})`);
                        coreGlow.addColorStop(0.5, 'rgba(139, 92, 246, 0.3)');
                        coreGlow.addColorStop(1, 'rgba(139, 92, 246, 0)');
                        
                        ctx.beginPath();
                        ctx.arc(0, 0, coreRadius * 1.5, 0, 2 * Math.PI);
                        ctx.fillStyle = coreGlow;
                        ctx.fill();
                        
                        // Core circle
                        ctx.beginPath();
                        ctx.arc(0, 0, coreRadius, 0, 2 * Math.PI);
                        ctx.fillStyle = '#6D28D9';
                        ctx.fill();
                        ctx.strokeStyle = '#A78BFA';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                        
                        // AI symbol inside core
                        ctx.font = 'bold 16px "Courier New", monospace';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#E0E7FF';
                        ctx.fillText('AI', 0, 0);
                        
                        // Orbiting data particles
                        for (let o = 0; o < 8; o++) {
                          const orbitAngle = (o / 8) * Math.PI * 2 + time * 1.5;
                          const orbitRadius = coreSize * 0.55;
                          const ox = Math.cos(orbitAngle) * orbitRadius;
                          const oy = Math.sin(orbitAngle) * orbitRadius;
                          const oPulse = (Math.sin(time * 5 + o) + 1) / 2;
                          
                          ctx.beginPath();
                          ctx.arc(ox, oy, 3 + oPulse * 2, 0, 2 * Math.PI);
                          ctx.fillStyle = `rgba(224, 231, 255, ${0.6 + oPulse * 0.4})`;
                          ctx.fill();
                        }
                        
                        // Corner brackets (tech frame)
                        const bracketSize = coreSize * 0.9;
                        const bracketLength = 15;
                        ctx.strokeStyle = '#A78BFA';
                        ctx.lineWidth = 2;
                        
                        const corners = [
                          { x: -bracketSize, y: -bracketSize * 0.85, dx: 1, dy: 1 },
                          { x: bracketSize, y: -bracketSize * 0.85, dx: -1, dy: 1 },
                          { x: -bracketSize, y: bracketSize * 0.85, dx: 1, dy: -1 },
                          { x: bracketSize, y: bracketSize * 0.85, dx: -1, dy: -1 },
                        ];
                        
                        corners.forEach(corner => {
                          ctx.beginPath();
                          ctx.moveTo(corner.x + corner.dx * bracketLength, corner.y);
                          ctx.lineTo(corner.x, corner.y);
                          ctx.lineTo(corner.x, corner.y + corner.dy * bracketLength);
                          ctx.stroke();
                        });
                        
                        ctx.restore();
                        
                        // Label
                        const fontSize = Math.max(11, 13 / globalScale);
                        ctx.font = `600 ${fontSize}px "Courier New", monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fillText('◉ NÚCLEO IA', x + 1, y + coreSize + 35);
                        ctx.fillStyle = '#E0E7FF';
                        ctx.fillText('◉ NÚCLEO IA', x, y + coreSize + 34);
                        
                      } else {
                        // FUTURISTIC HEXAGONAL TECH NODES
                        const time = Date.now() * 0.001;
                        const nodeSize = size;
                        
                        ctx.save();
                        ctx.translate(x, y);
                        
                        // Helper function to draw hexagon
                        const drawHexNode = (s: number, rotation: number = 0) => {
                          ctx.beginPath();
                          for (let i = 0; i < 6; i++) {
                            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2 + rotation;
                            const hx = Math.cos(angle) * s;
                            const hy = Math.sin(angle) * s;
                            if (i === 0) ctx.moveTo(hx, hy);
                            else ctx.lineTo(hx, hy);
                          }
                          ctx.closePath();
                        };
                        
                        // Outer glow rings
                        const glowIntensity = isHovered || isSelected ? 1.5 : 1;
                        for (let g = 3; g > 0; g--) {
                          const glowSize = nodeSize + g * 6 * glowIntensity;
                          drawHexNode(glowSize);
                          ctx.fillStyle = node.color;
                          ctx.globalAlpha = (0.08 / g) * glowIntensity;
                          ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                        
                        // Scanning effect ring
                        const scanAngle = time * 2;
                        ctx.beginPath();
                        ctx.arc(0, 0, nodeSize + 8, scanAngle, scanAngle + Math.PI * 0.5);
                        ctx.strokeStyle = node.color;
                        ctx.lineWidth = 2;
                        ctx.globalAlpha = 0.6;
                        ctx.stroke();
                        ctx.globalAlpha = 1;
                        
                        // Main hexagon body
                        const nodeGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, nodeSize);
                        
                        // Parse the hex color to create darker version
                        const hexColor = node.color.replace('#', '');
                        const r = parseInt(hexColor.substr(0, 2), 16);
                        const g = parseInt(hexColor.substr(2, 2), 16);
                        const b = parseInt(hexColor.substr(4, 2), 16);
                        
                        nodeGradient.addColorStop(0, `rgba(${Math.floor(r*0.3)}, ${Math.floor(g*0.3)}, ${Math.floor(b*0.3)}, 1)`);
                        nodeGradient.addColorStop(0.7, `rgba(${Math.floor(r*0.6)}, ${Math.floor(g*0.6)}, ${Math.floor(b*0.6)}, 1)`);
                        nodeGradient.addColorStop(1, node.color);
                        
                        drawHexNode(nodeSize);
                        ctx.fillStyle = nodeGradient;
                        ctx.shadowColor = node.color;
                        ctx.shadowBlur = isHovered || isSelected ? 20 : 10;
                        ctx.fill();
                        ctx.shadowBlur = 0;
                        
                        // Hexagon border
                        drawHexNode(nodeSize);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        
                        // Inner tech pattern
                        drawHexNode(nodeSize * 0.65);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        
                        // Data circuit lines inside
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(-nodeSize * 0.4, 0);
                        ctx.lineTo(nodeSize * 0.4, 0);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(0, -nodeSize * 0.4);
                        ctx.lineTo(0, nodeSize * 0.4);
                        ctx.stroke();
                        
                        // Corner indicators
                        for (let c = 0; c < 6; c++) {
                          const cornerAngle = (c / 6) * Math.PI * 2 - Math.PI / 2;
                          const cx = Math.cos(cornerAngle) * nodeSize;
                          const cy = Math.sin(cornerAngle) * nodeSize;
                          const pulse = (Math.sin(time * 3 + c) + 1) / 2;
                          
                          ctx.beginPath();
                          ctx.arc(cx, cy, 2 + pulse, 0, 2 * Math.PI);
                          ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
                          ctx.fill();
                        }
                        
                        // Count display with tech styling
                        const countText = node.count.toString();
                        ctx.font = `bold ${Math.max(10, nodeSize * 0.5)}px "Courier New", monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Count background
                        const countWidth = ctx.measureText(countText).width + 8;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                        ctx.fillRect(-countWidth / 2, -8, countWidth, 16);
                        
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(countText, 0, 0);
                        
                        ctx.restore();
                        
                        // Label with tech styling
                        const label = node.name.split('&')[0].trim().toUpperCase();
                        const fontSize = Math.max(9, 11 / globalScale);
                        ctx.font = `bold ${fontSize}px "Courier New", monospace`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        
                        // Label background
                        const labelWidth = ctx.measureText(label).width + 12;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fillRect(x - labelWidth / 2, y + nodeSize + 8, labelWidth, fontSize + 6);
                        
                        // Label border
                        ctx.strokeStyle = node.color;
                        ctx.lineWidth = 1;
                        ctx.strokeRect(x - labelWidth / 2, y + nodeSize + 8, labelWidth, fontSize + 6);
                        
                        ctx.fillStyle = '#FFFFFF';
                        ctx.fillText(label, x, y + nodeSize + 11 + fontSize / 2);
                      }
                    }}
                    linkCanvasObject={(link: any, ctx) => {
                      const sourceNode = typeof link.source === 'object' ? link.source : graphData.nodes.find(n => n.id === link.source);
                      const targetNode = typeof link.target === 'object' ? link.target : graphData.nodes.find(n => n.id === link.target);
                      
                      if (!sourceNode || !targetNode) return;
                      if (!Number.isFinite(sourceNode.x) || !Number.isFinite(sourceNode.y) || 
                          !Number.isFinite(targetNode.x) || !Number.isFinite(targetNode.y)) return;
                      
                      const isCentralConnection = sourceNode.id === 'ai-brain' || targetNode.id === 'ai-brain';
                      const thickness = isCentralConnection 
                        ? Math.sqrt(link.value) * 0.8 + 1.5 
                        : Math.sqrt(link.value) * 0.5 + 0.5;
                      
                      const lineColor = isCentralConnection ? '#8B5CF6' : targetNode.color;
                      
                      // Draw straight line for central connections, curved for others
                      if (isCentralConnection) {
                        // Gradient line from center
                        const gradient = ctx.createLinearGradient(sourceNode.x, sourceNode.y, targetNode.x, targetNode.y);
                        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.6)');
                        gradient.addColorStop(0.5, `${targetNode.color}40`);
                        gradient.addColorStop(1, `${targetNode.color}80`);
                        
                        // Outer glow
                        ctx.beginPath();
                        ctx.moveTo(sourceNode.x, sourceNode.y);
                        ctx.lineTo(targetNode.x, targetNode.y);
                        ctx.strokeStyle = `${lineColor}20`;
                        ctx.lineWidth = thickness + 4;
                        ctx.stroke();
                        
                        // Main line
                        ctx.beginPath();
                        ctx.moveTo(sourceNode.x, sourceNode.y);
                        ctx.lineTo(targetNode.x, targetNode.y);
                        ctx.strokeStyle = gradient;
                        ctx.lineWidth = thickness;
                        ctx.stroke();
                        
                        // Animated pulses along the connection
                        const time = Date.now() * 0.001;
                        const numPulses = 2;
                        
                        for (let i = 0; i < numPulses; i++) {
                          const t = ((time * 0.5 + i / numPulses) % 1);
                          const px = sourceNode.x + (targetNode.x - sourceNode.x) * t;
                          const py = sourceNode.y + (targetNode.y - sourceNode.y) * t;
                          
                          ctx.beginPath();
                          ctx.arc(px, py, 4, 0, 2 * Math.PI);
                          ctx.fillStyle = `${lineColor}40`;
                          ctx.fill();
                          
                          ctx.beginPath();
                          ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
                          ctx.fillStyle = lineColor;
                          ctx.fill();
                        }
                      } else {
                        // Curved connection between themes
                        const midX = (sourceNode.x + targetNode.x) / 2;
                        const midY = (sourceNode.y + targetNode.y) / 2;
                        const dx = targetNode.x - sourceNode.x;
                        const dy = targetNode.y - sourceNode.y;
                        const curvature = 0.3;
                        const ctrlX = midX - dy * curvature;
                        const ctrlY = midY + dx * curvature;
                        
                        // Glow
                        ctx.beginPath();
                        ctx.moveTo(sourceNode.x, sourceNode.y);
                        ctx.quadraticCurveTo(ctrlX, ctrlY, targetNode.x, targetNode.y);
                        ctx.strokeStyle = `${sourceNode.color}15`;
                        ctx.lineWidth = thickness + 2;
                        ctx.stroke();
                        
                        // Main line
                        ctx.beginPath();
                        ctx.moveTo(sourceNode.x, sourceNode.y);
                        ctx.quadraticCurveTo(ctrlX, ctrlY, targetNode.x, targetNode.y);
                        ctx.strokeStyle = `${sourceNode.color}40`;
                        ctx.lineWidth = thickness;
                        ctx.setLineDash([4, 4]);
                        ctx.stroke();
                        ctx.setLineDash([]);
                      }
                    }}
                    linkColor={() => 'transparent'}
                    linkWidth={0}
                    nodePointerAreaPaint={(node: any, color, ctx) => {
                      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                      const size = (node.val || 10) + 8;
                      ctx.fillStyle = color;
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                      ctx.fill();
                    }}
                    onNodeClick={(node) => handleNodeClick(node as GraphNode)}
                    onNodeHover={(node) => setHoveredNode(node as GraphNode | null)}
                    cooldownTicks={Infinity}
                    cooldownTime={Infinity}
                    d3AlphaDecay={0}
                    d3VelocityDecay={0.4}
                    warmupTicks={50}
                    enableNodeDrag={false}
                    enableZoomInteraction={true}
                    enablePanInteraction={true}
                    minZoom={0.5}
                    maxZoom={3}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-muted-foreground">Sem dados para visualizar</p>
                  </div>
                )}

                {/* Hover tooltip - futuristic style */}
                {hoveredNode && (
                  <div className="absolute top-16 left-20 z-30 bg-background/95 backdrop-blur-xl border-2 border-primary/40 rounded-xl px-4 py-3 shadow-2xl pointer-events-none animate-fade-in"
                    style={{ boxShadow: '0 0 30px rgba(139, 92, 246, 0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span 
                        className="w-3 h-3 rounded-full animate-pulse" 
                        style={{ backgroundColor: hoveredNode.color, boxShadow: `0 0 10px ${hoveredNode.color}` }}
                      />
                      <p className="text-foreground font-bold font-mono uppercase">{hoveredNode.name}</p>
                    </div>
                    <p className="text-primary text-lg font-bold font-mono">{hoveredNode.count} <span className="text-xs text-muted-foreground">MENÇÕES</span></p>
                    <p className="text-xs text-cyan-400 mt-1 font-mono">[ CLIQUE PARA ANALISAR ]</p>
                  </div>
                )}

                {/* Legend - compact at bottom */}
                <div className="absolute bottom-2 left-2 right-2 z-30">
                  <div className="bg-background/95 backdrop-blur-xl rounded-lg p-2 border border-primary/30">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] text-primary font-mono flex items-center gap-1">
                        <Cpu className="h-2.5 w-2.5" />
                        CLUSTERS:
                      </span>
                      {analysis.categories.slice(0, 6).map((cat) => (
                        <div key={cat.category} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/30">
                          <span 
                            className="w-1.5 h-1.5 rounded-full" 
                            style={{ backgroundColor: THEME_CATEGORIES[cat.category].color }}
                          />
                          <span className="text-[10px] font-mono text-foreground">{cat.category.split('&')[0].trim()}</span>
                          <span className="text-[10px] font-mono text-primary">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {/* Node Detail Panel */}
                {selectedCategory && (
                  <NodeDetailPanel
                    category={selectedCategory}
                    color={THEME_CATEGORIES[selectedCategory.category as ThemeCategory].color}
                    onClose={handleCloseDetailPanel}
                    aiSuggestion={aiSuggestion}
                    isLoadingSuggestion={isLoadingSuggestion}
                  />
                )}
              </div>

              {/* Side panel - Connections */}
              <Card className="w-80 hidden lg:flex flex-col bg-card/50 backdrop-blur border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Conexões Neurais
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Temas que aparecem juntos nas conversas
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {analysis.connections.slice(0, 10).map((conn, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: THEME_CATEGORIES[conn.source].color }}
                            />
                            <span className="text-xs truncate">{conn.source.split('&')[0].trim()}</span>
                          </div>
                          <div className="flex-shrink-0 text-muted-foreground">
                            <Network className="h-3 w-3" />
                          </div>
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: THEME_CATEGORIES[conn.target].color }}
                            />
                            <span className="text-xs truncate">{conn.target.split('&')[0].trim()}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs flex-shrink-0">
                            {conn.count}
                          </Badge>
                        </div>
                      ))}
                      {analysis.connections.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Nenhuma conexão identificada
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="flex-1 min-h-0 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4 md:p-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Mensagens Analisadas</p>
                          <p className="text-2xl font-bold">{analysis.totalMessages}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-primary/60" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Contatos Únicos</p>
                          <p className="text-2xl font-bold">{analysis.totalContacts}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500/60" />
                      </div>
                    </CardContent>
                  </Card>
                  
                  {mainCategory && (
                    <Card 
                      className="border-2"
                      style={{ 
                        borderColor: `${THEME_CATEGORIES[mainCategory.category].color}30`,
                        background: `linear-gradient(135deg, ${THEME_CATEGORIES[mainCategory.category].color}10, transparent)`
                      }}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Tema Principal</p>
                            <p className="text-lg font-bold truncate">{mainCategory.category.split('&')[0].trim()}</p>
                            <p className="text-xs text-muted-foreground">{mainCategory.percentage.toFixed(1)}% das mensagens</p>
                          </div>
                          {(() => {
                            const Icon = THEME_CATEGORIES[mainCategory.category].icon;
                            return <Icon className="h-8 w-8" style={{ color: THEME_CATEGORIES[mainCategory.category].color }} />;
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {problemCategory && problemCategory.count > 0 && (
                    <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Alertas</p>
                            <p className="text-2xl font-bold text-red-500">{problemCategory.count}</p>
                            <p className="text-xs text-muted-foreground">Problemas reportados</p>
                          </div>
                          <AlertTriangle className="h-8 w-8 text-red-500/60" />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Category breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Distribuição por Categoria
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.categories.map((cat) => {
                        const Icon = THEME_CATEGORIES[cat.category].icon;
                        return (
                          <div key={cat.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon 
                                  className="h-4 w-4" 
                                  style={{ color: THEME_CATEGORIES[cat.category].color }}
                                />
                                <span className="text-sm font-medium">{cat.category}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">{cat.count}</span>
                                <Badge 
                                  variant="outline" 
                                  className="text-xs"
                                  style={{ borderColor: THEME_CATEGORIES[cat.category].color }}
                                >
                                  {cat.percentage.toFixed(1)}%
                                </Badge>
                              </div>
                            </div>
                            <Progress 
                              value={cat.percentage} 
                              className="h-2"
                              style={{
                                '--progress-background': THEME_CATEGORIES[cat.category].color
                              } as React.CSSProperties}
                            />
                            {cat.topKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 pl-6">
                                {cat.topKeywords.slice(0, 4).map((kw) => (
                                  <Badge key={kw.word} variant="secondary" className="text-xs">
                                    {kw.word}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Action suggestions */}
                {problemCategory && problemCategory.count > 0 && (
                  <Card className="border-red-500/30">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2 text-red-500">
                        <AlertTriangle className="h-5 w-5" />
                        Atenção Requerida
                      </CardTitle>
                      <CardDescription>
                        {problemCategory.count} mensagens identificadas como reclamações ou problemas
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Principais palavras-chave detectadas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {problemCategory.topKeywords.map((kw) => (
                            <Badge key={kw.word} variant="destructive" className="text-xs">
                              {kw.word} ({kw.count})
                            </Badge>
                          ))}
                        </div>
                        {problemCategory.sampleMessages.length > 0 && (
                          <div className="mt-4 space-y-2">
                            <p className="text-sm font-medium">Exemplos de mensagens:</p>
                            {problemCategory.sampleMessages.slice(0, 3).map((msg, idx) => (
                              <div key={idx} className="p-2 bg-muted/50 rounded text-xs text-muted-foreground italic">
                                "{msg.length > 100 ? msg.substring(0, 100) + '...' : msg}"
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
