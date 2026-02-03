import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Send, FileText, CheckCircle, Clock, XCircle, AlertCircle, Loader2, Image, Video, File } from "lucide-react";
import { toast } from "sonner";

type HeaderType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | null;

interface TemplateComponent {
  type: string;
  format?: string;
  text?: string;
  example?: any;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface MessageTemplate {
  id: string;
  template_id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
  quality_score: string | null;
  rejected_reason: string | null;
  last_synced_at: string | null;
  whatsapp_id: string;
}

interface TemplatesListProps {
  whatsappId?: string;
  onSelectTemplate?: (template: MessageTemplate) => void;
  contactId?: string;
  ticketId?: string;
}

export function TemplatesList({ whatsappId, onSelectTemplate, contactId, ticketId }: TemplatesListProps) {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [headerParams, setHeaderParams] = useState<string[]>([]);
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string>('');
  const [headerType, setHeaderType] = useState<HeaderType>(null);

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['message-templates', whatsappId],
    queryFn: async () => {
      let query = supabase
        .from('message_templates')
        .select('*')
        .eq('status', 'APPROVED')
        .order('name');

      if (whatsappId) {
        query = query.eq('whatsapp_id', whatsappId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        components: (Array.isArray(t.components) ? t.components : []) as unknown as TemplateComponent[],
      })) as MessageTemplate[];
    },
  });

  // Fetch whatsapps for sync
  const { data: whatsapps } = useQuery({
    queryKey: ['whatsapps-cloud-api'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapps')
        .select('id, name, phone_number_id, waba_id')
        .not('phone_number_id', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  // Sync templates mutation
  const syncMutation = useMutation({
    mutationFn: async (whatsappId: string) => {
      const { data, error } = await supabase.functions.invoke('sync-templates', {
        body: { whatsappId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Sincronizado! ${data.synced} templates atualizados.`);
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  // Send template mutation
  const sendMutation = useMutation({
    mutationFn: async (params: {
      templateId: string;
      contactId?: string;
      ticketId?: string;
      bodyParams: string[];
      headerParams: Array<{ type: string; value: string }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-template', {
        body: {
          templateId: params.templateId,
          contactId: params.contactId,
          ticketId: params.ticketId,
          bodyParams: params.bodyParams.map(v => ({ value: v })),
          headerParams: params.headerParams,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Template enviado com sucesso!');
      setSendDialogOpen(false);
      setSelectedTemplate(null);
      setBodyParams([]);
      setHeaderParams([]);
      setHeaderMediaUrl('');
      setHeaderType(null);
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
    onError: (error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      APPROVED: { icon: <CheckCircle className="h-3 w-3" />, variant: "default" },
      PENDING: { icon: <Clock className="h-3 w-3" />, variant: "secondary" },
      REJECTED: { icon: <XCircle className="h-3 w-3" />, variant: "destructive" },
      DISABLED: { icon: <AlertCircle className="h-3 w-3" />, variant: "outline" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {status}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryColors: Record<string, string> = {
      MARKETING: "bg-purple-500/10 text-purple-500",
      UTILITY: "bg-blue-500/10 text-blue-500",
      AUTHENTICATION: "bg-green-500/10 text-green-500",
    };

    return (
      <Badge variant="outline" className={categoryColors[category] || ""}>
        {category}
      </Badge>
    );
  };

  const extractVariables = (text: string): number => {
    const matches = text?.match(/\{\{(\d+)\}\}/g) || [];
    return matches.length;
  };

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    
    // Count variables in body
    const bodyComponent = template.components.find(c => c.type === 'BODY');
    const bodyVarCount = bodyComponent?.text ? extractVariables(bodyComponent.text) : 0;
    setBodyParams(new Array(bodyVarCount).fill(''));

    // Check header type and count variables
    const headerComponent = template.components.find(c => c.type === 'HEADER');
    const format = headerComponent?.format as HeaderType;
    setHeaderType(format);
    setHeaderMediaUrl('');
    
    if (format === 'TEXT') {
      const headerVarCount = headerComponent?.text ? extractVariables(headerComponent.text) : 0;
      setHeaderParams(new Array(headerVarCount).fill(''));
    } else {
      setHeaderParams([]);
    }

    if (onSelectTemplate) {
      onSelectTemplate(template);
    } else {
      setSendDialogOpen(true);
    }
  };

  const handleSend = () => {
    if (!selectedTemplate) return;

    // Build header params based on type
    let finalHeaderParams: Array<{ type: string; value: string }> = [];
    
    if (headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') {
      if (!headerMediaUrl) {
        toast.error(`URL da mídia do cabeçalho é obrigatória`);
        return;
      }
      finalHeaderParams = [{ type: headerType.toLowerCase(), value: headerMediaUrl }];
    } else if (headerType === 'TEXT' && headerParams.length > 0) {
      finalHeaderParams = headerParams.map(v => ({ type: 'text', value: v }));
    }

    sendMutation.mutate({
      templateId: selectedTemplate.id,
      contactId,
      ticketId,
      bodyParams,
      headerParams: finalHeaderParams,
    });
  };

  const renderTemplatePreview = (template: MessageTemplate) => {
    const header = template.components.find(c => c.type === 'HEADER');
    const body = template.components.find(c => c.type === 'BODY');
    const footer = template.components.find(c => c.type === 'FOOTER');
    const buttons = template.components.find(c => c.type === 'BUTTONS');

    let previewText = body?.text || '';
    bodyParams.forEach((param, index) => {
      previewText = previewText.replace(`{{${index + 1}}}`, param || `{{${index + 1}}}`);
    });

    return (
      <div className="bg-muted rounded-lg p-4 space-y-2">
        {header && (
          <div className="font-semibold text-sm">
            {header.format === 'TEXT' ? header.text : `[${header.format}]`}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{previewText}</div>
        {footer && (
          <div className="text-xs text-muted-foreground">{footer.text}</div>
        )}
        {buttons?.buttons && (
          <div className="flex flex-wrap gap-2 pt-2">
            {buttons.buttons.map((btn, i) => (
              <Button key={i} variant="outline" size="sm" disabled>
                {btn.text}
              </Button>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Sync controls */}
      {whatsapps && whatsapps.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            onValueChange={(value) => syncMutation.mutate(value)}
            disabled={syncMutation.isPending}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Sincronizar templates..." />
            </SelectTrigger>
            <SelectContent>
              {whatsapps.map((wa) => (
                <SelectItem key={wa.id} value={wa.id}>
                  {wa.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {syncMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>
      )}

      {/* Templates list */}
      <ScrollArea className="h-[400px]">
        <div className="grid gap-3">
          {templates?.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => handleSelectTemplate(template)}
            >
              <CardHeader className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      {template.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {template.language}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(template.category)}
                    {getStatusBadge(template.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.components.find(c => c.type === 'BODY')?.text || 'Sem texto'}
                </p>
              </CardContent>
            </Card>
          ))}

          {(!templates || templates.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum template aprovado encontrado.</p>
              <p className="text-sm">Sincronize os templates da sua conta Meta.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Send Dialog */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enviar Template</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} ({selectedTemplate?.language})
            </DialogDescription>
          </DialogHeader>

          {selectedTemplate && (
            <div className="space-y-4">
              {/* Media header input */}
              {(headerType === 'IMAGE' || headerType === 'VIDEO' || headerType === 'DOCUMENT') && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    {headerType === 'IMAGE' && <Image className="h-4 w-4" />}
                    {headerType === 'VIDEO' && <Video className="h-4 w-4" />}
                    {headerType === 'DOCUMENT' && <File className="h-4 w-4" />}
                    {headerType === 'IMAGE' && 'URL da Imagem do Cabeçalho'}
                    {headerType === 'VIDEO' && 'URL do Vídeo do Cabeçalho'}
                    {headerType === 'DOCUMENT' && 'URL do Documento do Cabeçalho'}
                  </Label>
                  <Input
                    placeholder={`https://exemplo.com/${headerType.toLowerCase()}.${headerType === 'IMAGE' ? 'jpg' : headerType === 'VIDEO' ? 'mp4' : 'pdf'}`}
                    value={headerMediaUrl}
                    onChange={(e) => setHeaderMediaUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    A URL deve ser publicamente acessível
                  </p>
                </div>
              )}

              {/* Text header variables */}
              {headerType === 'TEXT' && headerParams.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Variáveis do Cabeçalho</Label>
                  {headerParams.map((_, index) => (
                    <Input
                      key={`header-${index}`}
                      placeholder={`Variável ${index + 1}`}
                      value={headerParams[index]}
                      onChange={(e) => {
                        const newParams = [...headerParams];
                        newParams[index] = e.target.value;
                        setHeaderParams(newParams);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Body variables */}
              {bodyParams.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Variáveis do Corpo</Label>
                  {bodyParams.map((_, index) => (
                    <Input
                      key={`body-${index}`}
                      placeholder={`Variável ${index + 1}`}
                      value={bodyParams[index]}
                      onChange={(e) => {
                        const newParams = [...bodyParams];
                        newParams[index] = e.target.value;
                        setBodyParams(newParams);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Preview */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Pré-visualização</Label>
                {renderTemplatePreview(selectedTemplate)}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || (!contactId && !ticketId)}
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
