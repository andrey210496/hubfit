import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { GitBranch } from 'lucide-react';
import { useState } from 'react';

export function ConditionNode({ data, selected }: NodeProps) {
    const [condition, setCondition] = useState(data.condition || '');

    return (
        <Card className={`w-64 shadow-lg ${selected ? 'ring-2 ring-emerald-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-emerald-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-emerald-600" />
                    {data.label || 'Condição'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3">
                <Input
                    placeholder="Ex: tags.includes('vip')"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="text-xs nodrag"
                />
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>✓ Sim</span>
                    <span>✗ Não</span>
                </div>
            </CardContent>

            <Handle
                type="source"
                position={Position.Bottom}
                id="yes"
                style={{ left: '30%' }}
                className="!bg-emerald-500"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                id="no"
                style={{ left: '70%' }}
                className="!bg-red-500"
            />
        </Card>
    );
}
