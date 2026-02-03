
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

export function MessageNode({ data, selected }: NodeProps) {
    const [message, setMessage] = useState(data.message || '');

    return (
        <Card className={`w-80 shadow-lg ${selected ? 'ring-2 ring-blue-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-blue-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    {data.label || 'Enviar Mensagem'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
                <Textarea
                    placeholder="Mensagem... Use {{nome}}, {{plano}}"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="text-xs h-20 resize-none nodrag"
                />
                <div className="flex gap-1 flex-wrap">
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80">
                        {'{{nome}}'}
                    </span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80">
                        {'{{plano}}'}
                    </span>
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded cursor-pointer hover:bg-muted/80">
                        {'{{telefone}}'}
                    </span>
                </div>
            </CardContent>

            <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
        </Card>
    );
}
