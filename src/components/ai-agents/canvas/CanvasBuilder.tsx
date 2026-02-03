
import { useCallback, useState, useMemo, useEffect } from 'react';
import {
    ReactFlow,
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    BackgroundVariant,
    Panel,
    Connection,
    Edge,
    Node,
    useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
    MessageSquare, Clock, Filter, Globe, Flag,
    Brain, GitBranch, Save, Undo, Redo, ZoomIn, ZoomOut,
    Maximize, Plus, Sparkles, Play, Loader2, FolderOpen
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

// Import custom nodes
import { PromptNode } from './nodes/PromptNode';
import { ToolNode } from './nodes/ToolNode';
import { ConditionNode } from './nodes/ConditionNode';
import { MessageNode } from './nodes/MessageNode';
import { DelayNode } from './nodes/DelayNode';
import { FilterNode } from './nodes/FilterNode';
import { HTTPNode } from './nodes/HTTPNode';
import { EndNode } from './nodes/EndNode';
import { NodeConfigPanel } from './NodeConfigPanel';

// Register node types
const nodeTypes = {
    prompt: PromptNode,
    tool: ToolNode,
    condition: ConditionNode,
    message: MessageNode,
    delay: DelayNode,
    filter: FilterNode,
    http: HTTPNode,
    end: EndNode,
};

// Node categories for sidebar
const NODE_CATEGORIES = [
    {
        title: 'Gatilhos & IA',
        nodes: [
            { type: 'prompt', label: 'Prompt IA', icon: Brain, color: 'from-violet-500/20 to-purple-500/20' },
            { type: 'tool', label: 'Ferramenta', icon: Sparkles, color: 'from-emerald-500/20 to-green-500/20' },
        ],
    },
    {
        title: 'Ações',
        nodes: [
            { type: 'message', label: 'Mensagem', icon: MessageSquare, color: 'from-blue-500/20 to-cyan-500/20' },
            { type: 'delay', label: 'Aguardar', icon: Clock, color: 'from-amber-500/20 to-orange-500/20' },
            { type: 'http', label: 'Webhook', icon: Globe, color: 'from-cyan-500/20 to-teal-500/20' },
        ],
    },
    {
        title: 'Lógica',
        nodes: [
            { type: 'condition', label: 'Condição', icon: GitBranch, color: 'from-orange-500/20 to-red-500/20' },
            { type: 'filter', label: 'Filtrar', icon: Filter, color: 'from-purple-500/20 to-pink-500/20' },
        ],
    },
    {
        title: 'Controle',
        nodes: [
            { type: 'end', label: 'Fim', icon: Flag, color: 'from-red-500/20 to-rose-500/20' },
        ],
    },
];

// Initial nodes
const defaultNodes: Node[] = [
    {
        id: 'trigger-1',
        type: 'prompt',
        position: { x: 250, y: 50 },
        data: { label: 'Gatilho Inicial' },
    },
];

const defaultEdges: Edge[] = [];

interface SavedFlow {
    id: string;
    name: string;
    updated_at: string;
}

interface CanvasBuilderProps {
    agentId?: string;
}

export function CanvasBuilder({ agentId }: CanvasBuilderProps) {
    const { profile } = useAuth();
    const [nodes, setNodes, onNodesChange] = useNodesState(defaultNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(defaultEdges);
    const [flowName, setFlowName] = useState('Novo Fluxo');
    const [flowId, setFlowId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [savedFlows, setSavedFlows] = useState<SavedFlow[]>([]);
    const [history, setHistory] = useState<{ nodes: Node[], edges: Edge[] }[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Load flow if agentId exists
    useEffect(() => {
        if (agentId) {
            loadFlowForAgent(agentId);
        }
    }, [agentId]);

    const loadFlowForAgent = async (agentId: string) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('ai_agent_flows')
                .select('*')
                .eq('agent_id', agentId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            if (data) {
                const flowData = data.flow_data as any;
                setFlowId(data.id);
                setFlowName(data.name || 'Fluxo');
                setNodes(flowData.nodes || defaultNodes);
                setEdges(flowData.edges || defaultEdges);
            }
        } catch (error: any) {
            console.error('Error loading flow:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadSavedFlows = async () => {
        if (!profile?.company_id) return;

        try {
            const { data, error } = await supabase
                .from('ai_agent_flows')
                .select('id, name, updated_at')
                .eq('company_id', profile.company_id)
                .order('updated_at', { ascending: false });

            if (error) throw error;
            setSavedFlows(data || []);
        } catch (error: any) {
            console.error('Error loading flows:', error);
            toast.error('Erro ao carregar fluxos');
        }
    };

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge({
                ...params,
                animated: true,
                style: { strokeWidth: 2 },
            }, eds));
            saveToHistory();
        },
        [setEdges],
    );

    const onNodeClick = useCallback((_: any, node: Node) => {
        setSelectedNode(node);
    }, []);

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
    }, []);

    const saveToHistory = useCallback(() => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ nodes: [...nodes], edges: [...edges] });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [nodes, edges, history, historyIndex]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setNodes(prev.nodes);
            setEdges(prev.edges);
            setHistoryIndex(historyIndex - 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setNodes(next.nodes);
            setEdges(next.edges);
            setHistoryIndex(historyIndex + 1);
        }
    }, [history, historyIndex, setNodes, setEdges]);

    const addNode = useCallback((type: string) => {
        const newNode: Node = {
            id: `${type}-${Date.now()}`,
            type,
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            data: { label: NODE_CATEGORIES.flatMap(c => c.nodes).find(n => n.type === type)?.label || type },
        };
        setNodes((nds) => [...nds, newNode]);
        saveToHistory();
    }, [setNodes, saveToHistory]);

    const updateNodeData = useCallback((nodeId: string, data: any) => {
        setNodes((nds) => nds.map(n =>
            n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        ));
    }, [setNodes]);

    const deleteNode = useCallback((nodeId: string) => {
        setNodes((nds) => nds.filter(n => n.id !== nodeId));
        setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
        setSelectedNode(null);
        saveToHistory();
        toast.success('Nó removido');
    }, [setNodes, setEdges, saveToHistory]);

    const saveFlow = useCallback(async () => {
        if (!profile?.company_id) {
            toast.error('Erro: usuário não autenticado');
            return;
        }

        try {
            setIsSaving(true);
            const flowData = { nodes, edges };

            if (flowId) {
                // Update existing
                const { error } = await supabase
                    .from('ai_agent_flows')
                    .update({
                        name: flowName,
                        flow_data: flowData as any,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', flowId);

                if (error) throw error;
                toast.success('Fluxo atualizado!');
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('ai_agent_flows')
                    .insert({
                        company_id: profile.company_id,
                        agent_id: agentId || null,
                        name: flowName,
                        flow_data: flowData as any,
                    })
                    .select()
                    .single();

                if (error) throw error;
                setFlowId(data.id);
                toast.success('Fluxo salvo!');
            }
        } catch (error: any) {
            console.error('Error saving flow:', error);
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    }, [flowId, flowName, nodes, edges, profile?.company_id, agentId]);

    const loadFlow = useCallback(async (id: string) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('ai_agent_flows')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            const flowData = data.flow_data as any;
            setFlowId(data.id);
            setFlowName(data.name || 'Fluxo');
            setNodes(flowData.nodes || defaultNodes);
            setEdges(flowData.edges || defaultEdges);
            setShowLoadDialog(false);
            toast.success('Fluxo carregado!');
        } catch (error: any) {
            console.error('Error loading flow:', error);
            toast.error('Erro ao carregar fluxo');
        } finally {
            setIsLoading(false);
        }
    }, [setNodes, setEdges]);

    const openLoadDialog = useCallback(() => {
        loadSavedFlows();
        setShowLoadDialog(true);
    }, []);

    const miniMapNodeColor = useCallback((node: Node) => {
        const colors: Record<string, string> = {
            prompt: '#8b5cf6',
            tool: '#10b981',
            condition: '#f97316',
            message: '#3b82f6',
            delay: '#f59e0b',
            filter: '#a855f7',
            http: '#06b6d4',
            end: '#ef4444',
        };
        return colors[node.type || ''] || '#6b7280';
    }, []);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="h-full flex">
            {/* Sidebar */}
            <div className="w-64 border-r bg-muted/30 overflow-y-auto">
                <div className="p-4 space-y-4">
                    {/* Flow Name */}
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Nome do Fluxo</Label>
                        <Input
                            value={flowName}
                            onChange={(e) => setFlowName(e.target.value)}
                            className="h-8"
                        />
                    </div>

                    {/* Load Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2"
                        onClick={openLoadDialog}
                    >
                        <FolderOpen className="h-4 w-4" />
                        Carregar Fluxo
                    </Button>

                    {/* Node Categories */}
                    {NODE_CATEGORIES.map((category) => (
                        <div key={category.title} className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {category.title}
                            </h4>
                            <div className="grid gap-2">
                                {category.nodes.map((nodeInfo) => {
                                    const Icon = nodeInfo.icon;
                                    return (
                                        <button
                                            key={nodeInfo.type}
                                            onClick={() => addNode(nodeInfo.type)}
                                            className={`flex items-center gap-2 p-2 rounded-lg border bg-gradient-to-r ${nodeInfo.color} hover:border-primary/50 transition-all text-left text-sm group`}
                                        >
                                            <div className="p-1.5 rounded bg-background/50 group-hover:bg-background">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <span>{nodeInfo.label}</span>
                                            <Plus className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100" />
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Stats */}
                    <div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
                        <p>{nodes.length} nós</p>
                        <p>{edges.length} conexões</p>
                        {flowId && <p className="text-green-600">✓ Salvo</p>}
                    </div>
                </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 relative">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onNodeClick={onNodeClick}
                    onPaneClick={onPaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    proOptions={{ hideAttribution: true }}
                    className="bg-background"
                >
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={16}
                        size={1}
                        color="#444"
                    />
                    <Controls
                        showInteractive={false}
                        className="!bg-background !border !shadow-lg"
                    />
                    <MiniMap
                        nodeColor={miniMapNodeColor}
                        className="!bg-muted/50 !border rounded-lg"
                        maskColor="rgba(0,0,0,0.1)"
                    />

                    {/* Top Toolbar */}
                    <Panel position="top-center">
                        <Card className="shadow-lg">
                            <CardContent className="flex items-center gap-2 p-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Desfazer"
                                    onClick={undo}
                                    disabled={historyIndex <= 0}
                                >
                                    <Undo className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Refazer"
                                    onClick={redo}
                                    disabled={historyIndex >= history.length - 1}
                                >
                                    <Redo className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-6 bg-border" />
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom In">
                                    <ZoomIn className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Zoom Out">
                                    <ZoomOut className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ajustar">
                                    <Maximize className="h-4 w-4" />
                                </Button>
                                <div className="w-px h-6 bg-border" />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-1.5 h-8"
                                    onClick={saveFlow}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Save className="h-3.5 w-3.5" />
                                    )}
                                    Salvar
                                </Button>
                                <Button size="sm" className="gap-1.5 h-8">
                                    <Play className="h-3.5 w-3.5" />
                                    Testar
                                </Button>
                            </CardContent>
                        </Card>
                    </Panel>

                    {/* Node Config Panel */}
                    {selectedNode && (
                        <Panel position="top-right">
                            <NodeConfigPanel
                                node={selectedNode}
                                onUpdate={updateNodeData}
                                onDelete={deleteNode}
                                onClose={() => setSelectedNode(null)}
                            />
                        </Panel>
                    )}
                </ReactFlow>
            </div>

            {/* Load Flow Dialog */}
            <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Carregar Fluxo</DialogTitle>
                        <DialogDescription>
                            Selecione um fluxo salvo anteriormente.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {savedFlows.length === 0 ? (
                            <p className="text-center text-muted-foreground py-4">
                                Nenhum fluxo salvo encontrado.
                            </p>
                        ) : (
                            savedFlows.map((flow) => (
                                <button
                                    key={flow.id}
                                    onClick={() => loadFlow(flow.id)}
                                    className="w-full p-3 text-left rounded-lg border hover:bg-muted transition-colors"
                                >
                                    <p className="font-medium">{flow.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(flow.updated_at).toLocaleDateString('pt-BR')}
                                    </p>
                                </button>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
