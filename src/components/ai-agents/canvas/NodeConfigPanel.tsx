
import { useState, useEffect } from 'react';
import { Node } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    X, Trash2, Copy, MessageSquare, Clock, Filter,
    Globe, Flag, Brain, Sparkles, GitBranch, Variable
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Available variables for templates
const AVAILABLE_VARIABLES = [
    { key: '{{nome}}', label: 'Nome do Cliente', category: 'cliente' },
    { key: '{{telefone}}', label: 'Telefone', category: 'cliente' },
    { key: '{{email}}', label: 'E-mail', category: 'cliente' },
    { key: '{{plano}}', label: 'Plano Atual', category: 'cliente' },
    { key: '{{status}}', label: 'Status', category: 'cliente' },
    { key: '{{data_aula}}', label: 'Data da Aula', category: 'agenda' },
    { key: '{{horario}}', label: 'Horário', category: 'agenda' },
    { key: '{{professor}}', label: 'Professor', category: 'agenda' },
    { key: '{{modalidade}}', label: 'Modalidade', category: 'agenda' },
    { key: '{{valor_mensalidade}}', label: 'Valor Mensalidade', category: 'financeiro' },
    { key: '{{link_pagamento}}', label: 'Link de Pagamento', category: 'financeiro' },
    { key: '{{dias_atraso}}', label: 'Dias em Atraso', category: 'financeiro' },
];

