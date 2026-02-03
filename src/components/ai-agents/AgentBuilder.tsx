
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, MessageCircle, Wand2, Workflow, Loader2 } from 'lucide-react';
import { IdentityStep } from './wizard/IdentityStep';
import { CanvasBuilder } from './canvas/CanvasBuilder';
import { ToolsStep } from './wizard/ToolsStep';
import { AutomationStep } from './wizard/AutomationStep';
import { KnowledgeStep } from './wizard/KnowledgeStep';
import { ChatPlayground } from './ChatPlayground';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

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
                tools: agent.tools
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
                    <p className="text-muted-foreground">Carregando agente...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <div className="border-b p-4 flex items-center justify-between bg-background/50 backdrop-blur">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/ai-agents')}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="font-semibold text-lg">
                            {isEditing ? (agent.name || 'Editar Agente') : 'Novo Agente'}
                        </h1>
                        <span className="text-xs text-muted-foreground">
                            {isEditing ? 'Editando configurações' : 'Configuração'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <Button
                        variant={mode === 'wizard' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('wizard')}
                        className="gap-2"
                    >
                        <Wand2 className="h-3 w-3" /> Wizard
                    </Button>
                    <Button
                        variant={mode === 'canvas' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setMode('canvas')}
                        className="gap-2"
                    >
                        <Workflow className="h-3 w-3" /> Canvas
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    {savedAgentId && (
                        <Button variant="outline" onClick={() => setShowPlayground(true)} className="gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Testar
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar
                    </Button>
                </div>
            </div>

            {/* Content using Tabs for Wizard Steps */}
            <div className="flex-1 overflow-hidden">
                {mode === 'wizard' ? (
                    <div className="h-full flex flex-col max-w-4xl mx-auto p-6 overflow-y-auto">
                        <Tabs defaultValue="identity" className="w-full space-y-6">
                            <TabsList className="grid w-full grid-cols-4">
                                <TabsTrigger value="identity">Identidade</TabsTrigger>
                                <TabsTrigger value="tools">Ferramentas</TabsTrigger>
                                <TabsTrigger value="knowledge">Conhecimento</TabsTrigger>
                                <TabsTrigger value="automations">Automações</TabsTrigger>
                            </TabsList>

                            <TabsContent value="identity" className="space-y-4">
                                <IdentityStep agent={agent} setAgent={setAgent} />
                            </TabsContent>

                            <TabsContent value="tools">
                                <ToolsStep agent={agent} setAgent={setAgent} />
                            </TabsContent>

                            <TabsContent value="knowledge">
                                <KnowledgeStep agent={agent} setAgent={setAgent} />
                            </TabsContent>

                            <TabsContent value="automations">
                                <AutomationStep agent={agent} setAgent={setAgent} />
                            </TabsContent>
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
