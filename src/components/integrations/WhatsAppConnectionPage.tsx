import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, Plus, Trash2, Wifi, WifiOff, Info, MessageSquare, Key, LinkIcon, Cloud, Zap, Settings, CheckCircle, Copy, ChevronDown, Webhook, Bot } from "lucide-react";
import { toast } from "sonner";
import { MetaEmbeddedSignup } from "./MetaEmbeddedSignup";
import { useQueues } from "@/hooks/useQueues";

interface WhatsAppConnection {
  id: string;
  name: string;
  status: string;
  instance_id: string | null;
  phone_number_id: string | null;
  waba_id: string | null;
  quality_rating: string | null;
  is_default: boolean | null;
  qr_code: string | null;
  provider: string | null;
  created_at: string | null;
  updated_at: string | null;
  default_queue_id: string | null;
  queues?: { queue_id: string; is_default: boolean }[];
}

// Global fixed webhook verify token for Meta (same for all connections)
const META_WEBHOOK_VERIFY_TOKEN = import.meta.env.VITE_META_WEBHOOK_VERIFY_TOKEN || 'hubfit_webhook_2024';

export default function WhatsAppConnectionPage() {
  const { profile } = useAuth();
  const { queues } = useQueues();
  const [loading, setLoading] = useState(true);
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [metaSignupOpen, setMetaSignupOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<WhatsAppConnection | null>(null);
  const [newConnectionName, setNewConnectionName] = useState("");
  const [channelToken, setChannelToken] = useState("");
  const [creating, setCreating] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connectionType, setConnectionType] = useState<"uazapi" | "cloud_api" | "manual">("cloud_api");
  // UazAPI fields
  const [uazapiInstanceName, setUazapiInstanceName] = useState("");
  const [uazapiQrCode, setUazapiQrCode] = useState<string | null>(null);
  const [uazapiConnecting, setUazapiConnecting] = useState<string | null>(null);
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [defaultQueueId, setDefaultQueueId] = useState<string | null>(null);
  const [updatingQueue, setUpdatingQueue] = useState(false);

  // Manual Cloud API credentials
  const [manualPhoneNumber, setManualPhoneNumber] = useState("");
  const [manualPhoneNumberId, setManualPhoneNumberId] = useState("");
  const [manualWabaId, setManualWabaId] = useState("");
  const [manualAccessToken, setManualAccessToken] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  const [connectionQueuesMap, setConnectionQueuesMap] = useState<Record<string, { queue_id: string; is_default: boolean }[]>>({});

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/meta-webhook`;
  const uazapiWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  useEffect(() => {
    if (profile?.company_id) {
      loadConnections();
      subscribeToChanges();
    }
  }, [profile?.company_id]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapps")
        .select("id, name, status, instance_id, phone_number_id, waba_id, quality_rating, is_default, qr_code, provider, created_at, updated_at, default_queue_id")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setConnections(data || []);

      // Load queue assignments for all connections
      if (data && data.length > 0) {
        const { data: queueAssignments } = await supabase
          .from('whatsapp_queues')
          .select('whatsapp_id, queue_id, is_default')
          .in('whatsapp_id', data.map(c => c.id));

        if (queueAssignments) {
          const queuesMap: Record<string, { queue_id: string; is_default: boolean }[]> = {};
          queueAssignments.forEach(qa => {
            if (!queuesMap[qa.whatsapp_id]) {
              queuesMap[qa.whatsapp_id] = [];
            }
            queuesMap[qa.whatsapp_id].push({ queue_id: qa.queue_id, is_default: qa.is_default || false });
          });
          setConnectionQueuesMap(queuesMap);
        }
      }
    } catch (error) {
      console.error("Error loading connections:", error);
      toast.error("Erro ao carregar conexões");
    } finally {
      setLoading(false);
    }
  };

  const subscribeToChanges = () => {
    const channel = supabase
      .channel("whatsapp-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapps",
          filter: `company_id=eq.${profile!.company_id}`,
        },
        (payload) => {
          console.log("WhatsApp change:", payload);
          loadConnections();

          if (payload.eventType === "UPDATE" && (payload.new as any).status === "CONNECTED") {
            toast.success("WhatsApp conectado com sucesso!");
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createConnection = async () => {
    if (connectionType === "cloud_api") {
      // Open Meta Embedded Signup
      setCreateDialogOpen(false);
      setMetaSignupOpen(true);
      return;
    }

    if (connectionType === "manual") {
      // Create manual Cloud API connection
      if (!manualPhoneNumber.trim() || !manualPhoneNumberId.trim() || !manualWabaId.trim() || !manualAccessToken.trim()) {
        toast.error("Preencha todos os campos obrigatórios");
        return;
      }

      try {
        setCreating(true);

        const { error } = await supabase
          .from("whatsapps")
          .insert({
            company_id: profile!.company_id,
            name: newConnectionName.trim() || `WhatsApp ${manualPhoneNumber}`,
            status: "CONNECTED",
            provider: "cloud_api",
            phone_number_id: manualPhoneNumberId.trim(),
            waba_id: manualWabaId.trim(),
            access_token: manualAccessToken.trim(),
            is_default: connections.length === 0,
          });

        if (error) throw error;

        toast.success("Conexão criada com sucesso!");
        setCreateDialogOpen(false);
        resetManualForm();
        loadConnections();
      } catch (error) {
        console.error("Error creating manual connection:", error);
        toast.error("Erro ao criar conexão");
      } finally {
        setCreating(false);
      }
      return;
    }

    // UazAPI connection — auto-create via API
    if (connectionType === "uazapi") {
      if (!uazapiInstanceName.trim()) {
        toast.error("Digite o nome da instância");
        return;
      }

      try {
        setCreating(true);

        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-create-instance`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              instanceName: uazapiInstanceName.trim(),
              action: 'create'
            })
          }
        );

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao criar instância');

        toast.success("Instância UazAPI criada com sucesso!");
        setCreateDialogOpen(false);
        setNewConnectionName("");
        setUazapiInstanceName("");
        loadConnections();
      } catch (error: any) {
        console.error("Error creating UazAPI instance:", error);
        toast.error(error.message || "Erro ao criar instância UazAPI");
      } finally {
        setCreating(false);
      }
      return;
    }

    // Legacy NotificaMe (fallback — should not be reachable)
    if (!newConnectionName.trim()) {
      toast.error("Digite um nome para a conexão");
      return;
    }
  };

  const resetManualForm = () => {
    setNewConnectionName("");
    setManualPhoneNumber("");
    setManualPhoneNumberId("");
    setManualWabaId("");
    setManualAccessToken("");
  };

  const testManualConnection = async () => {
    if (!manualPhoneNumberId.trim() || !manualAccessToken.trim()) {
      toast.error("Preencha o ID do Número e a Chave API para testar");
      return;
    }

    try {
      setTestingConnection(true);

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${manualPhoneNumberId.trim()}?fields=verified_name,quality_rating,display_phone_number`,
        {
          headers: {
            'Authorization': `Bearer ${manualAccessToken.trim()}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(`Conexão válida! Número: ${data.display_phone_number} - ${data.verified_name}`);
        if (data.display_phone_number && !manualPhoneNumber) {
          setManualPhoneNumber(data.display_phone_number);
        }
        if (!newConnectionName && data.verified_name) {
          setNewConnectionName(data.verified_name);
        }
      } else {
        toast.error(`Erro: ${data.error?.message || 'Token inválido ou expirado'}`);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Erro ao testar conexão");
    } finally {
      setTestingConnection(false);
    }
  };

  const openConnectDialog = (connection: WhatsAppConnection) => {
    setSelectedConnection(connection);
    setChannelToken(connection.instance_id || "");
    setConnectDialogOpen(true);
  };

  const connectChannel = async () => {
    if (!selectedConnection) return;

    if (!channelToken.trim()) {
      toast.error("Digite o Token do Canal");
      return;
    }

    try {
      setConnecting(selectedConnection.id);

      const { data, error } = await supabase.functions.invoke("notificame-hub", {
        body: {
          action: "connect_channel",
          connectionId: selectedConnection.id,
          channelToken: channelToken.trim(),
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Canal vinculado com sucesso!");
        setConnectDialogOpen(false);
        setChannelToken("");
        loadConnections();
      } else {
        toast.error(data?.error || "Erro ao vincular canal");
      }
    } catch (error) {
      console.error("Error connecting channel:", error);
      toast.error("Erro ao vincular canal");
    } finally {
      setConnecting(null);
    }
  };

  const disconnectConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase.functions.invoke("notificame-hub", {
        body: {
          action: "disconnect_channel",
          connectionId,
        },
      });

      if (error) throw error;

      await supabase
        .from("whatsapps")
        .update({ status: "DISCONNECTED", qr_code: null })
        .eq("id", connectionId);

      toast.success("WhatsApp desconectado");
      loadConnections();
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Erro ao desconectar");
    }
  };

  const deleteConnection = async (connectionId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conexão?")) return;

    try {
      await disconnectConnection(connectionId);

      const { error } = await supabase
        .from("whatsapps")
        .delete()
        .eq("id", connectionId);

      if (error) throw error;

      toast.success("Conexão excluída");
      loadConnections();
    } catch (error) {
      console.error("Error deleting connection:", error);
      toast.error("Erro ao excluir conexão");
    }
  };

  const setAsDefault = async (connectionId: string) => {
    try {
      await supabase
        .from("whatsapps")
        .update({ is_default: false })
        .eq("company_id", profile!.company_id);

      await supabase
        .from("whatsapps")
        .update({ is_default: true })
        .eq("id", connectionId);

      toast.success("Conexão padrão definida");
      loadConnections();
    } catch (error) {
      console.error("Error setting default:", error);
      toast.error("Erro ao definir padrão");
    }
  };

  const openQueueDialog = async (connection: WhatsAppConnection) => {
    setSelectedConnection(connection);

    // Load current queue assignments
    const { data: queueAssignments } = await supabase
      .from('whatsapp_queues')
      .select('queue_id, is_default')
      .eq('whatsapp_id', connection.id);

    if (queueAssignments && queueAssignments.length > 0) {
      setSelectedQueueIds(queueAssignments.map(q => q.queue_id));
      const defaultQueue = queueAssignments.find(q => q.is_default);
      setDefaultQueueId(defaultQueue?.queue_id || queueAssignments[0]?.queue_id || null);
    } else {
      setSelectedQueueIds([]);
      setDefaultQueueId(null);
    }

    setQueueDialogOpen(true);
  };

  const updateConnectionQueues = async () => {
    if (!selectedConnection) return;

    try {
      setUpdatingQueue(true);

      // Delete existing queue assignments
      await supabase
        .from('whatsapp_queues')
        .delete()
        .eq('whatsapp_id', selectedConnection.id);

      // Insert new queue assignments
      if (selectedQueueIds.length > 0) {
        const assignments = selectedQueueIds.map(queueId => ({
          whatsapp_id: selectedConnection.id,
          queue_id: queueId,
          is_default: queueId === defaultQueueId,
        }));

        const { error } = await supabase
          .from('whatsapp_queues')
          .insert(assignments);

        if (error) throw error;

        // Also update the default_queue_id on whatsapps table for backward compatibility
        await supabase
          .from('whatsapps')
          .update({ default_queue_id: defaultQueueId || selectedQueueIds[0] })
          .eq('id', selectedConnection.id);
      } else {
        // Clear default_queue_id if no queues selected
        await supabase
          .from('whatsapps')
          .update({ default_queue_id: null })
          .eq('id', selectedConnection.id);
      }

      toast.success("Filas atualizadas!");
      setQueueDialogOpen(false);
      loadConnections();
    } catch (error) {
      console.error("Error updating queues:", error);
      toast.error("Erro ao atualizar filas");
    } finally {
      setUpdatingQueue(false);
    }
  };

  const toggleQueueSelection = (queueId: string) => {
    setSelectedQueueIds(prev => {
      if (prev.includes(queueId)) {
        const newIds = prev.filter(id => id !== queueId);
        // If removing the default, set a new default
        if (defaultQueueId === queueId && newIds.length > 0) {
          setDefaultQueueId(newIds[0]);
        } else if (newIds.length === 0) {
          setDefaultQueueId(null);
        }
        return newIds;
      } else {
        // If first queue, set as default
        if (prev.length === 0) {
          setDefaultQueueId(queueId);
        }
        return [...prev, queueId];
      }
    });
  };

  const getQueueName = (queueId: string | null) => {
    if (!queueId) return null;
    const queue = queues.find(q => q.id === queueId);
    return queue?.name || null;
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case "CONNECTED":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <Wifi className="h-3 w-3" />
            Conectado
          </Badge>
        );
      case "CONNECTING":
      case "OPENING":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Conectando...
          </Badge>
        );
      default:
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Desconectado
          </Badge>
        );
    }
  };

  const getProviderBadge = (provider: string | null) => {
    if (provider === 'cloud_api' || provider === 'coex' || provider === 'meta') {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-blue-500 text-blue-600">
          <Cloud className="h-3 w-3" />
          API Oficial
        </Badge>
      );
    }
    if (provider === 'uazapi') {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-600">
          <Zap className="h-3 w-3" />
          UazAPI
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 text-xs">
        <Zap className="h-3 w-3" />
        {provider || 'Desconhecido'}
      </Badge>
    );
  };

  const getQualityBadge = (rating: string | null) => {
    if (!rating) return null;

    const colors: Record<string, string> = {
      'GREEN': 'bg-green-100 text-green-700',
      'YELLOW': 'bg-yellow-100 text-yellow-700',
      'RED': 'bg-red-100 text-red-700',
    };

    return (
      <Badge variant="outline" className={`text-xs ${colors[rating] || ''}`}>
        Qualidade: {rating}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Conexão WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Conecte seus números do WhatsApp para enviar e receber mensagens
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Conexão WhatsApp</DialogTitle>
              <DialogDescription>
                Escolha o tipo de conexão para seu número
              </DialogDescription>
            </DialogHeader>

            <Tabs value={connectionType} onValueChange={(v) => setConnectionType(v as "uazapi" | "cloud_api" | "manual")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cloud_api" className="gap-2">
                  <Cloud className="h-4 w-4" />
                  Facebook
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="uazapi" className="gap-2">
                  <Zap className="h-4 w-4" />
                  UazAPI
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cloud_api" className="space-y-4 mt-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Cloud className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>API Oficial da Meta</strong> - Conecte diretamente com sua conta
                    do WhatsApp Business via Facebook. Ideal para empresas verificadas.
                  </AlertDescription>
                </Alert>
                <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-medium">Requisitos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Conta no Facebook Business Manager</li>
                    <li>WhatsApp Business verificado</li>
                    <li>Número de telefone configurado no WABA</li>
                  </ul>
                </div>
              </TabsContent>

              <TabsContent value="manual" className="space-y-4 mt-4">
                <Alert className="border-green-200 bg-green-50">
                  <Settings className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Inserção Manual</strong> - Configure manualmente as credenciais da API Oficial.
                    Ideal para demonstração ou quando já possui as credenciais.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="manual-name">Nome da Conexão (opcional)</Label>
                    <Input
                      id="manual-name"
                      placeholder="Ex: WhatsApp Empresa"
                      value={newConnectionName}
                      onChange={(e) => setNewConnectionName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-phone">Número de Telefone</Label>
                    <Input
                      id="manual-phone"
                      placeholder="Ex: +55 11 99999-9999"
                      value={manualPhoneNumber}
                      onChange={(e) => setManualPhoneNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-phone-id">ID do Número de Telefone *</Label>
                    <Input
                      id="manual-phone-id"
                      placeholder="Ex: 123456789012345"
                      value={manualPhoneNumberId}
                      onChange={(e) => setManualPhoneNumberId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontrado em: Meta Business Suite → WhatsApp → Configuração da API
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-waba-id">ID da Conta WhatsApp Business (WABA) *</Label>
                    <Input
                      id="manual-waba-id"
                      placeholder="Ex: 123456789012345"
                      value={manualWabaId}
                      onChange={(e) => setManualWabaId(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontrado em: Meta Business Suite → Configurações → Contas do WhatsApp Business
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-token">Chave API (Access Token) *</Label>
                    <Input
                      id="manual-token"
                      type="password"
                      placeholder="Token de acesso permanente"
                      value={manualAccessToken}
                      onChange={(e) => setManualAccessToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Gere um token permanente via System User no Business Manager
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={testManualConnection}
                    disabled={testingConnection}
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Testar Conexão
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="uazapi" className="space-y-4 mt-4">
                <Alert className="border-green-200 bg-green-50">
                  <Zap className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>UazAPI</strong> - A instância será criada automaticamente no servidor.
                    Basta informar um nome e clicar em criar.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="uazapi-instance">Nome da Instância *</Label>
                    <Input
                      id="uazapi-instance"
                      placeholder="Ex: minha-empresa, atendimento, vendas"
                      value={uazapiInstanceName}
                      onChange={(e) => setUazapiInstanceName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome único para identificar esta conexão WhatsApp
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={createConnection} disabled={creating || testingConnection}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : connectionType === "cloud_api" ? (
                  <>
                    <Cloud className="h-4 w-4 mr-2" />
                    Conectar com Meta
                  </>
                ) : connectionType === "manual" ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Salvar Conexão
                  </>
                ) : (
                  "Criar Conexão"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meta Embedded Signup Dialog */}
      <MetaEmbeddedSignup
        open={metaSignupOpen}
        onOpenChange={setMetaSignupOpen}
        onSuccess={loadConnections}
      />

      {/* Dialog for connecting channel token */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Token do Canal</DialogTitle>
            <DialogDescription>
              Informe o Token do Canal do seu provedor de WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                O Token do Canal é gerado ao criar um canal no painel do provedor.
                Configure também a URL de retorno (webhook) no painel do provedor:
                <code className="block mt-2 p-2 bg-muted rounded text-xs break-all">
                  {import.meta.env.VITE_SUPABASE_URL}/functions/v1/notificame-webhook
                </code>
              </AlertDescription>
            </Alert>
            <div className="space-y-2">
              <Label htmlFor="channel-token">Token do Canal</Label>
              <Input
                id="channel-token"
                placeholder="Ex: 8b360f6e-0159-4b39-831a-6524f605fba9"
                value={channelToken}
                onChange={(e) => setChannelToken(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={connectChannel} disabled={connecting !== null}>
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Vincular Canal
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for configuring queues */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar Filas</DialogTitle>
            <DialogDescription>
              Selecione as filas que receberão tickets desta conexão.
              A fila padrão será usada para novos tickets.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Filas Selecionadas</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-60 overflow-y-auto">
                {queues.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma fila cadastrada
                  </p>
                ) : (
                  queues.map((queue) => (
                    <div
                      key={queue.id}
                      className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${selectedQueueIds.includes(queue.id)
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted'
                        }`}
                      onClick={() => toggleQueueSelection(queue.id)}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: queue.color }}
                        />
                        <span className="text-sm">{queue.name}</span>
                        {(queue as any).ai_agent_id && (
                          <Bot className="h-3 w-3 text-muted-foreground" />
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {selectedQueueIds.includes(queue.id) && (
                          <>
                            {defaultQueueId === queue.id ? (
                              <Badge variant="default" className="text-xs">Padrão</Badge>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDefaultQueueId(queue.id);
                                }}
                              >
                                Definir padrão
                              </Button>
                            )}
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedQueueIds.length === 0
                  ? "Nenhuma fila selecionada. Os tickets não serão atribuídos automaticamente."
                  : `${selectedQueueIds.length} fila(s) selecionada(s). A fila padrão receberá novos tickets.`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={updateConnectionQueues} disabled={updatingQueue}>
              {updatingQueue ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Connection cards */}
      {connections.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie uma nova conexão para começar a enviar e receber mensagens
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {connection.name}
                      {connection.is_default && (
                        <Badge variant="secondary" className="text-xs">
                          Padrão
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      <span className="flex gap-2 mb-1">
                        {getProviderBadge(connection.provider)}
                        {getQualityBadge(connection.quality_rating)}
                      </span>
                      {connection.phone_number_id && (
                        <span className="font-mono text-[10px] text-muted-foreground block">
                          ID: {connection.phone_number_id}
                        </span>
                      )}
                      {connection.instance_id && !connection.phone_number_id && (
                        <span className="font-mono block">Token: {connection.instance_id.substring(0, 8)}...</span>
                      )}
                    </CardDescription>
                  </div>
                  {getStatusBadge(connection.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Webhook info for Cloud API connections */}
                {connection.provider === 'cloud_api' && (
                  <Collapsible
                    open={expandedWebhook === connection.id}
                    onOpenChange={(open) => setExpandedWebhook(open ? connection.id : null)}
                  >
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between text-xs p-2 h-auto">
                        <span className="flex items-center gap-1">
                          <Webhook className="h-3 w-3" />
                          Configuração do Webhook
                        </span>
                        <ChevronDown className={`h-3 w-3 transition-transform ${expandedWebhook === connection.id ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      <div className="bg-muted p-2 rounded text-xs space-y-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">URL do Webhook</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] break-all">
                              {webhookUrl}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(webhookUrl, "URL do Webhook")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Token de Verificação</Label>
                          <div className="flex items-center gap-1 mt-1">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono">
                              {META_WEBHOOK_VERIFY_TOKEN}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => copyToClipboard(META_WEBHOOK_VERIFY_TOKEN, "Token de Verificação")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground pt-1">
                          Insira estes dados em: Meta Developers → Seu App → WhatsApp → Configuração
                        </p>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Queue Badges */}
                {connectionQueuesMap[connection.id]?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs bg-muted p-2 rounded">
                    <Bot className="h-3 w-3 text-muted-foreground" />
                    {connectionQueuesMap[connection.id].map(qa => {
                      const queue = queues.find(q => q.id === qa.queue_id);
                      if (!queue) return null;
                      return (
                        <Badge
                          key={qa.queue_id}
                          variant={qa.is_default ? "default" : "secondary"}
                          className="text-xs gap-1"
                          style={!qa.is_default ? { borderColor: queue.color, borderWidth: 1 } : undefined}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: queue.color }}
                          />
                          {queue.name}
                          {qa.is_default && <span className="opacity-70">(padrão)</span>}
                        </Badge>
                      );
                    })}
                  </div>
                )}

                {/* QR Code display for UazAPI */}
                {connection.provider === 'uazapi' && uazapiConnecting === connection.id && uazapiQrCode && (
                  <div className="bg-white p-4 rounded-lg border text-center space-y-2">
                    <p className="text-sm font-medium">Escaneie o QR Code com seu WhatsApp</p>
                    <img
                      src={uazapiQrCode.startsWith('data:') ? uazapiQrCode : `data:image/png;base64,${uazapiQrCode}`}
                      alt="QR Code WhatsApp"
                      className="mx-auto w-48 h-48"
                    />
                    <p className="text-xs text-muted-foreground">Abra o WhatsApp → Menu → Aparelhos conectados → Conectar</p>
                  </div>
                )}

                {connection.provider === 'uazapi' && uazapiConnecting === connection.id && !uazapiQrCode && (
                  <div className="flex items-center justify-center p-4 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Gerando QR Code...</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {/* Queue configuration button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openQueueDialog(connection)}
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    {connectionQueuesMap[connection.id]?.length > 0 ? "Alterar Filas" : "Definir Filas"}
                  </Button>

                  {/* UazAPI Connect Button */}
                  {connection.status !== "CONNECTED" && connection.provider === "uazapi" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uazapiConnecting === connection.id}
                      onClick={async () => {
                        try {
                          setUazapiConnecting(connection.id);
                          setUazapiQrCode(null);
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch(
                            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-create-instance`,
                            {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session?.access_token}`
                              },
                              body: JSON.stringify({
                                action: 'connect',
                                connectionId: connection.id
                              })
                            }
                          );
                          const result = await res.json();
                          if (!res.ok) throw new Error(result.error || 'Erro ao conectar');
                          if (result.qrcode) {
                            setUazapiQrCode(result.qrcode);
                          }
                          // Poll for status updates
                          const poll = setInterval(async () => {
                            const statusRes = await fetch(
                              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-create-instance`,
                              {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${session?.access_token}`
                                },
                                body: JSON.stringify({
                                  action: 'status',
                                  connectionId: connection.id
                                })
                              }
                            );
                            const statusData = await statusRes.json();
                            if (statusData.status === 'CONNECTED') {
                              clearInterval(poll);
                              setUazapiQrCode(null);
                              setUazapiConnecting(null);
                              toast.success('WhatsApp conectado!');
                              loadConnections();
                            } else if (statusData.qrcode) {
                              setUazapiQrCode(statusData.qrcode);
                            }
                          }, 5000);
                          // Stop polling after 2 minutes
                          setTimeout(() => clearInterval(poll), 120000);
                        } catch (error: any) {
                          console.error('Error connecting UazAPI:', error);
                          toast.error(error.message || 'Erro ao conectar');
                          setUazapiConnecting(null);
                        }
                      }}
                    >
                      {uazapiConnecting === connection.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando...</>
                      ) : (
                        <><Wifi className="h-3 w-3 mr-1" />Conectar WhatsApp</>
                      )}
                    </Button>
                  )}

                  {/* Legacy non-UazAPI non-Cloud connect */}
                  {connection.status !== "CONNECTED" && connection.provider !== "cloud_api" && connection.provider !== "uazapi" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConnectDialog(connection)}
                    >
                      <LinkIcon className="h-3 w-3 mr-1" />
                      {connection.instance_id ? "Atualizar Token" : "Vincular Token"}
                    </Button>
                  )}

                  {connection.status !== "CONNECTED" && connection.provider === "cloud_api" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedConnection(connection);
                        setMetaSignupOpen(true);
                      }}
                    >
                      <Cloud className="h-3 w-3 mr-1" />
                      Reconectar
                    </Button>
                  )}

                  {connection.status === "CONNECTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectConnection(connection.id)}
                    >
                      <WifiOff className="h-3 w-3 mr-1" />
                      Desconectar
                    </Button>
                  )}

                  {!connection.is_default && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAsDefault(connection.id)}
                    >
                      Definir Padrão
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteConnection(connection.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
