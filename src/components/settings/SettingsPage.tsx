import { useState, useEffect } from 'react';
import {
  Settings,
  Clock,
  MessageSquare,
  Phone,
  Users,
  Bell,
  Shield,
  RefreshCw,
  Save,
  Plug,
  Webhook,
  CreditCard,
  Eye,
  EyeOff,
  Code2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/hooks/useSettings';
import { useCompanySchedules } from '@/hooks/useCompanySchedules';
import { useToast } from '@/hooks/use-toast';
import { WebhooksPage } from '@/components/webhooks/WebhooksPage';
import { ExternalApiPage } from '@/components/api/ExternalApiPage';

interface SettingItemProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  loading?: boolean;
}

function SettingItem({ label, description, value, onChange, loading }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between py-4">
      <div className="space-y-0.5">
        <Label className="text-base">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} disabled={loading} />
    </div>
  );
}

export function SettingsPage() {
  const { settings, loading, getSetting, updateSetting } = useSettings();
  const { schedules, loading: schedulesLoading, updateSchedules, setSchedules } = useCompanySchedules();
  const { toast } = useToast();
  
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [integrationSettings, setIntegrationSettings] = useState({
    asaasToken: '',
    webhookUrl: '',
    n8nUrl: '',
  });
  
  const [localSettings, setLocalSettings] = useState({
    userRating: 'disabled',
    scheduleType: 'disabled',
    call: 'enabled',
    CheckMsgIsGroup: 'enabled',
    chatBotType: 'text',
    sendGreetingAccepted: 'disabled',
    sendMsgTransfTicket: 'disabled',
    sendGreetingMessageOneQueues: 'disabled',
  });

  useEffect(() => {
    if (settings.length > 0) {
      setLocalSettings({
        userRating: getSetting('userRating') || 'disabled',
        scheduleType: getSetting('scheduleType') || 'disabled',
        call: getSetting('call') || 'enabled',
        CheckMsgIsGroup: getSetting('CheckMsgIsGroup') || 'enabled',
        chatBotType: getSetting('chatBotType') || 'text',
        sendGreetingAccepted: getSetting('sendGreetingAccepted') || 'disabled',
        sendMsgTransfTicket: getSetting('sendMsgTransfTicket') || 'disabled',
        sendGreetingMessageOneQueues: getSetting('sendGreetingMessageOneQueues') || 'disabled',
      });
      
      setIntegrationSettings({
        asaasToken: getSetting('asaas') || '',
        webhookUrl: getSetting('webhookUrl') || '',
        n8nUrl: getSetting('n8nUrl') || '',
      });
    }
  }, [settings, getSetting]);

  const handleSettingChange = async (key: string, value: string) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    await updateSetting(key, value);
  };

  const handleScheduleChange = (index: number, field: string, value: string | boolean) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const handleSaveSchedules = async () => {
    await updateSchedules(schedules);
  };

  const handleIntegrationChange = (key: string, value: string) => {
    setIntegrationSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveIntegration = async (key: string, settingKey: string) => {
    const value = integrationSettings[key as keyof typeof integrationSettings];
    await updateSetting(settingKey, value);
  };

  const toggleShowApiKey = (key: string) => {
    setShowApiKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="general" className="flex-1">
        <TabsList className="grid w-full grid-cols-6 lg:w-[700px]">
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="schedules">Horários</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="mt-6 space-y-6">
          {/* Atendimento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Atendimento
              </CardTitle>
              <CardDescription>
                Configure o comportamento dos atendimentos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Avaliação de Atendimento</Label>
                  <Select
                    value={localSettings.userRating}
                    onValueChange={(value) => handleSettingChange('userRating', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disabled">Desabilitado</SelectItem>
                      <SelectItem value="enabled">Habilitado</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Solicitar avaliação ao finalizar atendimento
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Chatbot</Label>
                  <Select
                    value={localSettings.chatBotType}
                    onValueChange={(value) => handleSettingChange('chatBotType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Texto</SelectItem>
                      <SelectItem value="button">Botões</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Formato das opções do chatbot
                  </p>
                </div>
              </div>

              <Separator />

              <SettingItem
                label="Aceitar Chamadas"
                description="Permitir receber chamadas de voz/vídeo"
                value={localSettings.call === 'enabled'}
                onChange={(checked) => handleSettingChange('call', checked ? 'enabled' : 'disabled')}
              />

              <SettingItem
                label="Ignorar Mensagens de Grupos"
                description="Não criar tickets para mensagens de grupos"
                value={localSettings.CheckMsgIsGroup === 'enabled'}
                onChange={(checked) => handleSettingChange('CheckMsgIsGroup', checked ? 'enabled' : 'disabled')}
              />
            </CardContent>
          </Card>

          {/* Saudações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Saudações e Mensagens
              </CardTitle>
              <CardDescription>
                Configure mensagens automáticas do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingItem
                label="Enviar Saudação ao Aceitar Ticket"
                description="Enviar mensagem de boas-vindas quando o atendente aceitar o ticket"
                value={localSettings.sendGreetingAccepted === 'enabled'}
                onChange={(checked) => handleSettingChange('sendGreetingAccepted', checked ? 'enabled' : 'disabled')}
              />

              <Separator />

              <SettingItem
                label="Enviar Mensagem de Transferência"
                description="Notificar o cliente quando o ticket for transferido"
                value={localSettings.sendMsgTransfTicket === 'enabled'}
                onChange={(checked) => handleSettingChange('sendMsgTransfTicket', checked ? 'enabled' : 'disabled')}
              />

              <Separator />

              <SettingItem
                label="Enviar Saudação com Fila Única"
                description="Enviar mensagem de saudação quando houver apenas uma fila"
                value={localSettings.sendGreetingMessageOneQueues === 'enabled'}
                onChange={(checked) => handleSettingChange('sendGreetingMessageOneQueues', checked ? 'enabled' : 'disabled')}
              />
            </CardContent>
          </Card>

          {/* Expediente */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Gerenciamento de Expediente
              </CardTitle>
              <CardDescription>
                Configure como o sistema gerencia o horário de funcionamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Tipo de Expediente</Label>
                <Select
                  value={localSettings.scheduleType}
                  onValueChange={(value) => handleSettingChange('scheduleType', value)}
                >
                  <SelectTrigger className="w-full md:w-[300px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disabled">Desabilitado</SelectItem>
                    <SelectItem value="queue">Por Fila</SelectItem>
                    <SelectItem value="company">Por Empresa</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Define se o controle de expediente será por fila ou para toda a empresa
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Horários de Funcionamento
              </CardTitle>
              <CardDescription>
                Configure os horários de atendimento da empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schedules.map((schedule, index) => (
                  <div
                    key={schedule.weekdayEn}
                    className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="w-32">
                      <Label className="font-medium">{schedule.weekday}</Label>
                    </div>
                    
                    <Switch
                      checked={schedule.enabled}
                      onCheckedChange={(checked) =>
                        handleScheduleChange(index, 'enabled', checked)
                      }
                    />
                    
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) =>
                          handleScheduleChange(index, 'startTime', e.target.value)
                        }
                        disabled={!schedule.enabled}
                        className="w-32"
                      />
                      <span className="text-muted-foreground">até</span>
                      <Input
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) =>
                          handleScheduleChange(index, 'endTime', e.target.value)
                        }
                        disabled={!schedule.enabled}
                        className="w-32"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSchedules} disabled={schedulesLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Horários
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          {/* Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Gateway de Pagamento
              </CardTitle>
              <CardDescription>
                Configure integrações com sistemas de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Token ASAAS</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKeys.asaas ? 'text' : 'password'}
                      placeholder="Insira seu token ASAAS"
                      value={integrationSettings.asaasToken}
                      onChange={(e) => handleIntegrationChange('asaasToken', e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => toggleShowApiKey('asaas')}
                    >
                      {showApiKeys.asaas ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button onClick={() => handleSaveIntegration('asaasToken', 'asaas')}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Token de API para integração com gateway de pagamento ASAAS
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Webhooks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Configure URLs para receber notificações externas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>URL do Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://seu-webhook.com/endpoint"
                    value={integrationSettings.webhookUrl}
                    onChange={(e) => handleIntegrationChange('webhookUrl', e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => handleSaveIntegration('webhookUrl', 'webhookUrl')}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL para enviar notificações de eventos do sistema
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>URL n8n</Label>
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://seu-n8n.com/webhook/..."
                    value={integrationSettings.n8nUrl}
                    onChange={(e) => handleIntegrationChange('n8nUrl', e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => handleSaveIntegration('n8nUrl', 'n8nUrl')}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL do webhook n8n para automações
                </p>
              </div>
            </CardContent>
          </Card>


          {/* Status das Integrações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Status das Integrações
              </CardTitle>
              <CardDescription>
                Visão geral das integrações configuradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <span>ASAAS</span>
                  </div>
                  <Badge variant={integrationSettings.asaasToken ? 'default' : 'secondary'}>
                    {integrationSettings.asaasToken ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Webhook className="h-5 w-5 text-muted-foreground" />
                    <span>Webhook</span>
                  </div>
                  <Badge variant={integrationSettings.webhookUrl ? 'default' : 'secondary'}>
                    {integrationSettings.webhookUrl ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Plug className="h-5 w-5 text-muted-foreground" />
                    <span>n8n</span>
                  </div>
                  <Badge variant={integrationSettings.n8nUrl ? 'default' : 'secondary'}>
                    {integrationSettings.n8nUrl ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure as notificações do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingItem
                label="Notificações de Desktop"
                description="Receber notificações no navegador quando novos tickets chegarem"
                value={true}
                onChange={() => {}}
              />
              
              <Separator />
              
              <SettingItem
                label="Som de Notificação"
                description="Tocar som quando receber novas mensagens"
                value={true}
                onChange={() => {}}
              />
              
              <Separator />
              
              <SettingItem
                label="Notificações de Ticket Pendente"
                description="Alertar sobre tickets que estão pendentes há muito tempo"
                value={false}
                onChange={() => {}}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="mt-6">
          <WebhooksPage />
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <ExternalApiPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
