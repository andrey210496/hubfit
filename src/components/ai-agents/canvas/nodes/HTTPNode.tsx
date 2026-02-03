
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function HTTPNode({ data, selected }: NodeProps) {
    const [method, setMethod] = useState(data.method || 'POST');
    const [url, setUrl] = useState(data.url || '');

    return (
        <Card className={`w-72 shadow-lg ${selected ? 'ring-2 ring-cyan-500' : ''}`}>
            <Handle type="target" position={Position.Top} className="!bg-cyan-500" />

            <CardHeader className="py-3 px-4 bg-gradient-to-r from-cyan-500/10 to-teal-500/10">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Globe className="h-4 w-4 text-cyan-600" />
                    {data.label || 'Webhook'}
                </CardTitle>
            </CardHeader>

            <CardContent className="p-3 space-y-2">
                <div className="flex gap-2">
                    <Select value={method} onValueChange={setMethod}>
                        <SelectTrigger className="w-24 nodrag">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="https://..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="nodrag text-xs"
                    />
                </div>
                <p className="text-[10px] text-muted-foreground">
                    Envia dados do contato para URL externa
                </p>
            </CardContent>

            <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
        </Card>
    );
}
