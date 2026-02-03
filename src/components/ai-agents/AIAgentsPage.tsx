
import { useState, useEffect } from 'react';
import { Plus, Bot, Brain, Zap, MoreVertical, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Agent {
    id: string;
    name: string;
    agent_role: string | null;
    status: string | null;
    llm_model: string | null;
    created_at: string | null;
    total_conversations: number | null;
}

export function AIAgentsPage() {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (profile?.company_id) {
            loadAgents();
        }
    }, [profile?.company_id]);

    const loadAgents = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('ai_agents')
                .select('id, name, agent_role, status, llm_model, created_at, total_conversations')
                .eq('company_id', profile!.company_id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setAgents(data || []);
        } catch (error: any) {
            console.error('Error loading agents:', error);
            toast.error('Erro ao carregar agentes');
        } finally {
            setLoading(false);
        }
    };

    const deleteAgent = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este agente?')) return;

        try {
            const { error } = await supabase
                .from('ai_agents')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success('Agente excluído');
            loadAgents();
        } catch (error: any) {
            toast.error('Erro ao excluir: ' + error.message);
        }
    };

    const getStatusBadge = (status: string | null) => {
        if (status === 'active') return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Ativo</Badge>;
        if (status === 'inactive') return <Badge variant="secondary">Inativo</Badge>;
        return <Badge variant="outline">Rascunho</Badge>;
    };

    return (
        <div className="h-full flex flex-col bg-background/50">
            {/* Header */}
            <div className="flex-none p-8 border-b bg-background/50 backdrop-blur-xl supports-[backdrop-filter]:bg-background/20">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Bot className="h-6 w-6 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight">Agentes de IA</h1>
                        </div>
                        <Button onClick={() => navigate('/admin/ai-agents/new')} className="gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                            <Plus className="h-4 w-4" />
                            Novo Agente
                        </Button>
                    </div>
                    <p className="text-muted-foreground max-w-2xl">
                        Crie assistentes inteligentes que atendem seus clientes 24/7.
                        Configure comportamento, ferramentas e automações.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Stats / Quick Info */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total de Agentes</CardTitle>
                                <Bot className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{agents.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Conversas/Mês</CardTitle>
                                <Brain className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {agents.reduce((sum, a) => sum + (a.total_conversations || 0), 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Ativos</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {agents.filter(a => a.status === 'active').length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : agents.length === 0 ? (
                        /* Empty State */
                        <Card className="border-dashed">
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="p-4 bg-muted rounded-full mb-4">
                                    <Bot className="h-8 w-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">Nenhum agente criado</h3>
                                <p className="text-muted-foreground mb-6 max-w-md">
                                    Comece criando seu primeiro assistente virtual.
                                    Você poderá escolher entre o modo Wizard (Fácil) ou Canvas (Avançado).
                                </p>
                                <Button variant="outline" onClick={() => navigate('/admin/ai-agents/new')}>
                                    Criar Primeiro Agente
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        /* Agent Cards */
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {agents.map((agent) => (
                                <Card key={agent.id} className="hover:shadow-lg transition-shadow cursor-pointer group">
                                    <CardHeader className="flex flex-row items-start justify-between">
                                        <div className="space-y-1">
                                            <CardTitle className="text-lg">{agent.name}</CardTitle>
                                            <CardDescription>{agent.agent_role || 'Sem role definida'}</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {getStatusBadge(agent.status)}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => navigate(`/admin/ai-agents/${agent.id}`)}>
                                                        Editar
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => deleteAgent(agent.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Excluir
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            <span>{agent.llm_model || 'gpt-4o'}</span>
                                            <span>•</span>
                                            <span>{agent.total_conversations || 0} conversas</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
