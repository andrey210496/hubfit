
import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LLMConfig {
    provider: string;
    default_model: string;
    is_active: boolean;
}

import { OPENAI_MODELS, GEMINI_MODELS } from '@/lib/llm-models';

export function IdentityStep({ agent, setAgent }: { agent: any, setAgent: any }) {
    const { profile } = useAuth();
    const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [noApiConfigured, setNoApiConfigured] = useState(false);

    useEffect(() => {
        if (profile?.company_id) {
            loadLLMConfigs();
        }
    }, [profile?.company_id]);

    const loadLLMConfigs = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('llm_configurations')
                .select('provider, default_model, is_active')
                .eq('company_id', profile!.company_id)
                .eq('is_active', true);

            if (error) throw error;

            setLlmConfigs(data || []);
            setNoApiConfigured((data || []).length === 0);

            // Set default model from config if agent doesn't have one
            if (!agent.model && data && data.length > 0) {
                const openaiConfig = data.find(c => c.provider === 'openai');
                if (openaiConfig) {
                    setAgent((prev: any) => ({ ...prev, model: openaiConfig.default_model }));
                }
            }
        } catch (error) {
            console.error('Error loading LLM configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const getAvailableModels = () => {
        const models: { id: string; name: string; description: string; provider: string }[] = [];

        const hasOpenAI = llmConfigs.some(c => c.provider === 'openai');
        const hasGemini = llmConfigs.some(c => c.provider === 'gemini');

        if (hasOpenAI) {
            models.push(...OPENAI_MODELS.map(m => ({ ...m, provider: 'openai' })));
        }
        if (hasGemini) {
            models.push(...GEMINI_MODELS.map(m => ({ ...m, provider: 'gemini' })));
        }

        // Fallback if nothing configured
        if (models.length === 0) {
            models.push(...OPENAI_MODELS.map(m => ({ ...m, provider: 'openai' })));
        }

        return models;
    };

    const generatePrompt = () => {
        const base = `Você é um assistente da Cross Nutrition Box. Seu nome é ${agent.name || 'Assistente'}.

Suas responsabilidades incluem:
- Responder dúvidas sobre planos e modalidades
- Auxiliar no agendamento de aulas experimentais
- Fornecer informações sobre horários e professores
- Ser cordial, profissional e prestativo

Sempre que possível, colete informações de contato e direcione para conversão.`;
        setAgent({ ...agent, prompt: base });
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Perfil do Agente</CardTitle>
                        <CardDescription>Defina quem é seu agente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome do Agente</Label>
                            <Input
                                placeholder="Ex: Ana, Assistente de Vendas"
                                value={agent.name}
                                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Função (Role)</Label>
                            <Select
                                value={agent.role}
                                onValueChange={(v) => setAgent({ ...agent, role: v })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Assistente">Assistente Geral</SelectItem>
                                    <SelectItem value="Vendas">Especialista em Vendas</SelectItem>
                                    <SelectItem value="Suporte">Suporte Técnico</SelectItem>
                                    <SelectItem value="Coach">Coach Fitness</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo de IA</Label>
                            {loading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground p-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Carregando modelos...
                                </div>
                            ) : (
                                <Select
                                    value={agent.model}
                                    onValueChange={(v) => setAgent({ ...agent, model: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o modelo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getAvailableModels().map((model) => (
                                            <SelectItem key={model.id} value={model.id}>
                                                <div className="flex flex-col">
                                                    <span>{model.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {model.description}
                                                    </span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {noApiConfigured && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="text-xs">
                                        Nenhuma API de IA configurada. Vá em <strong>Configurações → Integrações</strong> para adicionar sua chave OpenAI ou Gemini.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="h-full flex flex-col">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Personalidade (System Prompt)</CardTitle>
                            <Button variant="outline" size="sm" onClick={generatePrompt} className="gap-2">
                                <Sparkles className="h-3 w-3" /> Gerar com IA
                            </Button>
                        </div>
                        <CardDescription>Instruções de como o agente deve se comportar.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                        <Textarea
                            className="h-[300px] resize-none font-mono text-sm"
                            placeholder="Você é um assistente prestativo..."
                            value={agent.prompt}
                            onChange={(e) => setAgent({ ...agent, prompt: e.target.value })}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
