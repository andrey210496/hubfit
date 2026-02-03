import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ClipboardList, 
  Search, 
  UserPlus, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle2,
  FileText,
  History,
  Camera
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { WebcamCapture } from '@/components/webcam/WebcamCapture';

interface MemberWithContact {
  id: string;
  created_at: string;
  contact: {
    id: string;
    name: string;
    email: string | null;
    cpf: string | null;
  };
  parq_completed?: boolean;
  last_parq_date?: string | null;
}

interface ParQResponse {
  id: string;
  completed_date: string;
  has_medical_restriction: boolean;
  question_1: boolean;
  question_2: boolean;
  question_3: boolean;
  question_4: boolean;
  question_5: boolean;
  question_6: boolean;
  question_7: boolean;
  question_8: boolean;
  question_9: boolean;
  question_10: boolean;
  question_10_details: string | null;
  signature: string;
}

const PAR_Q_QUESTIONS = [
  "Algum médico já disse que você tem problemas cardíacos ou pressão arterial e que você deveria realizar atividades físicas somente sob supervisão de profissionais de saúde?",
  "Você sente dores no peito quando caminha ou realiza atividades cotidianas?",
  "No último mês, você sentiu dor no peito ao realizar atividades físicas?",
  "Você sofre algum desequilíbrio por causa de tontura ou perda de consciência?",
  "Você possui algum problema ósseo ou articular que pode ser afetado ou agravado pela atividade física?",
  "Você está atualmente fazendo uso de algum tipo de medicamento contínuo?",
  "Você está fazendo algum tratamento médico para pressão arterial ou problemas cardíacos?",
  "Você está fazendo algum tratamento médico contínuo que pode ser prejudicado pela atividade física?",
  "Você fez algum tipo de cirurgia que de alguma forma compromete a atividade física?",
  "Você conhece algum outro motivo pelo qual a atividade física poderia potencialmente comprometer sua saúde?"
];

