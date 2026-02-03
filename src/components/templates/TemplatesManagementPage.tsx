import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  RefreshCw, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Search,
  Filter,
  Eye,
  ShoppingBag,
  ListOrdered,
  Phone,
  LayoutTemplate,
  Settings,
  ShieldCheck,
  Megaphone,
  Wrench,
  KeyRound
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTemplateDialog } from "./CreateTemplateDialog";

// Template types/subtypes configuration
const TEMPLATE_TYPES = {
  MARKETING: [
    { 
      id: 'standard', 
      name: 'Padrão', 
      description: 'Envie mensagens com mídias e botões personalizados, mas sem pagar mais clientes.',
      icon: LayoutTemplate
    },
    { 
      id: 'catalog', 
      name: 'Catálogo', 
      description: 'Envie mensagens para aumentar as vendas conectando seu catálogo de produtos.',
      icon: ShoppingBag
    },
    { 
      id: 'flows', 
      name: 'Flows', 
      description: 'Envie um formulário para coletar interesses dos clientes e dados de hora marcada ou fazer pesquisas.',
      icon: ListOrdered
    },
    { 
      id: 'order_details', 
      name: 'Detalhes do pedido', 
      description: 'Envie mensagens que os clientes podem usar para fazer pagamentos para você.',
      icon: FileText
    },
    { 
      id: 'call_permission', 
      name: 'Solicitação de permissões para ligação', 
      description: 'Pergunte aos seus clientes se você pode ligar para eles no WhatsApp.',
      icon: Phone
    },
  ],
  UTILITY: [
    { 
      id: 'standard', 
      name: 'Padrão', 
      description: 'Envie mensagens de utilidade como confirmações, lembretes e atualizações.',
      icon: LayoutTemplate
    },
    { 
      id: 'order_status', 
      name: 'Status do pedido', 
      description: 'Atualize seus clientes sobre o status de pedidos e entregas.',
      icon: ShoppingBag
    },
    { 
      id: 'appointment', 
      name: 'Agendamento', 
      description: 'Envie confirmações e lembretes de agendamentos.',
      icon: Clock
    },
    { 
      id: 'account_update', 
      name: 'Atualização de conta', 
      description: 'Notifique clientes sobre mudanças em suas contas.',
      icon: Settings
    },
  ],
  AUTHENTICATION: [
    { 
      id: 'otp', 
      name: 'Código de verificação (OTP)', 
      description: 'Envie códigos de verificação únicos para autenticar usuários.',
      icon: ShieldCheck
    },
    { 
      id: 'password_reset', 
      name: 'Redefinição de senha', 
      description: 'Envie links ou códigos para redefinição de senha.',
      icon: Settings
    },
  ],
};

const CATEGORY_INFO = {
  MARKETING: {
    icon: Megaphone,
    color: 'bg-purple-500',
    description: 'Mensagens de boas-vindas, promoções, ofertas, cupons, boletins informativos, anúncios.'
  },
  UTILITY: {
    icon: Wrench,
    color: 'bg-blue-500',
    description: 'Confirmações, lembretes, atualizações de status e notificações de conta.'
  },
  AUTHENTICATION: {
    icon: KeyRound,
    color: 'bg-green-500',
    description: 'Códigos de verificação e autenticação de usuários.'
  }
};

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
  created_at: string;
  updated_at: string;
}

