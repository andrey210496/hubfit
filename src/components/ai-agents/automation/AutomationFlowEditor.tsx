
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    GripVertical, Plus, Trash2, Clock, MessageSquare,
    ChevronUp, ChevronDown, X, Play, Pause, Copy
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

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

const DAYS = [
    { id: 'mon', label: 'Seg' },
    { id: 'tue', label: 'Ter' },
    { id: 'wed', label: 'Qua' },
    { id: 'thu', label: 'Qui' },
    { id: 'fri', label: 'Sex' },
    { id: 'sat', label: 'Sáb' },
    { id: 'sun', label: 'Dom' },
];

const TRIGGERS = [
    { value: 'booking_confirmed', label: 'Agendamento Confirmado' },
    { value: 'trial_booked', label: 'Aula Experimental Agendada' },
    { value: 'no_response_24h', label: 'Sem Resposta por 24h' },
    { value: 'new_lead', label: 'Novo Lead' },
    { value: 'payment_pending', label: 'Pagamento Pendente' },
    { value: 'tag_added', label: 'Tag Adicionada' },
];

// Pre-built templates
const TEMPLATES: Record<string, Omit<AutomationFlow, 'id' | 'isActive'>> = {
    warmup_trial: {
        name: 'Aquecimento - Aula Experimental',
        trigger: 'trial_booked',
        messages: [
            { id: '1', content: 'Oi {{nome}}! 🎉 Confirmamos sua aula experimental para {{data_aula}}. Estamos te esperando!', delay: 0, delayUnit: 'minutes', stopOnReply: false },
            { id: '2', content: 'Lembrete: amanhã é o grande dia da sua aula experimental! 💪 Traga roupa confortável e uma garrafinha de água.', delay: 1, delayUnit: 'days', stopOnReply: false },
            { id: '3', content: 'Bom dia {{nome}}! Sua aula experimental é HOJE às {{horario}}. Estamos prontos para te receber! 🏋️', delay: 2, delayUnit: 'hours', stopOnReply: true },
        ],
        activeDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
        activeHoursStart: '08:00',
        activeHoursEnd: '20:00',
    },
    lead_followup: {
        name: 'Follow-up - Leads Inativos',
        trigger: 'no_response_24h',
        messages: [
            { id: '1', content: 'Oi {{nome}}, tudo bem? Vi que você demonstrou interesse na nossa academia. Posso te ajudar com alguma dúvida?', delay: 24, delayUnit: 'hours', stopOnReply: true },
            { id: '2', content: 'Que tal agendar uma aula experimental gratuita? É a melhor forma de conhecer nossa estrutura! 🏋️', delay: 2, delayUnit: 'days', stopOnReply: true },
            { id: '3', content: '{{nome}}, temos uma condição especial essa semana! Quer saber mais? 🎁', delay: 3, delayUnit: 'days', stopOnReply: true },
            { id: '4', content: 'Última chance! Nossa promoção encerra amanhã. Posso reservar essa condição pra você?', delay: 5, delayUnit: 'days', stopOnReply: true },
            { id: '5', content: 'Oi {{nome}}! Caso mude de ideia, estaremos aqui. Cuide-se! 💪', delay: 7, delayUnit: 'days', stopOnReply: false },
        ],
        activeDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        activeHoursStart: '09:00',
        activeHoursEnd: '18:00',
    },
    payment_reminder: {
        name: 'Lembrete - Pagamento Pendente',
        trigger: 'payment_pending',
        messages: [
            { id: '1', content: 'Oi {{nome}}! Identificamos que sua mensalidade está pendente. Precisa de ajuda com o pagamento?', delay: 1, delayUnit: 'days', stopOnReply: true },
            { id: '2', content: '{{nome}}, sua mensalidade continua em aberto. Para evitar suspensão, regularize até amanhã. Link: {{link_pagamento}}', delay: 3, delayUnit: 'days', stopOnReply: true },
        ],
        activeDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
        activeHoursStart: '10:00',
        activeHoursEnd: '17:00',
    },
};

interface AutomationFlowEditorProps {
    flow: AutomationFlow | null;
    onSave: (flow: AutomationFlow) => void;
    onClose: () => void;
}

