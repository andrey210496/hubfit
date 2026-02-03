
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Plus, Zap, Trash2, Edit, Clock, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { AutomationFlowEditor } from '../automation/AutomationFlowEditor';

interface MessageStep {
    id: string;
    content: string;
    delay: number;
    delayUnit: 'minutes' | 'hours' | 'days';
    stopOnReply: boolean;
}

interface AutomationFlow {
    id: string;
    name: string;
    trigger: string;
    messages: MessageStep[];
    activeDays: string[];
    activeHoursStart: string;
    activeHoursEnd: string;
    isActive: boolean;
}

interface AutomationStepProps {
    agent: any;
    setAgent: (updater: (prev: any) => any) => void;
}

const TRIGGER_LABELS: Record<string, string> = {
    'booking_confirmed': 'Agendamento Confirmado',
    'trial_booked': 'Aula Experimental Agendada',
    'no_response_24h': 'Sem Resposta por 24h',
    'new_lead': 'Novo Lead',
    'payment_pending': 'Pagamento Pendente',
    'tag_added': 'Tag Adicionada',
};

export function AutomationStep({ agent, setAgent }: AutomationStepProps) {
    const [automations, setAutomations] = useState<AutomationFlow[]>([]);
    const [editingFlow, setEditingFlow] = useState<AutomationFlow | null>(null);
    const [showEditor, setShowEditor] = useState(false);

    const handleSaveFlow = (flow: AutomationFlow) => {
        const exists = automations.find(a => a.id === flow.id);
        if (exists) {
            setAutomations(automations.map(a => a.id === flow.id ? flow : a));
            toast.success('Automação atualizada!');
        } else {
            setAutomations([...automations, flow]);
            toast.success('Automação criada!');
        }
        setShowEditor(false);
        setEditingFlow(null);
    };

    const toggleAutomation = (id: string) => {
        setAutomations(automations.map(a =>
            a.id === id ? { ...a, isActive: !a.isActive } : a
        ));
    };

    const deleteAutomation = (id: string) => {
        setAutomations(automations.filter(a => a.id !== id));
        toast.success('Automação removida');
    };

    const editAutomation = (flow: AutomationFlow) => {
        setEditingFlow(flow);
        setShowEditor(true);
    };

    const createNew = () => {
        setEditingFlow(null);
        setShowEditor(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium">Fluxos de Automação</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure sequências de mensagens automáticas com delays e condições.
                    </p>
                </div>
                <Button className="gap-2" onClick={createNew}>
                    <Plus className="h-4 w-4" /> Nova Automação
                </Button>
            </div>

            {automations.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="p-3 bg-muted rounded-full mb-4">
                            <Zap className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <h4 className="font-semibold mb-1">Nenhuma automação configurada</h4>
                        <p className="text-sm text-muted-foreground mb-4 max-w-md">
                            Crie fluxos automáticos para aquecimento de aulas, follow-up de leads,
                            lembretes de pagamento e muito mais.
                        </p>
                        <Button variant="outline" onClick={createNew}>
                            Criar Primeira Automação
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {automations.map((automation) => (
                        <Card
                            key={automation.id}
                            className={`transition-all ${automation.isActive ? 'border-primary/50' : 'opacity-60'}`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-full ${automation.isActive ? 'bg-yellow-500/10' : 'bg-muted'}`}>
                                            <Zap className={`h-5 w-5 ${automation.isActive ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-semibold">{automation.name}</h4>
                                            <p className="text-sm text-muted-foreground">
                                                Gatilho: {TRIGGER_LABELS[automation.trigger] || automation.trigger}
                                            </p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {automation.messages.length} mensagens
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    {automation.activeDays.length} dias/semana
                                                </span>
                                                <span>
                                                    {automation.activeHoursStart} - {automation.activeHoursEnd}
                                                </span>
                                            </div>

                                            {/* Message Preview */}
                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {automation.messages.slice(0, 5).map((msg, i) => (
                                                    <span
                                                        key={msg.id}
                                                        className="bg-muted px-2 py-0.5 rounded text-xs"
                                                        title={msg.content}
                                                    >
                                                        {i + 1}. {msg.delay}{msg.delayUnit[0]}
                                                    </span>
                                                ))}
                                                {automation.messages.length > 5 && (
                                                    <span className="text-xs text-muted-foreground">
                                                        +{automation.messages.length - 5} mais
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Switch
                                            checked={automation.isActive}
                                            onCheckedChange={() => toggleAutomation(automation.id)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => editAutomation(automation)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => deleteAutomation(automation.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Flow Editor Dialog */}
            {showEditor && (
                <AutomationFlowEditor
                    flow={editingFlow}
                    onSave={handleSaveFlow}
                    onClose={() => {
                        setShowEditor(false);
                        setEditingFlow(null);
                    }}
                />
            )}
        </div>
    );
}