interface NodeConfigPanelProps {
    node: Node | null;
    onUpdate: (nodeId: string, data: any) => void;
    onDelete: (nodeId: string) => void;
    onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onDelete, onClose }: NodeConfigPanelProps) {
    const [localData, setLocalData] = useState<any>({});

    useEffect(() => {
        if (node) {
            setLocalData(node.data || {});
        }
    }, [node]);

    if (!node) return null;

    const updateField = (key: string, value: any) => {
        const newData = { ...localData, [key]: value };
        setLocalData(newData);
        onUpdate(node.id, newData);
    };

    const insertVariable = (variable: string) => {
        const textField = document.querySelector('[data-variable-target]') as HTMLTextAreaElement;
        if (textField) {
            const start = textField.selectionStart;
            const end = textField.selectionEnd;
            const text = localData.message || '';
            const newText = text.substring(0, start) + variable + text.substring(end);
            updateField('message', newText);
        }
    };

    const getNodeIcon = () => {
        const icons: Record<string, any> = {
            prompt: Brain,
            tool: Sparkles,
            condition: GitBranch,
            message: MessageSquare,
            delay: Clock,
            filter: Filter,
            http: Globe,
            end: Flag,
        };
        const Icon = icons[node.type || ''] || MessageSquare;
        return <Icon className="h-4 w-4" />;
    };

    const getNodeColor = () => {
        const colors: Record<string, string> = {
            prompt: 'text-violet-600',
            tool: 'text-emerald-600',
            condition: 'text-orange-600',
            message: 'text-blue-600',
            delay: 'text-amber-600',
            filter: 'text-purple-600',
            http: 'text-cyan-600',
            end: 'text-red-600',
        };
        return colors[node.type || ''] || 'text-gray-600';
    };

    const renderConfig = () => {
        switch (node.type) {
            case 'message':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Mensagem</Label>
                            <Textarea
                                data-variable-target
                                placeholder="Digite a mensagem..."
                                value={localData.message || ''}
                                onChange={(e) => updateField('message', e.target.value)}
                                rows={4}
                            />
                        </div>

                        {/* Variable Picker */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Variable className="h-3 w-3" />
                                Variáveis Disponíveis
                            </Label>
                            <div className="flex flex-wrap gap-1">
                                {AVAILABLE_VARIABLES.filter(v => v.category === 'cliente').map((v) => (
                                    <Badge
                                        key={v.key}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                                        onClick={() => updateField('message', (localData.message || '') + v.key)}
                                    >
                                        {v.key}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {AVAILABLE_VARIABLES.filter(v => v.category === 'agenda').map((v) => (
                                    <Badge
                                        key={v.key}
                                        variant="secondary"
                                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                                        onClick={() => updateField('message', (localData.message || '') + v.key)}
                                    >
                                        {v.key}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="typing"
                                checked={localData.showTyping || false}
                                onCheckedChange={(v) => updateField('showTyping', v)}
                            />
                            <Label htmlFor="typing" className="text-sm">Mostrar "digitando..."</Label>
                        </div>
                    </div>
                );

            case 'delay':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Tempo de Espera</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    min="1"
                                    value={localData.delay || 1}
                                    onChange={(e) => updateField('delay', parseInt(e.target.value) || 1)}
                                    className="w-20"
                                />
                                <Select
                                    value={localData.unit || 'hours'}
                                    onValueChange={(v) => updateField('unit', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="minutes">Minutos</SelectItem>
                                        <SelectItem value="hours">Horas</SelectItem>
                                        <SelectItem value="days">Dias</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="businessHours"
                                checked={localData.businessHoursOnly || false}
                                onCheckedChange={(v) => updateField('businessHoursOnly', v)}
                            />
                            <Label htmlFor="businessHours" className="text-sm">Apenas horário comercial</Label>
                        </div>
                    </div>
                );

            case 'filter':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Campo</Label>
                            <Select
                                value={localData.field || 'tags'}
                                onValueChange={(v) => updateField('field', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tags">Tags</SelectItem>
                                    <SelectItem value="plan">Plano</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="last_visit">Última Visita</SelectItem>
                                    <SelectItem value="age">Idade</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Condição</Label>
                            <Select
                                value={localData.condition || 'contains'}
                                onValueChange={(v) => updateField('condition', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contains">Contém</SelectItem>
                                    <SelectItem value="not_contains">Não Contém</SelectItem>
                                    <SelectItem value="equals">É igual a</SelectItem>
                                    <SelectItem value="not_equals">Não é igual a</SelectItem>
                                    <SelectItem value="greater">Maior que</SelectItem>
                                    <SelectItem value="less">Menor que</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor</Label>
                            <Input
                                placeholder="Ex: vip, mensal, ativo..."
                                value={localData.value || ''}
                                onChange={(e) => updateField('value', e.target.value)}
                            />
                        </div>
                    </div>
                );

            case 'http':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Método</Label>
                            <Select
                                value={localData.method || 'POST'}
                                onValueChange={(v) => updateField('method', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="GET">GET</SelectItem>
                                    <SelectItem value="POST">POST</SelectItem>
                                    <SelectItem value="PUT">PUT</SelectItem>
                                    <SelectItem value="PATCH">PATCH</SelectItem>
                                    <SelectItem value="DELETE">DELETE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>URL do Webhook</Label>
                            <Input
                                placeholder="https://..."
                                value={localData.url || ''}
                                onChange={(e) => updateField('url', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Headers (JSON)</Label>
                            <Textarea
                                placeholder='{"Authorization": "Bearer ..."}'
                                value={localData.headers || ''}
                                onChange={(e) => updateField('headers', e.target.value)}
                                rows={2}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            O corpo da requisição incluirá os dados do cliente automaticamente.
                        </p>
                    </div>
                );

            case 'prompt':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Prompt do Agente</Label>
                            <Textarea
                                placeholder="Você é um assistente..."
                                value={localData.prompt || ''}
                                onChange={(e) => updateField('prompt', e.target.value)}
                                rows={6}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Select
                                value={localData.model || 'gpt-4o'}
                                onValueChange={(v) => updateField('model', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                );

            case 'tool':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ferramenta</Label>
                            <Select
                                value={localData.tool || ''}
                                onValueChange={(v) => updateField('tool', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="check_schedule">Consultar Agenda</SelectItem>
                                    <SelectItem value="book_class">Agendar Aula</SelectItem>
                                    <SelectItem value="get_customer">Buscar Cliente</SelectItem>
                                    <SelectItem value="update_tags">Atualizar Tags</SelectItem>
                                    <SelectItem value="create_lead">Criar Lead</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            A ferramenta será executada e o resultado estará disponível para os próximos nós.
                        </p>
                    </div>
                );

            case 'condition':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Verificar</Label>
                            <Select
                                value={localData.checkType || 'response'}
                                onValueChange={(v) => updateField('checkType', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="response">Resposta do Cliente</SelectItem>
                                    <SelectItem value="intent">Intenção Detectada</SelectItem>
                                    <SelectItem value="sentiment">Sentimento</SelectItem>
                                    <SelectItem value="keyword">Palavra-chave</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Esperado</Label>
                            <Input
                                placeholder="Ex: sim, interessado, cancelar..."
                                value={localData.expectedValue || ''}
                                onChange={(e) => updateField('expectedValue', e.target.value)}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Saída "Sim" se a condição for verdadeira, "Não" caso contrário.
                        </p>
                    </div>
                );

            case 'end':
                return (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Ação Final</Label>
                            <Select
                                value={localData.endAction || 'complete'}
                                onValueChange={(v) => updateField('endAction', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="complete">Marcar como Concluído</SelectItem>
                                    <SelectItem value="transfer">Transferir para Humano</SelectItem>
                                    <SelectItem value="restart">Reiniciar Fluxo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {localData.endAction === 'transfer' && (
                            <div className="space-y-2">
                                <Label>Transferir para</Label>
                                <Input
                                    placeholder="ID do atendente ou departamento"
                                    value={localData.transferTo || ''}
                                    onChange={(e) => updateField('transferTo', e.target.value)}
                                />
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <div className="text-center text-muted-foreground py-4">
                        Nenhuma configuração disponível para este tipo de nó.
                    </div>
                );
        }
    };

    return (
        <Card className="w-80 shadow-xl border-l-4" style={{ borderLeftColor: 'var(--primary)' }}>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className={`text-sm flex items-center gap-2 ${getNodeColor()}`}>
                    {getNodeIcon()}
                    <span>Configurar {localData.label || node.type}</span>
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>

            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Common: Label */}
                <div className="space-y-2">
                    <Label>Nome do Nó</Label>
                    <Input
                        value={localData.label || ''}
                        onChange={(e) => updateField('label', e.target.value)}
                        placeholder="Nome personalizado..."
                    />
                </div>

                {/* Type-specific config */}
                {renderConfig()}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => {
                            // Clone node logic would go here
                        }}
                    >
                        <Copy className="h-3 w-3" />
                        Duplicar
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="flex-1 gap-1"
                        onClick={() => onDelete(node.id)}
                    >
                        <Trash2 className="h-3 w-3" />
                        Excluir
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
