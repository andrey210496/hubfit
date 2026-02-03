import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, X, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

interface ChatPlaygroundProps {
    agentId: string;
    agentName: string;
    isOpen: boolean;
    onClose: () => void;
}

// Mock responses for testing when Edge Function is not available
const MOCK_RESPONSES = [
    "Olá! Sou o assistente de IA. Como posso ajudá-lo hoje?",
    "Entendi! Deixe-me verificar isso para você...",
    "Temos várias opções disponíveis. Posso fornecer mais detalhes sobre alguma em específico?",
    "Perfeito! Vou agendar isso para você. Qual horário seria melhor?",
    "Obrigado pelo seu interesse! Posso ajudar com mais alguma coisa?",
];

export function ChatPlayground({ agentId, agentName, isOpen, onClose }: ChatPlaygroundProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useMock, setUseMock] = useState(false);
    const [connectionError, setConnectionError] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const getMockResponse = () => {
        return MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        // If using mock mode, simulate a response
        if (useMock) {
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: getMockResponse()
            }]);
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
                body: {
                    action: 'chat',
                    agent_id: agentId,
                    payload: {
                        messages: [...messages, { role: 'user', content: userMessage }]
                    }
                }
            });

            if (error) throw error;

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.message || 'Sem resposta do agente.'
            }]);
            setConnectionError(false);
        } catch (err: any) {
            console.error('Chat error:', err);
            setConnectionError(true);

            // Auto-enable mock mode on connection failure
            if (!useMock) {
                setUseMock(true);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ Não foi possível conectar à Edge Function. Modo de simulação ativado.\n\n${getMockResponse()}`
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `Erro: ${err.message || 'Falha ao conectar com o agente.'}`
                }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg h-[600px] flex flex-col shadow-2xl">
                <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
                    <div className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        <CardTitle className="text-base">{agentName} - Playground</CardTitle>
                        {useMock && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-0.5 rounded">
                                Simulação
                            </span>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                    {connectionError && (
                        <Alert variant="destructive" className="m-2 py-2">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="text-xs">
                                Edge Function não disponível.
                                <button
                                    className="underline ml-1"
                                    onClick={() => setUseMock(!useMock)}
                                >
                                    {useMock ? 'Tentar reconectar' : 'Usar simulação'}
                                </button>
                            </AlertDescription>
                        </Alert>
                    )}

                    <ScrollArea ref={scrollRef} className="flex-1 p-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                                <Bot className="h-12 w-12 opacity-20" />
                                <p>Envie uma mensagem para testar seu agente.</p>
                                {useMock && (
                                    <p className="text-xs text-yellow-600">
                                        (Modo de simulação - respostas são fictícias)
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((msg, i) => (
                                    <div key={i} className={cn(
                                        "flex gap-3",
                                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                                    )}>
                                        {msg.role === 'assistant' && (
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                                <Bot className="h-4 w-4 text-primary" />
                                            </div>
                                        )}
                                        <div className={cn(
                                            "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                                            msg.role === 'user'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted'
                                        )}>
                                            {msg.content}
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                                <User className="h-4 w-4" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex gap-3 justify-start">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="bg-muted rounded-lg px-3 py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Digite sua mensagem..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
