
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, User, Tag, MessageSquare } from 'lucide-react';

interface ToolsStepProps {
    agent: {
        tools: {
            schedule: boolean;
            customer_lookup: boolean;
            tag_manager: boolean;
            automations: boolean;
        };
    };
    setAgent: (updater: (prev: any) => any) => void;
}

export function ToolsStep({ agent, setAgent }: ToolsStepProps) {
    const toggleTool = (tool: keyof typeof agent.tools) => {
        setAgent((prev: any) => ({
            ...prev,
            tools: {
                ...prev.tools,
                [tool]: !prev.tools[tool]
            }
        }));
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <Card
                className={`cursor-pointer transition-all ${agent.tools.schedule ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => toggleTool('schedule')}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Gestão de Agenda</CardTitle>
                    <Calendar className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Consultar disponibilidade e agendar aulas
                    </p>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="schedule"
                            checked={agent.tools.schedule}
                            onCheckedChange={() => toggleTool('schedule')}
                        />
                        <Label htmlFor="schedule" className="text-sm">
                            {agent.tools.schedule ? 'Ativado' : 'Desativado'}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card
                className={`cursor-pointer transition-all ${agent.tools.customer_lookup ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => toggleTool('customer_lookup')}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Consulta de Aluno</CardTitle>
                    <User className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Acesso ao perfil, plano e histórico do aluno
                    </p>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="customer"
                            checked={agent.tools.customer_lookup}
                            onCheckedChange={() => toggleTool('customer_lookup')}
                        />
                        <Label htmlFor="customer" className="text-sm">
                            {agent.tools.customer_lookup ? 'Ativado' : 'Desativado'}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card
                className={`cursor-pointer transition-all ${agent.tools.tag_manager ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => toggleTool('tag_manager')}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Gestão de Tags</CardTitle>
                    <Tag className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Adicionar ou remover tags do cliente
                    </p>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="tags"
                            checked={agent.tools.tag_manager}
                            onCheckedChange={() => toggleTool('tag_manager')}
                        />
                        <Label htmlFor="tags" className="text-sm">
                            {agent.tools.tag_manager ? 'Ativado' : 'Desativado'}
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card
                className={`cursor-pointer transition-all ${agent.tools.automations ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                onClick={() => toggleTool('automations')}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">Automações</CardTitle>
                    <MessageSquare className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                        Disparar fluxos automáticos de mensagens
                    </p>
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="automations"
                            checked={agent.tools.automations}
                            onCheckedChange={() => toggleTool('automations')}
                        />
                        <Label htmlFor="automations" className="text-sm">
                            {agent.tools.automations ? 'Ativado' : 'Desativado'}
                        </Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
