import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Bot } from 'lucide-react';
import { useState } from 'react';

export function PromptNode({ data, selected }: NodeProps) {
    const [prompt, setPrompt] = useState(data.prompt || '');

    return (
        <Card className={`w-72 shadow-lg ${selected ? 'ring-2 ring-primary' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-primary" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    {data.label || 'Agente IA'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3">
                <Textarea
                    placeholder="Instruções do agente..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="text-xs h-24 resize-none nodrag"
                />
            </CardContent>

            <Handle type="source" position={Position.Bottom} className="!bg-primary" />
        </Card>
    );
}
