import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Loader2, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

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
    "Para processar sua solicitação, preciso de mais alguns detalhes. Poderia especificar?",
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

            // Auto-enable mock mode on connection failure if not already manual
            if (!useMock) {
                setUseMock(true);
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `⚠️ **Conexão Falhou**\n\nNão foi possível conectar à Edge Function. Ativando modo de simulação automaticamente.\n\n${getMockResponse()}`
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `**Erro**: ${err.message || 'Falha ao conectar com o agente.'}`
                }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl h-[80vh] bg-background border border-border shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 rounded-none sm:rounded-lg"
                style={{ borderRadius: '0px' }} // Sharp edges as per design guidelines
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4 bg-card/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-none bg-primary flex items-center justify-center shadow-sm">
                            <Bot className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-none tracking-tight">{agentName}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-muted-foreground font-medium">Online</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {useMock && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 text-xs font-medium uppercase tracking-wider">
                                <AlertTriangle className="h-3 w-3" />
                                Simulação
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-none hover:bg-destructive/10 hover:text-destructive transition-colors">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                {/* Connection Error Alert */}
                {connectionError && !useMock && (
                    <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-3 w-3" />
                            Erro de conexão com o servidor.
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs hover:bg-destructive/20 text-destructive"
                            onClick={() => setUseMock(true)}
                        >
                            Ativar Simulação
                        </Button>
                    </div>
                )}

                {/* Chat Area */}
                <ScrollArea ref={scrollRef} className="flex-1 p-6 bg-muted/30">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-50">
                            <Bot className="h-16 w-16" />
                            <div className="text-center space-y-1">
                                <p className="font-medium">Inicie uma conversa</p>
                                <p className="text-sm">Teste as capacidades do seu agente agora mesmo.</p>
                            </div>
                            {useMock && (
                                <p className="text-xs text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                                    Modo de Simulação Ativo
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((msg, i) => (
                                <div key={i} className={cn(
                                    "flex gap-4 animate-in slide-in-from-bottom-2 duration-300",
                                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                                )}>
                                    {msg.role === 'assistant' && (
                                        <div className="h-8 w-8 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-1">
                                            <Bot className="h-4 w-4 text-primary" />
                                        </div>
                                    )}

                                    <div className={cn(
                                        "max-w-[85%] px-4 py-3 shadow-sm",
                                        msg.role === 'user'
                                            ? 'bg-primary text-primary-foreground rounded-none rounded-tl-lg rounded-bl-lg rounded-br-lg'
                                            : 'bg-card border border-border rounded-none rounded-tr-lg rounded-bl-lg rounded-br-lg'
                                    )}>
                                        {msg.role === 'assistant' ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:p-2">
                                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="text-sm border-none shadow-none">{msg.content}</p>
                                        )}
                                    </div>

                                    {msg.role === 'user' && (
                                        <div className="h-8 w-8 rounded-none bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-1">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex gap-4 animate-in fade-in duration-300">
                                    <div className="h-8 w-8 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                        <Bot className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="bg-card border border-border px-4 py-3 rounded-none rounded-tr-lg rounded-bl-lg rounded-br-lg flex items-center gap-2 shadow-sm">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        <span className="text-xs text-muted-foreground font-medium">Pensando...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 relative">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={useMock ? "Digite sua mensagem (Simulação)..." : "Digite sua mensagem..."}
                            disabled={isLoading}
                            className="flex-1 pr-12 h-12 rounded-none border-input focus-visible:ring-primary/20"
                        />
                        <Button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            size="icon"
                            className="absolute right-1 top-1 h-10 w-10 rounded-none shadow-none"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        </Button>
                    </form>
                    <div className="flex justify-between items-center mt-2 px-1">
                        <p className="text-[10px] text-muted-foreground">
                            Pressione Enter para enviar
                        </p>
                        <button
                            type="button"
                            onClick={() => setUseMock(!useMock)}
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                        >
                            <RefreshCw className="h-3 w-3" />
                            {useMock ? 'Desativar modo simulação' : 'Testar em modo simulação'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