export default function ParQPage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  
  const [step, setStep] = useState<'select' | 'form' | 'history'>('select');
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState<MemberWithContact[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberWithContact | null>(null);
  const [loading, setLoading] = useState(false);
  const [showNewMemberDialog, setShowNewMemberDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [parqHistory, setParqHistory] = useState<ParQResponse[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<ParQResponse | null>(null);

  // Form state
  const [answers, setAnswers] = useState<{ [key: number]: boolean | null }>({});
  const [question10Details, setQuestion10Details] = useState('');
  const [signature, setSignature] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<Blob | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (companyId && searchTerm.length >= 2) {
      searchMembers();
    } else {
      setMembers([]);
    }
  }, [searchTerm, companyId]);

  const searchMembers = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      const { data: membersData, error } = await supabase
        .from('members')
        .select(`
          id, 
          created_at,
          contact:contacts!inner(id, name, email, cpf)
        `)
        .eq('company_id', companyId)
        .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cpf.ilike.%${searchTerm}%`, { referencedTable: 'contacts' })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Check PAR-Q status for each member
      const membersWithParQ = await Promise.all(
        (membersData || []).map(async (member: any) => {
          const { data: parqData } = await supabase
            .from('par_q_responses')
            .select('completed_date')
            .eq('member_id', member.id)
            .order('completed_date', { ascending: false })
            .limit(1);

          return {
            ...member,
            parq_completed: parqData && parqData.length > 0,
            last_parq_date: parqData?.[0]?.completed_date || null
          } as MemberWithContact;
        })
      );

      setMembers(membersWithParQ);
    } catch (error) {
      console.error('Error searching members:', error);
      toast.error('Erro ao buscar alunos');
    } finally {
      setLoading(false);
    }
  };

  const loadParQHistory = async (memberId: string) => {
    try {
      const { data, error } = await supabase
        .from('par_q_responses')
        .select('*')
        .eq('member_id', memberId)
        .order('completed_date', { ascending: false });

      if (error) throw error;
      setParqHistory(data || []);
    } catch (error) {
      console.error('Error loading PAR-Q history:', error);
      toast.error('Erro ao carregar histórico');
    }
  };

  const selectMember = (member: MemberWithContact) => {
    setSelectedMember(member);
    setStep('form');
    resetForm();
  };

  const resetForm = () => {
    setAnswers({});
    setQuestion10Details('');
    setSignature('');
    setCapturedPhoto(null);
  };

  const handleAnswerChange = (questionIndex: number, value: boolean) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const isFormComplete = () => {
    for (let i = 0; i < 10; i++) {
      if (answers[i] === undefined || answers[i] === null) return false;
    }
    if (answers[9] === true && !question10Details.trim()) return false;
    if (!signature.trim()) return false;
    if (!capturedPhoto) return false;
    return true;
  };

  const hasAnyYes = () => {
    return Object.values(answers).some(a => a === true);
  };

  const getUnansweredQuestions = () => {
    const unanswered: number[] = [];
    for (let i = 0; i < 10; i++) {
      if (answers[i] === undefined || answers[i] === null) {
        unanswered.push(i + 1);
      }
    }
    return unanswered;
  };

  const getMissingItems = () => {
    const missing: string[] = [];
    const unanswered = getUnansweredQuestions();
    if (unanswered.length > 0) {
      missing.push(`Perguntas ${unanswered.join(', ')}`);
    }
    if (answers[9] === true && !question10Details.trim()) {
      missing.push('Detalhes da pergunta 10');
    }
    if (!capturedPhoto) {
      missing.push('Foto de validação');
    }
    if (!signature.trim()) {
      missing.push('Assinatura');
    }
    return missing;
  };

  const handleSubmit = async () => {
    if (!selectedMember || !companyId || !profile?.id || !capturedPhoto) return;

    setSubmitting(true);
    try {
      const hasMedicalRestriction = hasAnyYes();

      // Upload photo to storage
      const photoFileName = `${companyId}/parq/${selectedMember.id}_${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(photoFileName, capturedPhoto, {
          contentType: 'image/jpeg'
        });

      if (uploadError) {
        console.error('Error uploading photo:', uploadError);
        throw new Error('Erro ao fazer upload da foto');
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('files')
        .getPublicUrl(photoFileName);

      // Collect validation metadata
      const validationMetadata = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      const { error } = await supabase
        .from('par_q_responses')
        .insert({
          company_id: companyId,
          member_id: selectedMember.id,
          question_1: answers[0] || false,
          question_2: answers[1] || false,
          question_3: answers[2] || false,
          question_4: answers[3] || false,
          question_5: answers[4] || false,
          question_6: answers[5] || false,
          question_7: answers[6] || false,
          question_8: answers[7] || false,
          question_9: answers[8] || false,
          question_10: answers[9] || false,
          question_10_details: answers[9] ? question10Details : null,
          has_medical_restriction: hasMedicalRestriction,
          signature: signature,
          photo_url: urlData.publicUrl,
          validation_metadata: validationMetadata,
          created_by_user_id: profile.id
        });

      if (error) throw error;

      toast.success('PAR-Q salvo com sucesso!');
      setStep('select');
      setSelectedMember(null);
      setSearchTerm('');
      resetForm();
    } catch (error) {
      console.error('Error saving PAR-Q:', error);
      toast.error('Erro ao salvar PAR-Q');
    } finally {
      setSubmitting(false);
    }
  };

  const maskCPF = (cpf: string | null) => {
    if (!cpf) return '---';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return `XXX.XXX.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };

  const handleViewHistory = async (member: MemberWithContact) => {
    setSelectedMember(member);
    await loadParQHistory(member.id);
    setShowHistoryDialog(true);
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-primary/10">
            <ClipboardList className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">PAR-Q</h1>
            <p className="text-muted-foreground">
              Questionário de Prontidão para Atividade Física
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Selecionar Aluno
                </CardTitle>
                <CardDescription>
                  Busque um aluno pelo nome, CPF ou email para preencher o PAR-Q
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o nome, CPF ou email do aluno..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => toast.info('Para cadastrar um novo aluno, acesse a página de Clientes')}
                    className="gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    Novo Aluno
                  </Button>
                </div>

                {searchTerm.length >= 2 && (
                  <div className="space-y-2">
                    {loading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Buscando...
                      </div>
                    ) : members.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Nenhum aluno encontrado
                      </div>
                    ) : (
                      <div className="grid gap-2">
                        {members.map(member => (
                          <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                          >
                            <Card
                              className={cn(
                                "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
                                "group"
                              )}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex-1" onClick={() => selectMember(member)}>
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-lg font-semibold text-primary">
                                          {member.contact.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-medium">{member.contact.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {member.contact.email || 'Sem email'} • CPF: {maskCPF(member.contact.cpf)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {member.parq_completed ? (
                                      <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                        Concluído
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                                        Pendente
                                      </Badge>
                                    )}
                                    {member.parq_completed && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewHistory(member);
                                        }}
                                        className="gap-1"
                                      >
                                        <History className="h-4 w-4" />
                                        Histórico
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        selectMember(member);
                                      }}
                                      className="gap-1"
                                    >
                                      <FileText className="h-4 w-4" />
                                      Preencher
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 'form' && selectedMember && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <Button
              variant="ghost"
              onClick={() => {
                setStep('select');
                setSelectedMember(null);
              }}
              className="gap-2 mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {selectedMember.contact.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{selectedMember.contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        CPF: {maskCPF(selectedMember.contact.cpf)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium">
                      {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Questionário PAR-Q</CardTitle>
                <CardDescription>
                  Responda SIM ou NÃO para cada uma das perguntas abaixo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-6">
                    {PAR_Q_QUESTIONS.map((question, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "p-4 rounded-lg border transition-colors",
                          answers[index] === true && "border-warning/50 bg-warning/5",
                          answers[index] === false && "border-success/50 bg-success/5",
                          answers[index] === undefined && "border-border"
                        )}
                      >
                        <div className="flex gap-4">
                          <span className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {index + 1}
                          </span>
                          <div className="flex-1 space-y-3">
                            <p className="text-sm leading-relaxed">{question}</p>
                            <RadioGroup
                              value={answers[index] === true ? 'yes' : answers[index] === false ? 'no' : undefined}
                              onValueChange={(value) => handleAnswerChange(index, value === 'yes')}
                              className="flex gap-4"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`q${index}-yes`} />
                                <Label htmlFor={`q${index}-yes`} className="cursor-pointer font-medium text-warning">
                                  SIM
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`q${index}-no`} />
                                <Label htmlFor={`q${index}-no`} className="cursor-pointer font-medium text-success">
                                  NÃO
                                </Label>
                              </div>
                            </RadioGroup>

                            {index === 9 && answers[9] === true && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                              >
                                <Label htmlFor="q10-details" className="text-sm font-medium">
                                  QUAL?
                                </Label>
                                <Textarea
                                  id="q10-details"
                                  placeholder="Descreva o motivo..."
                                  value={question10Details}
                                  onChange={e => setQuestion10Details(e.target.value)}
                                  className="mt-2"
                                />
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Warning/Success Messages */}
                <AnimatePresence>
                  {Object.keys(answers).length === 10 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {hasAnyYes() ? (
                        <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-warning">ATENÇÃO</p>
                            <p className="text-sm text-muted-foreground">
                              Ao menos uma resposta foi positiva. De acordo com a Lei nº 15681 de 2013, 
                              o aluno deve consultar um médico antes de iniciar ou alterar o nível de atividade física.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-lg bg-success/10 border border-success/30 flex gap-3">
                          <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold text-success">APROVADO</p>
                            <p className="text-sm text-muted-foreground">
                              Todas as respostas indicam que o aluno está apto para iniciar a atividade física.
                            </p>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Declaration */}
                <Card className="bg-muted/30">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-2">Declaração</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Declaro que estou ciente de que é obrigatório responder ao Questionário de Prontidão 
                      para Atividade Física, conforme previsto na Lei nº 15681 de 2013, antes de iniciar 
                      ou aumentar o nível pretendido de atividade física, e que, caso ao menos uma das 
                      respostas seja positiva, deverei falar com um médico para que esse profissional 
                      avalie a necessidade de exames médicos para atestar o início ou alteração da 
                      referida atividade física.
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      Declaro ainda que assumo total responsabilidade por realizar qualquer atividade 
                      física sem cumprir essa recomendação.
                    </p>
                  </CardContent>
                </Card>

                {/* Signature Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome do Aluno</Label>
                    <p className="font-medium">{selectedMember.contact.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="font-medium">{maskCPF(selectedMember.contact.cpf)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="font-medium">
                      {format(new Date(), "dd/MM/yyyy")}
                    </p>
                  </div>
                </div>

                {/* Webcam Photo Capture */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    <Label className="text-base font-semibold">Foto de Validação</Label>
                    <Badge variant="outline" className="text-xs">Obrigatório</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Tire uma foto do aluno para comprovar que ele próprio está preenchendo o questionário.
                  </p>
                  <WebcamCapture
                    onCapture={setCapturedPhoto}
                    capturedPhoto={capturedPhoto}
                    onClear={() => setCapturedPhoto(null)}
                  />
                </div>

                <div>
                  <Label htmlFor="signature">Assinatura Digital</Label>
                  <Input
                    id="signature"
                    placeholder="Digite o nome completo como assinatura..."
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    A assinatura digital tem validade legal conforme MP 2.200-2/2001
                  </p>
                </div>

                {/* Validation feedback */}
                {!isFormComplete() && (
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Itens pendentes para salvar:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {getMissingItems().map((item, idx) => (
                        <Badge key={idx} variant="outline" className="text-warning border-warning/30 bg-warning/10">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStep('select');
                      setSelectedMember(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!isFormComplete() || submitting}
                    className="gap-2"
                  >
                    {submitting ? (
                      <>Salvando...</>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Salvar PAR-Q
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico PAR-Q - {selectedMember?.contact.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3">
              {parqHistory.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum PAR-Q encontrado
                </p>
              ) : (
                parqHistory.map((item) => (
                  <Card
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary/50",
                      selectedHistoryItem?.id === item.id && "border-primary"
                    )}
                    onClick={() => setSelectedHistoryItem(
                      selectedHistoryItem?.id === item.id ? null : item
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {format(new Date(item.completed_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              às {format(new Date(item.completed_date), "HH:mm")}
                            </p>
                          </div>
                        </div>
                        {item.has_medical_restriction ? (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Com Restrições
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Liberado
                          </Badge>
                        )}
                      </div>

                      <AnimatePresence>
                        {selectedHistoryItem?.id === item.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t"
                          >
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {PAR_Q_QUESTIONS.map((q, i) => {
                                const key = `question_${i + 1}` as keyof ParQResponse;
                                const answer = item[key] as boolean;
                                return (
                                  <div key={i} className="flex items-start gap-2">
                                    <span className={cn(
                                      "flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-medium",
                                      answer ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                                    )}>
                                      {i + 1}
                                    </span>
                                    <span className={cn(
                                      "text-xs",
                                      answer ? "text-warning" : "text-muted-foreground"
                                    )}>
                                      {answer ? "SIM" : "NÃO"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {item.question_10_details && (
                              <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                                <strong>Detalhes:</strong> {item.question_10_details}
                              </div>
                            )}
                            <div className="mt-3 text-sm text-muted-foreground">
                              <strong>Assinatura:</strong> {item.signature}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
