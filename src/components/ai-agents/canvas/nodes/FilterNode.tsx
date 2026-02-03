
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter } from 'lucide-react';
import { useState } from 'react';

export function FilterNode({ data, selected }: NodeProps) {
    const [field, setField] = useState(data.field || 'tags');
    const [condition, setCondition] = useState(data.condition || 'contains');
    const [value, setValue] = useState(data.value || '');

    return (
        <Card className={`w-64 shadow-lg ${selected ? 'ring-2 ring-purple-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-purple-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Filter className="h-4 w-4 text-purple-600" />
                    {data.label || 'Filtrar'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
                <Select value={field} onValueChange={setField}>
                    <SelectTrigger className="nodrag">
                        <SelectValue placeholder="Campo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="tags">Tags</SelectItem>
                        <SelectItem value="plan">Plano</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="last_visit">Última Visita</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="nodrag">
                        <SelectValue placeholder="Condição" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="contains">Contém</SelectItem>
                        <SelectItem value="not_contains">Não Contém</SelectItem>
                        <SelectItem value="equals">É igual a</SelectItem>
                        <SelectItem value="greater">Maior que</SelectItem>
                        <SelectItem value="less">Menor que</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    placeholder="Valor..."
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="nodrag text-sm"
                />
            </CardContent>

            <Handle
                type="source"
                position={Position.Bottom}
                id="yes"
                style={{ left: '30%' }}
                className="!bg-green-500"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="no"
                style={{ left: '70%' }}
                className="!bg-red-500"
            />

            <div className="absolute -bottom-5 left-0 right-0 flex justify-between px-6 text-[10px] text-muted-foreground">
                <span>✓ Sim</span>
                <span>✗ Não</span>
            </div>
        </Card>
    );
}
