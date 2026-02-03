
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock } from 'lucide-react';
import { useState } from 'react';

export function DelayNode({ data, selected }: NodeProps) {
    const [delay, setDelay] = useState(data.delay || 1);
    const [unit, setUnit] = useState(data.unit || 'hours');

    return (
        <Card className={`w-56 shadow-lg ${selected ? 'ring-2 ring-amber-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-amber-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    {data.label || 'Aguardar'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3">
                <div className="flex gap-2">
                    <Input
                        type="number"
                        min="1"
                        value={delay}
                        onChange={(e) => setDelay(parseInt(e.target.value) || 1)}
                        className="w-16 text-center nodrag"
                    />
                    <Select value={unit} onValueChange={setUnit}>
                        <SelectTrigger className="nodrag">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="minutes">Minutos</SelectItem>
                            <SelectItem value="hours">Horas</SelectItem>
                            <SelectItem value="days">Dias</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>

            <Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
        </Card>
    );
}
