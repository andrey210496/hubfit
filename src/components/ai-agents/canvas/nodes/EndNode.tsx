
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Flag } from 'lucide-react';

export function EndNode({ data, selected }: NodeProps) {
    return (
        <Card className={`w-40 shadow-lg ${selected ? 'ring-2 ring-red-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-red-500" />

            <CardHeader className="py-4 px-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 text-center">
                <CardTitle className="text-sm flex items-center justify-center gap-2">
                    <Flag className="h-4 w-4 text-red-600" />
                    {data.label || 'Fim'}
                </CardTitle>
            </CardHeader>
        </Card>
    );
}
