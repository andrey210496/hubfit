import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Trash2, Plus, HelpCircle, X, Database } from 'lucide-react';
import { toast } from 'sonner';

interface FAQ {
    question: string;
    answer: string;
}

interface KnowledgeStepProps {
    agent: any;
    setAgent: (updater: (prev: any) => any) => void;
}

export function KnowledgeStep({ agent, setAgent }: KnowledgeStepProps) {
    const [faqs, setFaqs] = useState<FAQ[]>([]);
    const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
    const [showAddFaq, setShowAddFaq] = useState(false);
    const [files, setFiles] = useState<{ name: string; size: string }[]>([]);

    const addFaq = () => {
        if (!newFaq.question.trim() || !newFaq.answer.trim()) {
            toast.error('Preencha a pergunta e resposta');
            return;
        }
        setFaqs([...faqs, newFaq]);
        setNewFaq({ question: '', answer: '' });
        setShowAddFaq(false);
        toast.success('FAQ adicionada!');
    };

    const removeFaq = (index: number) => {
        setFaqs(faqs.filter((_, i) => i !== index));
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
        toast.success('Arquivo removido');
    };

    const handleFileUpload = () => {
        // In real implementation, this would open file picker
        toast.info('Upload de arquivos será implementado com integração ao storage');
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Upload className="h-5 w-5" />
                        Base de Conhecimento
                    </CardTitle>
                    <CardDescription>
                        Faça upload de documentos (PDF, TXT) para treinar seu agente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div
                        className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={handleFileUpload}
                    >
                        <div className="p-4 bg-primary/10 rounded-full mb-4">
                            <Upload className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="font-semibold">Arraste arquivos aqui</h4>
                        <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar do computador</p>
                        <Button variant="secondary" size="sm">Selecionar Arquivos</Button>
                    </div>

                    {files.length > 0 && (
                        <div className="space-y-2">
                            <Label>Arquivos Processados ({files.length})</Label>
                            <div className="space-y-2">
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 border rounded-md bg-background">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-4 w-4 text-blue-500" />
                                            <span className="text-sm font-medium">{file.name}</span>
                                            <span className="text-xs text-muted-foreground">({file.size})</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive/90"
                                            onClick={() => removeFile(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="h-5 w-5" />
                        Dados do Sistema (RAG Automático - BETA)
                    </CardTitle>
                    <CardDescription>
                        Selecione quais informações do sistema a IA deve conhecer automaticamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div className="space-y-0.5">
                            <Label className="text-base">Modalidades</Label>
                            <p className="text-sm text-muted-foreground">Injeta lista de aulas e modalidades disponíveis.</p>
                        </div>
                        <Switch
                            checked={agent.memory_config?.rag_sources?.modalities}
                            onCheckedChange={(checked) => setAgent((prev: any) => ({
                                ...prev,
                                memory_config: {
                                    ...prev.memory_config,
                                    rag_sources: { ...prev.memory_config?.rag_sources, modalities: checked }
                                }
                            }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div className="space-y-0.5">
                            <Label className="text-base">Planos e Preços</Label>
                            <p className="text-sm text-muted-foreground">Injeta tabela de planos, valores e condições.</p>
                        </div>
                        <Switch
                            checked={agent.memory_config?.rag_sources?.plans}
                            onCheckedChange={(checked) => setAgent((prev: any) => ({
                                ...prev,
                                memory_config: {
                                    ...prev.memory_config,
                                    rag_sources: { ...prev.memory_config?.rag_sources, plans: checked }
                                }
                            }))}
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-background">
                        <div className="space-y-0.5">
                            <Label className="text-base">Horários de Aula</Label>
                            <p className="text-sm text-muted-foreground">Injeta a grade de horários atualizada.</p>
                        </div>
                        <Switch
                            checked={agent.memory_config?.rag_sources?.schedules}
                            onCheckedChange={(checked) => setAgent((prev: any) => ({
                                ...prev,
                                memory_config: {
                                    ...prev.memory_config,
                                    rag_sources: { ...prev.memory_config?.rag_sources, schedules: checked }
                                }
                            }))}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <HelpCircle className="h-5 w-5" />
                        Perguntas Frequentes (FAQs)
                    </CardTitle>
                    <CardDescription>
                        Adicione perguntas e respostas que o agente deve priorizar.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {faqs.length > 0 && (
                        <div className="space-y-3">
                            {faqs.map((faq, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-muted/30">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-medium text-sm">P: {faq.question}</p>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeFaq(index)}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <p className="text-sm text-muted-foreground">R: {faq.answer}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAddFaq ? (
                        <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-2">
                                <Label>Pergunta</Label>
                                <Input
                                    placeholder="Ex: Qual o horário de funcionamento?"
                                    value={newFaq.question}
                                    onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Resposta</Label>
                                <Textarea
                                    placeholder="Ex: Funcionamos de segunda a sábado, das 6h às 22h."
                                    value={newFaq.answer}
                                    onChange={(e) => setNewFaq({ ...newFaq, answer: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={addFaq}>Adicionar</Button>
                                <Button variant="ghost" onClick={() => setShowAddFaq(false)}>Cancelar</Button>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            className="w-full border-dashed gap-2"
                            onClick={() => setShowAddFaq(true)}
                        >
                            <Plus className="h-4 w-4" /> Adicionar FAQ
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}
