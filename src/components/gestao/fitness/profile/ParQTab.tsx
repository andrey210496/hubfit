import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ClipboardList, 
  AlertTriangle, 
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Camera,
  Shield,
  Printer,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  photo_url: string | null;
  validation_metadata: {
    timestamp?: string;
    userAgent?: string;
    platform?: string;
    screenResolution?: string;
    timezone?: string;
  } | null;
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

interface ParQTabProps {
  memberId: string;
  memberName: string;
}

export function ParQTab({ memberId, memberName }: ParQTabProps) {
  const [parqResponses, setParqResponses] = useState<ParQResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchParQResponses();
  }, [memberId]);

  const fetchParQResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('par_q_responses')
        .select('*')
        .eq('member_id', memberId)
        .order('completed_date', { ascending: false });

      if (error) throw error;
      
      // Type assertion for validation_metadata since it's stored as JSONB
      const typedData = (data || []).map(item => ({
        ...item,
        validation_metadata: item.validation_metadata as ParQResponse['validation_metadata']
      }));
      
      setParqResponses(typedData);
      
      // Auto-expand the first (most recent) one
      if (typedData.length > 0) {
        setExpandedId(typedData[0].id);
      }
    } catch (error) {
      console.error('Error fetching PAR-Q responses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPhoto = (photoUrl: string) => {
    setSelectedPhoto(photoUrl);
    setPhotoDialogOpen(true);
  };

  const handlePrint = (parq: ParQResponse) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Não foi possível abrir a janela de impressão');
      return;
    }

    const hasRestriction = parq.has_medical_restriction;
    const completedDate = format(new Date(parq.completed_date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });

    const questionsHtml = PAR_Q_QUESTIONS.map((question, idx) => {
      const key = `question_${idx + 1}` as keyof ParQResponse;
      const answer = parq[key] as boolean;
      return `
        <div style="padding: 12px; margin-bottom: 8px; border: 1px solid ${answer ? '#f59e0b' : '#22c55e'}; border-radius: 8px; background: ${answer ? '#fef3c7' : '#dcfce7'};">
          <div style="display: flex; gap: 12px;">
            <span style="flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; background: ${answer ? '#fcd34d' : '#86efac'}; color: ${answer ? '#92400e' : '#166534'};">
              ${idx + 1}
            </span>
            <div style="flex: 1;">
              <p style="margin: 0 0 8px 0; font-size: 14px;">${question}</p>
              <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${answer ? '#fcd34d' : '#86efac'}; color: ${answer ? '#92400e' : '#166534'};">
                ${answer ? 'SIM' : 'NÃO'}
              </span>
              ${idx === 9 && answer && parq.question_10_details ? `
                <div style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 4px; font-size: 13px;">
                  <strong>Detalhes:</strong> ${parq.question_10_details}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PAR-Q - ${memberName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; color: #1f2937; }
          .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; }
          .header h1 { font-size: 24px; margin-bottom: 8px; }
          .header p { color: #6b7280; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
          .info-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          .info-card h3 { font-size: 14px; color: #6b7280; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
          .photo-container { text-align: center; }
          .photo-container img { max-width: 200px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .signature { font-size: 20px; font-family: 'Georgia', serif; border-bottom: 2px dashed #d1d5db; padding-bottom: 4px; }
          .metadata { font-size: 11px; color: #9ca3af; margin-top: 8px; }
          .questions { margin-bottom: 32px; }
          .questions h2 { font-size: 16px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
          .warning { padding: 16px; border-radius: 8px; background: #fef3c7; border: 1px solid #f59e0b; margin-bottom: 24px; }
          .warning h4 { color: #92400e; margin-bottom: 4px; }
          .warning p { font-size: 13px; color: #6b7280; }
          .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAR-Q - Questionário de Prontidão para Atividade Física</h1>
          <p>Aluno: <strong>${memberName}</strong></p>
          <p>Data de preenchimento: ${completedDate}</p>
        </div>

        ${hasRestriction ? `
          <div class="warning">
            <h4>⚠️ ATENÇÃO - RESTRIÇÃO MÉDICA IDENTIFICADA</h4>
            <p>Ao menos uma resposta foi positiva. De acordo com a Lei nº 15681 de 2013, o aluno deve consultar um médico antes de iniciar ou alterar o nível de atividade física.</p>
          </div>
        ` : ''}

        <div class="info-grid">
          <div class="info-card photo-container">
            <h3>📷 Foto de Validação</h3>
            ${parq.photo_url ? `<img src="${parq.photo_url}" alt="Foto de validação" />` : '<p style="color: #9ca3af;">Sem foto</p>'}
          </div>
          <div class="info-card">
            <h3>✍️ Assinatura Digital</h3>
            <p class="signature">${parq.signature}</p>
            ${parq.validation_metadata ? `
              <div class="metadata">
                ${parq.validation_metadata.timestamp ? `<p><strong>Data/Hora:</strong> ${format(new Date(parq.validation_metadata.timestamp), "dd/MM/yyyy 'às' HH:mm:ss")}</p>` : ''}
                ${parq.validation_metadata.platform ? `<p><strong>Plataforma:</strong> ${parq.validation_metadata.platform}</p>` : ''}
                ${parq.validation_metadata.screenResolution ? `<p><strong>Resolução:</strong> ${parq.validation_metadata.screenResolution}</p>` : ''}
                ${parq.validation_metadata.timezone ? `<p><strong>Timezone:</strong> ${parq.validation_metadata.timezone}</p>` : ''}
              </div>
            ` : ''}
          </div>
        </div>

        <div class="questions">
          <h2>📋 Respostas do Questionário</h2>
          ${questionsHtml}
        </div>

        <div class="footer">
          <p>Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}</p>
          <p>Este documento possui validade legal conforme Lei nº 15681 de 2013</p>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportPDF = (parq: ParQResponse) => {
    // Using print dialog with PDF option
    toast.info('Selecione "Salvar como PDF" no diálogo de impressão');
    handlePrint(parq);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (parqResponses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium mb-2">Nenhum PAR-Q preenchido</p>
          <p className="text-sm">O aluno ainda não preencheu o questionário de prontidão para atividade física.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Histórico PAR-Q</h3>
          <Badge variant="outline">{parqResponses.length} registro(s)</Badge>
        </div>
      </div>

      <div className="space-y-4">
        {parqResponses.map((parq, index) => (
          <Card 
            key={parq.id}
            className={cn(
              "transition-all",
              expandedId === parq.id && "ring-2 ring-primary/20"
            )}
          >
            <CardHeader 
              className="cursor-pointer"
              onClick={() => setExpandedId(expandedId === parq.id ? null : parq.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    parq.has_medical_restriction ? "bg-warning/10" : "bg-success/10"
                  )}>
                    {parq.has_medical_restriction ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {format(new Date(parq.completed_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      {index === 0 && (
                        <Badge variant="default" className="text-xs">Mais recente</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      às {format(new Date(parq.completed_date), "HH:mm")}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handlePrint(parq); }}
                    title="Imprimir"
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => { e.stopPropagation(); handleExportPDF(parq); }}
                    title="Exportar PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {parq.has_medical_restriction ? (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      Com Restrições
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                      Liberado
                    </Badge>
                  )}
                  {expandedId === parq.id ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            <AnimatePresence>
              {expandedId === parq.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CardContent className="pt-0 space-y-6">
                    {/* Photo and Signature Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Photo */}
                      <Card className="bg-muted/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Camera className="h-4 w-4 text-primary" />
                            <span className="font-medium text-sm">Foto de Validação</span>
                          </div>
                          {parq.photo_url ? (
                            <div 
                              className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
                              onClick={() => handleViewPhoto(parq.photo_url!)}
                            >
                              <img 
                                src={parq.photo_url} 
                                alt="Foto de validação" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-white text-sm font-medium">Clique para ampliar</span>
                              </div>
                            </div>
                          ) : (
                            <div className="aspect-video rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                              <div className="text-center">
                                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p className="text-xs">Sem foto</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Signature and Metadata */}
                      <Card className="bg-muted/30">
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <User className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">Assinatura Digital</span>
                            </div>
                            <p className="text-lg font-medium border-b-2 border-dashed border-muted-foreground/30 pb-1">
                              {parq.signature}
                            </p>
                          </div>

                          {parq.validation_metadata && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Shield className="h-4 w-4 text-primary" />
                                <span className="font-medium text-sm">Metadados de Validação</span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {parq.validation_metadata.timestamp && (
                                  <p>
                                    <span className="font-medium">Data/Hora:</span>{' '}
                                    {format(new Date(parq.validation_metadata.timestamp), "dd/MM/yyyy 'às' HH:mm:ss")}
                                  </p>
                                )}
                                {parq.validation_metadata.platform && (
                                  <p>
                                    <span className="font-medium">Plataforma:</span>{' '}
                                    {parq.validation_metadata.platform}
                                  </p>
                                )}
                                {parq.validation_metadata.screenResolution && (
                                  <p>
                                    <span className="font-medium">Resolução:</span>{' '}
                                    {parq.validation_metadata.screenResolution}
                                  </p>
                                )}
                                {parq.validation_metadata.timezone && (
                                  <p>
                                    <span className="font-medium">Timezone:</span>{' '}
                                    {parq.validation_metadata.timezone}
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Questions and Answers */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="font-medium">Respostas do Questionário</span>
                      </div>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-3">
                          {PAR_Q_QUESTIONS.map((question, idx) => {
                            const key = `question_${idx + 1}` as keyof ParQResponse;
                            const answer = parq[key] as boolean;
                            return (
                              <div 
                                key={idx}
                                className={cn(
                                  "p-3 rounded-lg border",
                                  answer ? "bg-warning/5 border-warning/30" : "bg-success/5 border-success/30"
                                )}
                              >
                                <div className="flex gap-3">
                                  <span className={cn(
                                    "flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold",
                                    answer ? "bg-warning/20 text-warning" : "bg-success/20 text-success"
                                  )}>
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1">
                                    <p className="text-sm mb-2">{question}</p>
                                    <Badge 
                                      variant="outline" 
                                      className={cn(
                                        answer 
                                          ? "bg-warning/10 text-warning border-warning/20" 
                                          : "bg-success/10 text-success border-success/20"
                                      )}
                                    >
                                      {answer ? 'SIM' : 'NÃO'}
                                    </Badge>
                                    {idx === 9 && answer && parq.question_10_details && (
                                      <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                                        <span className="font-medium">Detalhes:</span> {parq.question_10_details}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Medical Warning */}
                    {parq.has_medical_restriction && (
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
                    )}
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      {/* Photo Dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Foto de Validação - {memberName}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="relative aspect-video rounded-lg overflow-hidden">
              <img 
                src={selectedPhoto} 
                alt="Foto de validação ampliada" 
                className="w-full h-full object-contain bg-black"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
