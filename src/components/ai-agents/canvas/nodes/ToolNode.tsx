import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wrench } from 'lucide-react';
import { useState } from 'react';

const TOOL_OPTIONS = [
    { value: 'check_availability', label: 'Consultar Agenda' },
    { value: 'book_class', label: 'Agendar Aula' },
    { value: 'get_customer', label: 'Buscar Cliente' },
    { value: 'update_tags', label: 'Atualizar Tags' },
];

export function ToolNode({ data, selected }: NodeProps) {
    const [selectedTool, setSelectedTool] = useState(data.tool || '');

    return (
        <Card className={`w-64 shadow-lg ${selected ? 'ring-2 ring-amber-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-amber-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-amber-600" />
                    {data.label || 'Ferramenta'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3">
                <Select value={selectedTool} onValueChange={setSelectedTool}>
                    <SelectTrigger className="nodrag">
                        <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                        {TOOL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardContent>

            <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
        </Card>
    );
}
