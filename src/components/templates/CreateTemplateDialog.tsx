import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Loader2,
  X,
  AlertCircle,
  Lightbulb,
  MessageSquare,
  Smartphone,
  CheckCircle2,
  Info,
  Megaphone,
  Wrench,
  ShieldCheck,
  ExternalLink,
  Type,
  Image,
  Video,
  FileText,
  Phone,
  Link2,
  Reply,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

const LANGUAGES = [
  { code: 'pt_BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'en_US', label: 'English (US)', flag: '🇺🇸' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'es_AR', label: 'Español (Argentina)', flag: '🇦🇷' },
  { code: 'es_MX', label: 'Español (México)', flag: '🇲🇽' },
];

const CATEGORIES = [
  {
    value: 'MARKETING',
    label: 'Marketing',
    icon: Megaphone,
    color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    description: 'Promoções, ofertas e atualizações de produto',
    tips: [
      'Ideal para campanhas promocionais e lançamentos',
      'Inclua uma chamada para ação clara (CTA)',
      'Use variáveis para personalização (nome do cliente)',
      'Limite-se a 1-2 ofertas por template',
    ],
    examples: [
      '🎉 Olá {{1}}! Temos uma oferta especial para você: {{2}}% de desconto em toda a loja!',
      '📦 Novidade! Chegou {{1}} que você estava esperando. Confira agora!',
    ],
    bestFor: 'Promoções, lançamentos, newsletters, eventos',
  },
  {
    value: 'UTILITY',
    label: 'Utilidade',
    icon: Wrench,
    color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    description: 'Confirmações, atualizações de conta e alertas',
    tips: [
      'Foque em informações transacionais importantes',
      'Seja objetivo e claro na mensagem',
      'Inclua dados relevantes como números de pedido',
      'Evite linguagem promocional',
    ],
    examples: [
      '✅ Pedido #{{1}} confirmado! Previsão de entrega: {{2}}. Acompanhe pelo link.',
      '🔔 Lembrete: Sua consulta está agendada para {{1}} às {{2}}.',
    ],
    bestFor: 'Confirmações, lembretes, atualizações de status, alertas',
  },
  {
    value: 'AUTHENTICATION',
    label: 'Autenticação',
    icon: ShieldCheck,
    color: 'text-green-500 bg-green-500/10 border-green-500/20',
    description: 'Códigos de verificação e login',
    tips: [
      'Mantenha a mensagem curta e direta',
      'O código deve ser claramente visível',
      'Inclua tempo de expiração quando aplicável',
      'Adicione aviso de segurança',
    ],
    examples: [
      '🔐 Seu código de verificação é: {{1}}. Válido por 10 minutos. Não compartilhe.',
      '🔑 Use o código {{1}} para acessar sua conta. Expira em 5 minutos.',
    ],
    bestFor: 'Login, verificação de conta, recuperação de senha, 2FA',
  },
];

// Template types/subtypes for each category (Meta official categories 2024-2025)
import { ShoppingBag, ListOrdered, Settings, Clock, LayoutTemplate, Bell, Star, AlertTriangle, KeyRound, RefreshCw } from "lucide-react";

const TEMPLATE_TYPES: Record<string, Array<{ id: string; name: string; description: string; icon: any }>> = {
  MARKETING: [
    {
      id: 'standard',
      name: 'Marketing Padrão',
      description: 'Promoções, cupons, alertas de novos produtos e reengajamento.',
      icon: LayoutTemplate
    },
    {
      id: 'abandoned_cart',
      name: 'Carrinho Abandonado',
      description: 'Lembretes para compras incompletas.',
      icon: ShoppingBag
    },
    {
      id: 'feedback',
      name: 'Feedback/Pesquisas',
      description: 'Avaliações de marca ou app (pesquisas gerais).',
      icon: Star
    },
  ],
  UTILITY: [
    {
      id: 'order_update',
      name: 'Atualização de Pedido',
      description: 'Confirmações de envio, status do pedido e recibos digitais.',
      icon: ShoppingBag
    },
    {
      id: 'appointment',
      name: 'Lembrete de Agendamento',
      description: 'Lembretes com data/hora/local específicos.',
      icon: Clock
    },
    {
      id: 'account_alert',
      name: 'Alerta de Conta',
      description: 'Atualizações de status, programas de fidelidade ou mudanças de política.',
      icon: Bell
    },
    {
      id: 'safety_security',
      name: 'Segurança/Alertas',
      description: 'Alertas de fraude, notificações de interrupção de serviço.',
      icon: AlertTriangle
    },
  ],
  AUTHENTICATION: [
    {
      id: 'otp',
      name: 'Senha Única (OTP)',
      description: 'Códigos de login e verificação em duas etapas (2FA).',
      icon: KeyRound
    },
    {
      id: 'password_reset',
      name: 'Redefinição de Senha',
      description: 'Links ou códigos para recuperação de segurança.',
      icon: RefreshCw
    },
  ],
};

const HEADER_FORMATS = [
  { value: 'TEXT', label: 'Texto', icon: Type, description: 'Título em texto simples' },
  { value: 'IMAGE', label: 'Imagem', icon: Image, description: 'Imagem de destaque' },
  { value: 'VIDEO', label: 'Vídeo', icon: Video, description: 'Vídeo de até 16MB' },
  { value: 'DOCUMENT', label: 'Documento', icon: FileText, description: 'PDF ou documento' },
];

export function CreateTemplateDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("config");

  // Form state
  const [whatsappId, setWhatsappId] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("pt_BR");
  const [category, setCategory] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("");

  // Components state
  const [hasHeader, setHasHeader] = useState(false);
  const [headerFormat, setHeaderFormat] = useState("TEXT");
  const [headerText, setHeaderText] = useState("");
  const [headerExample, setHeaderExample] = useState("");

  const [bodyText, setBodyText] = useState("");
  const [bodyExamples, setBodyExamples] = useState<string[]>([]);

  const [hasFooter, setHasFooter] = useState(false);
  const [footerText, setFooterText] = useState("");

  const [buttons, setButtons] = useState<TemplateButton[]>([]);

  // Fetch WhatsApp connections
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

  // Get selected category config
  const selectedCategory = useMemo(() =>
    CATEGORIES.find(c => c.value === category),
    [category]
  );

  // Calculate completion progress
  const completionProgress = useMemo(() => {
    let completed = 0;
    const total = 4; // whatsapp, name, category, body

    if (whatsappId) completed++;
    if (name && name.length >= 3) completed++;
    if (category) completed++;
    if (bodyText && bodyText.length >= 10) completed++;

    return Math.round((completed / total) * 100);
  }, [whatsappId, name, category, bodyText]);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const components: any[] = [];

      if (hasHeader) {
        const headerComponent: any = {
          type: 'HEADER',
          format: headerFormat,
        };

        if (headerFormat === 'TEXT' && headerText) {
          headerComponent.text = headerText;
          const headerVars = headerText.match(/\{\{\d+\}\}/g);
          if (headerVars && headerExample) {
            headerComponent.example = { header_text: [headerExample] };
          }
        }

        components.push(headerComponent);
      }

      const bodyComponent: any = { type: 'BODY', text: bodyText };
      const bodyVars = bodyText.match(/\{\{\d+\}\}/g);
      if (bodyVars && bodyExamples.length > 0 && bodyExamples.some(e => e)) {
        bodyComponent.example = { body_text: [bodyExamples] };
      }
      components.push(bodyComponent);

      if (hasFooter && footerText) {
        components.push({ type: 'FOOTER', text: footerText });
      }

      if (buttons.length > 0) {
        components.push({
          type: 'BUTTONS',
          buttons: buttons.map(btn => {
            const button: any = { type: btn.type, text: btn.text };
            if (btn.type === 'URL' && btn.url) button.url = btn.url;
            if (btn.type === 'PHONE_NUMBER' && btn.phone_number) button.phone_number = btn.phone_number;
            return button;
          }),
        });
      }

      const { data, error } = await supabase.functions.invoke('create-template', {
        body: { whatsappId, name, language, category, components },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Template "${name}" criado e enviado para aprovação!`);
      queryClient.invalidateQueries({ queryKey: ['all-message-templates'] });
      resetForm();
      setOpen(false);
    },
    onError: (error) => {
      toast.error(`Erro ao criar template: ${error.message}`);
    },
  });

  const resetForm = () => {
    setName("");
    setCategory("");
    setTemplateType("");
    setHasHeader(false);
    setHeaderFormat("TEXT");
    setHeaderText("");
    setHeaderExample("");
    setBodyText("");
    setBodyExamples([]);
    setHasFooter(false);
    setFooterText("");
    setButtons([]);
    setActiveTab("config");
  };

  const countVariables = (text: string): number => {
    const matches = text.match(/\{\{\d+\}\}/g);
    return matches ? matches.length : 0;
  };

  const handleBodyTextChange = (text: string) => {
    setBodyText(text);
    const varCount = countVariables(text);
    if (varCount !== bodyExamples.length) {
      setBodyExamples(new Array(varCount).fill(''));
    }
  };

  const addButton = () => {
    if (buttons.length >= 3) return;
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], ...updates };
    setButtons(newButtons);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const applyExample = (example: string) => {
    setBodyText(example);
    handleBodyTextChange(example);
  };

  const isValid = whatsappId && name && name.length >= 3 && category && bodyText.length >= 10;

  // Preview with examples filled in
  const previewBody = useMemo(() => {
    let text = bodyText;
    bodyExamples.forEach((example, index) => {
      if (example) {
        text = text.replace(`{{${index + 1}}}`, example);
      }
    });
    return text;
  }, [bodyText, bodyExamples]);

  const previewHeader = useMemo(() => {
    if (!hasHeader || headerFormat !== 'TEXT') return headerText;
    return headerExample ? headerText.replace('{{1}}', headerExample) : headerText;
  }, [hasHeader, headerFormat, headerText, headerExample]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Criar Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
        <ScrollArea className="max-h-[85vh]">
          <div className="flex min-h-[500px]">
            {/* Left Panel - Form */}
            <div className="flex-1 flex flex-col border-r border-border min-w-0">
              <DialogHeader className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Criar Template
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      Template HSM para WhatsApp
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{completionProgress}%</span>
                    <Progress value={completionProgress} className="w-16 h-1.5" />
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden min-h-0">
                <TabsList className="mx-4 mt-2 grid grid-cols-3 h-8">
                  <TabsTrigger value="config" className="gap-1.5 text-xs h-7">
                    <Info className="h-3 w-3" />
                    Config
                  </TabsTrigger>
                  <TabsTrigger value="content" className="gap-1.5 text-xs h-7">
                    <MessageSquare className="h-3 w-3" />
                    Conteúdo
                  </TabsTrigger>
                  <TabsTrigger value="buttons" className="gap-1.5 text-xs h-7">
                    <Reply className="h-3 w-3" />
                    Botões
                  </TabsTrigger>
                </TabsList>

                <ScrollArea className="flex-1 px-4 py-3">
                  <TabsContent value="config" className="mt-0 space-y-4">
                    {/* WhatsApp Connection */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Conexão WhatsApp
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
                      </Label>
                      <Select value={whatsappId} onValueChange={setWhatsappId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a conexão..." />
                        </SelectTrigger>
                        <SelectContent>
                          {whatsapps?.map((wa) => (
                            <SelectItem key={wa.id} value={wa.id}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500" />
                                {wa.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!whatsapps?.length && (
                        <p className="text-xs text-destructive">
                          Nenhuma conexão Cloud API encontrada. Configure uma conexão primeiro.
                        </p>
                      )}
                    </div>

                    {/* Template Name */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Nome do Template
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
                      </Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                        placeholder="ex: confirmacao_pedido"
                        maxLength={512}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Apenas letras minúsculas, números e underscores</span>
                        <span>{name.length}/512</span>
                      </div>
                    </div>

                    {/* Language */}
                    <div className="space-y-2">
                      <Label>Idioma</Label>
                      <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              <span className="flex items-center gap-2">
                                <span>{lang.flag}</span>
                                <span>{lang.label}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Category */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2">
                        Categoria
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setCategory(cat.value);
                                setTemplateType(""); // Reset type when category changes
                              }}
                              className={`p-2.5 rounded-lg border-2 transition-all text-left ${isSelected
                                  ? `${cat.color} border-current`
                                  : 'border-border hover:border-muted-foreground/50'
                                }`}
                            >
                              <Icon className={`h-4 w-4 mb-1 ${isSelected ? '' : 'text-muted-foreground'}`} />
                              <p className="font-medium text-xs">{cat.label}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                                {cat.description}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Template Type - Shows subtypes based on selected category */}
                    {category && TEMPLATE_TYPES[category] && (
                      <div className="space-y-3">
                        <Label className="flex items-center gap-2">
                          Tipo de Template
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Recomendado</Badge>
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          {TEMPLATE_TYPES[category].map((type) => {
                            const Icon = type.icon;
                            const isSelected = templateType === type.id;
                            return (
                              <button
                                key={type.id}
                                type="button"
                                onClick={() => setTemplateType(type.id)}
                                className={`p-3 rounded-lg border-2 transition-all text-left ${isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                  }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`p-1.5 rounded-md ${isSelected ? 'bg-primary/10' : 'bg-muted'}`}>
                                    <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-xs">{type.name}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                      {type.description}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Category Tips */}
                    {selectedCategory && (
                      <Card className={`border ${selectedCategory.color}`}>
                        <CardHeader className="py-2 px-3">
                          <CardTitle className="text-xs flex items-center gap-1.5">
                            <Lightbulb className="h-3 w-3" />
                            Dicas: {selectedCategory.label}
                          </CardTitle>
                          <CardDescription className="text-[10px]">
                            {selectedCategory.bestFor}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="py-2 px-3 space-y-2">
                          <ul className="space-y-0.5">
                            {selectedCategory.tips.slice(0, 2).map((tip, i) => (
                              <li key={i} className="text-[10px] flex items-start gap-1.5">
                                <CheckCircle2 className="h-2.5 w-2.5 mt-0.5 text-green-500 flex-shrink-0" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                          <div className="flex gap-1 flex-wrap">
                            {selectedCategory.examples.map((example, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => applyExample(example)}
                                className="text-[10px] px-2 py-1 rounded bg-background/50 hover:bg-background border border-transparent hover:border-border transition-colors text-primary"
                              >
                                Usar exemplo {i + 1}
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="content" className="mt-0 space-y-3">
                    {/* Header */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm">Cabeçalho</CardTitle>
                            <CardDescription className="text-xs">
                              Opcional. Adicione destaque à sua mensagem.
                            </CardDescription>
                          </div>
                          <Switch checked={hasHeader} onCheckedChange={setHasHeader} />
                        </div>
                      </CardHeader>
                      {hasHeader && (
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-4 gap-2">
                            {HEADER_FORMATS.map((format) => {
                              const Icon = format.icon;
                              const isSelected = headerFormat === format.value;
                              return (
                                <Tooltip key={format.value}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => setHeaderFormat(format.value)}
                                      className={`p-3 rounded-lg border text-center transition-all ${isSelected
                                          ? 'border-primary bg-primary/5'
                                          : 'border-border hover:border-muted-foreground/50'
                                        }`}
                                    >
                                      <Icon className={`h-4 w-4 mx-auto mb-1 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                      <span className="text-xs">{format.label}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>{format.description}</TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>

                          {headerFormat === 'TEXT' && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs">Texto do Cabeçalho</Label>
                                <Input
                                  value={headerText}
                                  onChange={(e) => setHeaderText(e.target.value)}
                                  placeholder="Ex: Olá {{1}}!"
                                  maxLength={60}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Use {"{{1}}"} para variáveis</span>
                                  <span>{headerText.length}/60</span>
                                </div>
                              </div>
                              {countVariables(headerText) > 0 && (
                                <div className="space-y-2">
                                  <Label className="text-xs">Exemplo da variável</Label>
                                  <Input
                                    value={headerExample}
                                    onChange={(e) => setHeaderExample(e.target.value)}
                                    placeholder="Ex: João"
                                    className="bg-muted/50"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {headerFormat !== 'TEXT' && (
                            <Alert>
                              <Info className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                {headerFormat === 'IMAGE' && 'Você poderá enviar a imagem ao usar o template.'}
                                {headerFormat === 'VIDEO' && 'Vídeos de até 16MB são suportados.'}
                                {headerFormat === 'DOCUMENT' && 'PDFs e documentos são suportados.'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      )}
                    </Card>

                    {/* Body */}
                    <Card className="border-primary/50">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          Corpo da Mensagem
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Obrigatório</Badge>
                        </CardTitle>
                        <CardDescription className="text-xs">
                          O conteúdo principal da sua mensagem.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Textarea
                            value={bodyText}
                            onChange={(e) => handleBodyTextChange(e.target.value)}
                            placeholder="Digite sua mensagem aqui... Use {{1}}, {{2}} para variáveis."
                            rows={3}
                            maxLength={1024}
                            className="resize-none text-sm"
                          />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>
                              {countVariables(bodyText) > 0 && (
                                <span className="text-primary">{countVariables(bodyText)} variável(eis) detectada(s)</span>
                              )}
                            </span>
                            <span className={bodyText.length > 900 ? 'text-amber-500' : ''}>{bodyText.length}/1024</span>
                          </div>
                        </div>

                        {bodyExamples.length > 0 && (
                          <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                            <Label className="text-xs flex items-center gap-2">
                              <Info className="h-3 w-3" />
                              Exemplos para as variáveis (obrigatório para aprovação)
                            </Label>
                            <div className="grid gap-2">
                              {bodyExamples.map((example, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <Badge variant="outline" className="shrink-0">{`{{${index + 1}}}`}</Badge>
                                  <Input
                                    value={example}
                                    onChange={(e) => {
                                      const newExamples = [...bodyExamples];
                                      newExamples[index] = e.target.value;
                                      setBodyExamples(newExamples);
                                    }}
                                    placeholder={`Exemplo para {{${index + 1}}}`}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Footer */}
                    <Card>
                      <CardHeader className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm">Rodapé</CardTitle>
                            <CardDescription className="text-xs">
                              Opcional. Texto pequeno no final da mensagem.
                            </CardDescription>
                          </div>
                          <Switch checked={hasFooter} onCheckedChange={setHasFooter} />
                        </div>
                      </CardHeader>
                      {hasFooter && (
                        <CardContent>
                          <Input
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="Ex: Responda SAIR para cancelar"
                            maxLength={60}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Não permite variáveis</span>
                            <span>{footerText.length}/60</span>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </TabsContent>

                  <TabsContent value="buttons" className="mt-0 space-y-3">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle className="text-sm">Botões Interativos</AlertTitle>
                      <AlertDescription className="text-xs">
                        Adicione até 3 botões para facilitar a interação. Botões aumentam
                        significativamente as taxas de resposta.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Botões ({buttons.length}/3)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addButton}
                          disabled={buttons.length >= 3}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar Botão
                        </Button>
                      </div>

                      {buttons.length === 0 && (
                        <div className="p-8 rounded-lg border-2 border-dashed text-center">
                          <Reply className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            Nenhum botão adicionado
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Botões são opcionais mas recomendados
                          </p>
                        </div>
                      )}

                      {buttons.map((button, index) => (
                        <Card key={index}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline">Botão {index + 1}</Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => removeButton(index)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => updateButton(index, { type: 'QUICK_REPLY' })}
                                className={`p-2 rounded border text-center text-xs transition-all ${button.type === 'QUICK_REPLY'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                  }`}
                              >
                                <Reply className="h-4 w-4 mx-auto mb-1" />
                                Resposta Rápida
                              </button>
                              <button
                                type="button"
                                onClick={() => updateButton(index, { type: 'URL' })}
                                className={`p-2 rounded border text-center text-xs transition-all ${button.type === 'URL'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                  }`}
                              >
                                <Link2 className="h-4 w-4 mx-auto mb-1" />
                                Link
                              </button>
                              <button
                                type="button"
                                onClick={() => updateButton(index, { type: 'PHONE_NUMBER' })}
                                className={`p-2 rounded border text-center text-xs transition-all ${button.type === 'PHONE_NUMBER'
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-muted-foreground/50'
                                  }`}
                              >
                                <Phone className="h-4 w-4 mx-auto mb-1" />
                                Telefone
                              </button>
                            </div>

                            <Input
                              value={button.text}
                              onChange={(e) => updateButton(index, { text: e.target.value })}
                              placeholder="Texto do botão"
                              maxLength={25}
                            />

                            {button.type === 'URL' && (
                              <Input
                                value={button.url || ''}
                                onChange={(e) => updateButton(index, { url: e.target.value })}
                                placeholder="https://exemplo.com"
                                type="url"
                              />
                            )}

                            {button.type === 'PHONE_NUMBER' && (
                              <Input
                                value={button.phone_number || ''}
                                onChange={(e) => updateButton(index, { phone_number: e.target.value })}
                                placeholder="+5511999999999"
                                type="tel"
                              />
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </ScrollArea>

                {/* Footer Actions */}
                <div className="p-3 border-t border-border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancelar
                    </Button>
                    <div className="flex items-center gap-2">
                      <a
                        href="https://developers.facebook.com/docs/whatsapp/message-templates/guidelines"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Diretrizes Meta
                      </a>
                      <Button
                        onClick={() => createMutation.mutate()}
                        disabled={!isValid || createMutation.isPending}
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Criar e Enviar para Aprovação
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Tabs>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-[280px] bg-gradient-to-b from-muted/50 to-muted flex flex-col">
              <div className="p-2 border-b border-border">
                <h3 className="font-medium flex items-center gap-1.5 text-xs">
                  <Smartphone className="h-3 w-3" />
                  Preview
                </h3>
              </div>

              <div className="flex-1 p-2 flex items-start justify-center overflow-auto">
                {/* Phone Frame */}
                <div className="w-full max-w-[240px]">
                  <div className="bg-[#0b141a] rounded-2xl p-1.5 shadow-xl">
                    {/* Phone Screen */}
                    <div className="bg-[#0b141a] rounded-xl overflow-hidden">
                      {/* Chat Header */}
                      <div className="h-10 bg-[#1f2c34] flex items-center gap-2 px-3">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                          <MessageSquare className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <p className="text-white text-xs font-medium">Empresa</p>
                          <p className="text-gray-400 text-[9px]">online</p>
                        </div>
                      </div>

                      {/* Chat Background */}
                      <div
                        className="min-h-[280px] max-h-[320px] p-2 overflow-y-auto"
                        style={{
                          backgroundColor: '#0b141a',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23172129' fill-opacity='0.4'%3E%3Cpath d='M20 20v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}
                      >
                        {/* Message Bubble */}
                        {(bodyText || hasHeader) ? (
                          <div className="bg-[#005c4b] rounded-lg rounded-tl-none p-2 max-w-[95%] shadow-md">
                            {/* Header */}
                            {hasHeader && headerFormat === 'TEXT' && previewHeader && (
                              <p className="text-white font-semibold text-[11px] mb-1.5 pb-1.5 border-b border-white/10">
                                {previewHeader}
                              </p>
                            )}
                            {hasHeader && headerFormat === 'IMAGE' && (
                              <div className="bg-[#1f2c34] rounded h-20 flex items-center justify-center mb-1.5">
                                <Image className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            {hasHeader && headerFormat === 'VIDEO' && (
                              <div className="bg-[#1f2c34] rounded h-20 flex items-center justify-center mb-1.5">
                                <Video className="h-5 w-5 text-gray-500" />
                              </div>
                            )}
                            {hasHeader && headerFormat === 'DOCUMENT' && (
                              <div className="bg-[#1f2c34] rounded p-2 flex items-center gap-1.5 mb-1.5">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-[9px] text-gray-400">Doc</span>
                              </div>
                            )}

                            {/* Body */}
                            <p className="text-white text-[11px] whitespace-pre-wrap leading-relaxed">
                              {previewBody || (
                                <span className="text-gray-400 italic text-[10px]">
                                  Digite a mensagem...
                                </span>
                              )}
                            </p>

                            {/* Footer */}
                            {hasFooter && footerText && (
                              <p className="text-gray-400 text-[9px] mt-1.5 pt-1.5 border-t border-white/10">
                                {footerText}
                              </p>
                            )}

                            {/* Timestamp */}
                            <div className="flex items-center justify-end gap-0.5 mt-1">
                              <span className="text-[8px] text-gray-400">12:00</span>
                              <CheckCircle2 className="h-2 w-2 text-blue-400" />
                            </div>

                            {/* Buttons */}
                            {buttons.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-white/10 space-y-0.5">
                                {buttons.map((btn, i) => (
                                  <button
                                    key={i}
                                    className="w-full py-1 text-[#00a884] text-[10px] font-medium flex items-center justify-center gap-1 hover:bg-white/5 rounded transition-colors"
                                  >
                                    {btn.type === 'URL' && <ExternalLink className="h-2.5 w-2.5" />}
                                    {btn.type === 'PHONE_NUMBER' && <Phone className="h-2.5 w-2.5" />}
                                    {btn.type === 'QUICK_REPLY' && <Reply className="h-2.5 w-2.5" />}
                                    {btn.text || `Botão ${i + 1}`}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full min-h-[200px]">
                            <div className="text-center text-gray-500">
                              <MessageSquare className="h-8 w-8 mx-auto mb-1 opacity-50" />
                              <p className="text-[10px]">Digite para ver</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