export function TemplatesManagementPage() {
  const queryClient = useQueryClient();
  const [selectedWhatsapp, setSelectedWhatsapp] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  // Fetch all templates
  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['all-message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []).map(t => ({
        ...t,
        components: (Array.isArray(t.components) ? t.components : []) as unknown as TemplateComponent[],
      })) as MessageTemplate[];
    },
  });

  // Fetch whatsapps with Cloud API
  const { data: whatsapps, isLoading: loadingWhatsapps } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['all-message-templates'] });
    },
    onError: (error) => {
      toast.error(`Erro ao sincronizar: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: React.ReactNode; variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      APPROVED: { icon: <CheckCircle className="h-3 w-3" />, variant: "default", label: "Aprovado" },
      PENDING: { icon: <Clock className="h-3 w-3" />, variant: "secondary", label: "Pendente" },
      REJECTED: { icon: <XCircle className="h-3 w-3" />, variant: "destructive", label: "Rejeitado" },
      DISABLED: { icon: <AlertCircle className="h-3 w-3" />, variant: "outline", label: "Desativado" },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: Record<string, { bg: string; label: string }> = {
      MARKETING: { bg: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: "Marketing" },
      UTILITY: { bg: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Utilidade" },
      AUTHENTICATION: { bg: "bg-green-500/10 text-green-500 border-green-500/20", label: "Autenticação" },
    };

    const config = categoryConfig[category] || { bg: "", label: category };
    return (
      <Badge variant="outline" className={config.bg}>
        {config.label}
      </Badge>
    );
  };

  const filteredTemplates = templates?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.components.find(c => c.type === 'BODY')?.text?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || template.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const templateStats = {
    total: templates?.length || 0,
    approved: templates?.filter(t => t.status === 'APPROVED').length || 0,
    pending: templates?.filter(t => t.status === 'PENDING').length || 0,
    rejected: templates?.filter(t => t.status === 'REJECTED').length || 0,
  };

  const renderTemplatePreview = (template: MessageTemplate) => {
    const header = template.components.find(c => c.type === 'HEADER');
    const body = template.components.find(c => c.type === 'BODY');
    const footer = template.components.find(c => c.type === 'FOOTER');
    const buttons = template.components.find(c => c.type === 'BUTTONS');

    return (
      <div className="bg-muted rounded-lg p-4 space-y-3">
        {header && (
          <div className="font-semibold text-sm border-b border-border pb-2">
            {header.format === 'TEXT' ? header.text : `[${header.format}]`}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{body?.text || 'Sem texto'}</div>
        {footer && (
          <div className="text-xs text-muted-foreground border-t border-border pt-2">{footer.text}</div>
        )}
        {buttons?.buttons && buttons.buttons.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gerenciamento de Templates</h1>
          <p className="text-muted-foreground">Gerencie seus templates de mensagem do WhatsApp</p>
        </div>

        <div className="flex items-center gap-2">
          <CreateTemplateDialog />
          
          <Select
            value={selectedWhatsapp || ""}
            onValueChange={(value) => {
              setSelectedWhatsapp(value);
              syncMutation.mutate(value);
            }}
            disabled={syncMutation.isPending || loadingWhatsapps}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Sincronizar de..." />
            </SelectTrigger>
            <SelectContent>
              {whatsapps?.map((wa) => (
                <SelectItem key={wa.id} value={wa.id}>
                  {wa.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {syncMutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Sincronizando...
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{templateStats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Aprovados
            </CardDescription>
            <CardTitle className="text-2xl text-green-500">{templateStats.approved}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              Pendentes
            </CardDescription>
            <CardTitle className="text-2xl text-yellow-500">{templateStats.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardDescription className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              Rejeitados
            </CardDescription>
            <CardTitle className="text-2xl text-red-500">{templateStats.rejected}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Category Types Selector */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Configurar seu modelo</CardTitle>
          <CardDescription>
            Escolha a categoria que melhor descreve seu modelo de mensagem. Em sequência, selecione o tipo de mensagem que deseja enviar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="MARKETING" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="MARKETING" className="flex items-center gap-2">
                <Megaphone className="h-4 w-4" />
                Marketing
              </TabsTrigger>
              <TabsTrigger value="UTILITY" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Utilidade
              </TabsTrigger>
              <TabsTrigger value="AUTHENTICATION" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                Autenticação
              </TabsTrigger>
            </TabsList>

            {Object.entries(TEMPLATE_TYPES).map(([category, types]) => (
              <TabsContent key={category} value={category} className="mt-0">
                <div className="grid grid-cols-1 gap-2">
                  {types.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div
                        key={type.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Category info sidebar content */}
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Este modelo é ideal para</p>
                  <p className="text-xs text-muted-foreground">
                    {CATEGORY_INFO[category as keyof typeof CATEGORY_INFO]?.description}
                  </p>
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Áreas do modelo que você pode personalizar</p>
                    <p className="text-xs text-muted-foreground">Mídia, cabeçalho, corpo, rodapé e botão</p>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou conteúdo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="APPROVED">Aprovados</SelectItem>
            <SelectItem value="PENDING">Pendentes</SelectItem>
            <SelectItem value="REJECTED">Rejeitados</SelectItem>
            <SelectItem value="DISABLED">Desativados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Categorias</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="UTILITY">Utilidade</SelectItem>
            <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates List */}
      {loadingTemplates ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates?.map((template) => (
              <Card key={template.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{template.name}</span>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {template.language} • ID: {template.template_id}
                      </CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => setPreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(template.category)}
                    {getStatusBadge(template.status)}
                    {template.quality_score && (
                      <Badge variant="outline" className="text-xs">
                        {template.quality_score}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.components.find(c => c.type === 'BODY')?.text || 'Sem texto'}
                  </p>
                  {template.rejected_reason && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      Motivo: {template.rejected_reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Última sync: {formatDate(template.last_synced_at)}
                  </p>
                </CardContent>
              </Card>
            ))}

            {(!filteredTemplates || filteredTemplates.length === 0) && (
              <div className="col-span-full text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-1">Nenhum template encontrado</h3>
                <p className="text-muted-foreground text-sm">
                  {templates?.length === 0 
                    ? "Sincronize os templates da sua conta Meta para começar." 
                    : "Tente ajustar os filtros de busca."}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {previewTemplate?.name}
            </DialogTitle>
            <DialogDescription>
              {previewTemplate?.language} • {previewTemplate?.category}
            </DialogDescription>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {getCategoryBadge(previewTemplate.category)}
                {getStatusBadge(previewTemplate.status)}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Pré-visualização:</p>
                {renderTemplatePreview(previewTemplate)}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Template ID</p>
                  <p className="font-mono text-xs">{previewTemplate.template_id}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Qualidade</p>
                  <p>{previewTemplate.quality_score || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p>{formatDate(previewTemplate.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última sincronização</p>
                  <p>{formatDate(previewTemplate.last_synced_at)}</p>
                </div>
              </div>

              {previewTemplate.rejected_reason && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm font-medium text-destructive">Motivo da rejeição:</p>
                  <p className="text-sm text-destructive/80">{previewTemplate.rejected_reason}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