export function AutomationFlowEditor({ flow, onSave, onClose }: AutomationFlowEditorProps) {
    const [currentFlow, setCurrentFlow] = useState<AutomationFlow>(
        flow || {
            id: Date.now().toString(),
            name: '',
            trigger: '',
            messages: [],
            activeDays: ['mon', 'tue', 'wed', 'thu', 'fri'],
            activeHoursStart: '09:00',
            activeHoursEnd: '18:00',
            isActive: true,
        }
    );

    const addMessage = () => {
        const newMessage: MessageStep = {
            id: Date.now().toString(),
            content: '',
            delay: 1,
            delayUnit: 'hours',
            stopOnReply: false,
        };
        setCurrentFlow({
            ...currentFlow,
            messages: [...currentFlow.messages, newMessage],
        });
    };

    const updateMessage = (id: string, updates: Partial<MessageStep>) => {
        setCurrentFlow({
            ...currentFlow,
            messages: currentFlow.messages.map(m =>
                m.id === id ? { ...m, ...updates } : m
            ),
        });
    };

    const removeMessage = (id: string) => {
        setCurrentFlow({
            ...currentFlow,
            messages: currentFlow.messages.filter(m => m.id !== id),
        });
    };

    const moveMessage = (id: string, direction: 'up' | 'down') => {
        const index = currentFlow.messages.findIndex(m => m.id === id);
        if (
            (direction === 'up' && index === 0) ||
            (direction === 'down' && index === currentFlow.messages.length - 1)
        ) return;

        const newMessages = [...currentFlow.messages];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newMessages[index], newMessages[swapIndex]] = [newMessages[swapIndex], newMessages[index]];
        setCurrentFlow({ ...currentFlow, messages: newMessages });
    };

    const toggleDay = (day: string) => {
        const days = currentFlow.activeDays.includes(day)
            ? currentFlow.activeDays.filter(d => d !== day)
            : [...currentFlow.activeDays, day];
        setCurrentFlow({ ...currentFlow, activeDays: days });
    };

    const applyTemplate = (templateKey: string) => {
        const template = TEMPLATES[templateKey];
        if (template) {
            setCurrentFlow({
                ...currentFlow,
                name: template.name,
                trigger: template.trigger,
                messages: template.messages.map(m => ({ ...m, id: Date.now() + Math.random().toString() })),
                activeDays: template.activeDays,
                activeHoursStart: template.activeHoursStart,
                activeHoursEnd: template.activeHoursEnd,
            });
            toast.success('Template aplicado!');
        }
    };

    const handleSave = () => {
        if (!currentFlow.name.trim()) {
            toast.error('Nome da automação é obrigatório');
            return;
        }
        if (!currentFlow.trigger) {
            toast.error('Selecione um gatilho');
            return;
        }
        if (currentFlow.messages.length === 0) {
            toast.error('Adicione pelo menos uma mensagem');
            return;
        }
        onSave(currentFlow);
    };

    return (
        <Dialog open={true} onOpenChange={() => onClose()}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {flow ? 'Editar Automação' : 'Nova Automação'}
                    </DialogTitle>
                    <DialogDescription>
                        Configure a sequência de mensagens automáticas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Templates */}
                    {!flow && (
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground self-center">Templates:</span>
                            {Object.entries(TEMPLATES).map(([key, template]) => (
                                <Button
                                    key={key}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => applyTemplate(key)}
                                    className="gap-1"
                                >
                                    <Copy className="h-3 w-3" />
                                    {template.name}
                                </Button>
                            ))}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Nome da Automação</Label>
                            <Input
                                placeholder="Ex: Aquecimento Aula Experimental"
                                value={currentFlow.name}
                                onChange={(e) => setCurrentFlow({ ...currentFlow, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Gatilho</Label>
                            <Select
                                value={currentFlow.trigger}
                                onValueChange={(v) => setCurrentFlow({ ...currentFlow, trigger: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Quando iniciar?" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TRIGGERS.map(t => (
                                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Schedule */}
                    <Card>
                        <CardHeader className="py-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Horários de Envio
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                                {DAYS.map(day => (
                                    <Button
                                        key={day.id}
                                        variant={currentFlow.activeDays.includes(day.id) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleDay(day.id)}
                                        className="w-12"
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                            </div>
                            <div className="flex gap-4 items-center">
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm">Das</Label>
                                    <Input
                                        type="time"
                                        value={currentFlow.activeHoursStart}
                                        onChange={(e) => setCurrentFlow({ ...currentFlow, activeHoursStart: e.target.value })}
                                        className="w-28"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm">às</Label>
                                    <Input
                                        type="time"
                                        value={currentFlow.activeHoursEnd}
                                        onChange={(e) => setCurrentFlow({ ...currentFlow, activeHoursEnd: e.target.value })}
                                        className="w-28"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Messages */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label>Sequência de Mensagens</Label>
                            <Button size="sm" variant="outline" onClick={addMessage} className="gap-1">
                                <Plus className="h-3 w-3" /> Adicionar
                            </Button>
                        </div>

                        {currentFlow.messages.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="py-8 text-center text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>Nenhuma mensagem configurada</p>
                                    <Button variant="link" onClick={addMessage}>
                                        Adicionar primeira mensagem
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {currentFlow.messages.map((msg, index) => (
                                    <Card key={msg.id} className="relative">
                                        <CardContent className="p-4">
                                            <div className="flex gap-3">
                                                {/* Order Controls */}
                                                <div className="flex flex-col gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => moveMessage(msg.id, 'up')}
                                                        disabled={index === 0}
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                    <div className="flex items-center justify-center h-6 w-6 bg-muted rounded text-xs font-medium">
                                                        {index + 1}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => moveMessage(msg.id, 'down')}
                                                        disabled={index === currentFlow.messages.length - 1}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                                {/* Message Content */}
                                                <div className="flex-1 space-y-3">
                                                    <Textarea
                                                        placeholder="Mensagem... Use {{nome}}, {{data_aula}}, {{horario}}"
                                                        value={msg.content}
                                                        onChange={(e) => updateMessage(msg.id, { content: e.target.value })}
                                                        rows={3}
                                                    />
                                                    <div className="flex flex-wrap gap-4 items-center">
                                                        <div className="flex items-center gap-2">
                                                            <Label className="text-sm whitespace-nowrap">
                                                                {index === 0 ? 'Enviar após' : 'Aguardar'}
                                                            </Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                value={msg.delay}
                                                                onChange={(e) => updateMessage(msg.id, { delay: parseInt(e.target.value) || 0 })}
                                                                className="w-20"
                                                            />
                                                            <Select
                                                                value={msg.delayUnit}
                                                                onValueChange={(v: any) => updateMessage(msg.id, { delayUnit: v })}
                                                            >
                                                                <SelectTrigger className="w-28">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="minutes">Minutos</SelectItem>
                                                                    <SelectItem value="hours">Horas</SelectItem>
                                                                    <SelectItem value="days">Dias</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox
                                                                id={`stop-${msg.id}`}
                                                                checked={msg.stopOnReply}
                                                                onCheckedChange={(v) => updateMessage(msg.id, { stopOnReply: !!v })}
                                                            />
                                                            <Label htmlFor={`stop-${msg.id}`} className="text-sm">
                                                                Parar se responder
                                                            </Label>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delete */}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => removeMessage(msg.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview Timeline */}
                    {currentFlow.messages.length > 0 && (
                        <Card className="bg-muted/30">
                            <CardHeader className="py-3">
                                <CardTitle className="text-sm">Preview da Timeline</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="bg-primary/10 text-primary px-2 py-1 rounded">Gatilho</span>
                                    {currentFlow.messages.map((msg, i) => (
                                        <div key={msg.id} className="flex items-center gap-2">
                                            <span className="text-muted-foreground">→</span>
                                            {msg.delay > 0 && (
                                                <>
                                                    <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded">
                                                        {msg.delay} {msg.delayUnit === 'minutes' ? 'min' : msg.delayUnit === 'hours' ? 'h' : 'd'}
                                                    </span>
                                                    <span className="text-muted-foreground">→</span>
                                                </>
                                            )}
                                            <span className="bg-blue-500/10 text-blue-600 px-2 py-1 rounded">
                                                Msg {i + 1}
                                                {msg.stopOnReply && ' 🛑'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSave}>Salvar Automação</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
