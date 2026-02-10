
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, MessageCircle, Wand2, Workflow, Loader2, Bot, Layers, Brain, Zap } from 'lucide-react';
import { IdentityStep } from './wizard/IdentityStep';
import { CanvasBuilder } from './canvas/CanvasBuilder';
import { ToolsStep } from './wizard/ToolsStep';
import { AutomationStep } from './wizard/AutomationStep';
import { KnowledgeStep } from './wizard/KnowledgeStep';
import { ChatPlayground } from './ChatPlayground';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export function AgentBuilder() {
    const navigate = useNavigate();
    const { id: agentId } = useParams();
    const { profile } = useAuth();
    const [mode, setMode] = useState<'wizard' | 'canvas'>('wizard');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPlayground, setShowPlayground] = useState(false);
    const [savedAgentId, setSavedAgentId] = useState<string | null>(agentId || null);
    const isEditing = Boolean(agentId);

    const [agent, setAgent] = useState({
        name: '',
        role: 'Assistente',
        prompt: '',
        model: 'gpt-4o',
        is_active: true,
        tools: {
            schedule: false,
            customer_lookup: true,
            tag_manager: true,
            automations: false
        },
        memory_config: {
            rag_sources: {
                modalities: false,
                plans: false,
                schedules: false
            }
        }
    });

    // Load existing agent when editing
    useEffect(() => {
        if (agentId) {
            loadAgent(agentId);
        }
    }, [agentId]);

    const loadAgent = async (id: string) => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('ai_agents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            if (data) {
                setAgent({
                    name: data.name || '',
                    role: data.agent_role || 'Assistente',
                    prompt: data.system_prompt || '',
                    model: data.llm_model || 'gpt-4o',
                    is_active: data.status === 'active',
                    tools: (data.tools as any) || {
                        schedule: false,
                        customer_lookup: true,
                        tag_manager: true,
                        automations: false
                    },
                    memory_config: (data.memory_config as any) || {
                        rag_sources: {
                            modalities: false,
                            plans: false,
                            schedules: false
                        }
                    }
                });
                setSavedAgentId(data.id);
            }
        } catch (error: any) {
            console.error('Error loading agent:', error);
            toast.error('Erro ao carregar agente');
            navigate('/admin/ai-agents');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);

            if (!agent.name) {
                toast.error("O nome do agente é obrigatório");
                return;
            }

            if (!profile?.company_id) {
                toast.error("Erro: Company ID não encontrado");
                return;
            }

            const agentPayload = {
                company_id: profile.company_id,
                name: agent.name,
                agent_role: agent.role,
                system_prompt: agent.prompt,
                llm_model: agent.model,
                status: (agent.is_active ? 'active' : 'inactive') as 'active' | 'inactive' | 'draft',
                tools: agent.tools,
                memory_config: agent.memory_config
            };

            let resultId: string;

            if (isEditing && agentId) {
                // Update existing
                const { data, error } = await supabase
                    .from('ai_agents')
                    .update(agentPayload)
                    .eq('id', agentId)
                    .select()
                    .single();

                if (error) throw error;
                resultId = data.id;
                toast.success("Agente atualizado com sucesso!");
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('ai_agents')
                    .insert(agentPayload)
                    .select()
                    .single();

                if (error) throw error;
                resultId = data.id;
                toast.success("Agente criado com sucesso!");

                // Navigate to edit URL so subsequent saves are updates
                navigate(`/admin/ai-agents/${resultId}`, { replace: true });
            }

            setSavedAgentId(resultId);
        } catch (error: any) {
            console.error("Error saving agent:", error);
            toast.error("Erro ao salvar agente: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Carregando agente...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header - More sharp & technical look */}
            <div className="border-b px-6 py-3 flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/admin/ai-agents')}
                        className="rounded-none hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                            {isEditing ? (agent.name || 'Editar Agente') : 'Novo Agente'}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-none bg-primary/10 text-primary uppercase">
                                {isEditing ? 'v1.0' : 'BETA'}
                            </span>
                        </h1>
                        <span className="text-xs text-muted-foreground font-medium">
                            {isEditing ? 'Editando configurações do sistema' : 'Definição de novo assistente virtual'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-none border border-border/50">
                    <Button
                        variant={mode === 'wizard' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('wizard')}
                        className={cn(
                            "gap-2 text-xs font-medium rounded-none transition-all",
                            mode === 'wizard' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Wand2 className="h-3 w-3" /> Configuração
                    </Button>
                    <Button
                        variant={mode === 'canvas' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('canvas')}
                        className={cn(
                            "gap-2 text-xs font-medium rounded-none transition-all",
                            mode === 'canvas' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
                        )}
                    >
                        <Workflow className="h-3 w-3" /> Fluxo
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {savedAgentId && (
                        <Button
                            variant="outline"
                            onClick={() => setShowPlayground(true)}
                            className="gap-2 rounded-none border-primary/20 hover:bg-primary/5 text-primary hover:text-primary transition-colors"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Testar
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-2 rounded-none shadow-md hover:translate-y-[1px] transition-transform"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar Alterações
                    </Button>
                </div>
            </div>

            {/* Content using Tabs for Wizard Steps */}
            <div className="flex-1 overflow-hidden bg-muted/5">
                {mode === 'wizard' ? (
                    <div className="h-full flex flex-col max-w-5xl mx-auto p-8 overflow-y-auto">
                        <Tabs defaultValue="identity" className="w-full space-y-8">
                            <TabsList className="w-full grid grid-cols-4 bg-muted/50 p-1 rounded-none border border-border">
                                <TabsTrigger value="identity" className="rounded-none data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2">
                                    <Bot className="h-4 w-4" /> Identidade
                                </TabsTrigger>
                                <TabsTrigger value="tools" className="rounded-none data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2">
                                    <Layers className="h-4 w-4" /> Ferramentas
                                </TabsTrigger>
                                <TabsTrigger value="knowledge" className="rounded-none data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2">
                                    <Brain className="h-4 w-4" /> Conhecimento
                                </TabsTrigger>
                                <TabsTrigger value="automations" className="rounded-none data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all gap-2">
                                    <Zap className="h-4 w-4" /> Automações
                                </TabsTrigger>
                            </TabsList>

                            <div className="bg-card border border-border shadow-sm p-6 rounded-none animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <TabsContent value="identity" className="mt-0 space-y-6 focus-visible:outline-none">
                                    <IdentityStep agent={agent} setAgent={setAgent} />
                                </TabsContent>

                                <TabsContent value="tools" className="mt-0 focus-visible:outline-none">
                                    <ToolsStep agent={agent} setAgent={setAgent} />
                                </TabsContent>

                                <TabsContent value="knowledge" className="mt-0 focus-visible:outline-none">
                                    <KnowledgeStep agent={agent} setAgent={setAgent} />
                                </TabsContent>

                                <TabsContent value="automations" className="mt-0 focus-visible:outline-none">
                                    <AutomationStep agent={agent} setAgent={setAgent} />
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                ) : (
                    <CanvasBuilder agentId={savedAgentId || undefined} />
                )}
            </div>

            {/* Chat Playground Modal */}
            {savedAgentId && (
                <ChatPlayground
                    agentId={savedAgentId}
                    agentName={agent.name || 'Agente'}
                    isOpen={showPlayground}
                    onClose={() => setShowPlayground(false)}
                />
            )}
        </div>
    );
}
