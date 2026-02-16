import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Smartphone, Plus, Trash2, Wifi, WifiOff, Info, MessageSquare, LinkIcon, Cloud, Zap, Settings, CheckCircle, Copy, ChevronDown, Webhook, Bot, RefreshCw } from "lucide-react";
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
  uazapi_instance_id?: string;
  uazapi_url?: string;
  uazapi_token?: string;
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
  const [connectionType, setConnectionType] = useState<"salesflow" | "cloud_api" | "manual">("cloud_api");
  // SalesflowAPI fields
  const [salesflowInstanceName, setSalesflowInstanceName] = useState("");
  const [salesflowSystemName, setSalesflowSystemName] = useState("");
  const [salesflowQrCode, setSalesflowQrCode] = useState<string | null>(null);
  const [salesflowConnecting, setSalesflowConnecting] = useState<string | null>(null);
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
  // const salesflowWebhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-webhook`;

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

    // SalesflowAPI connection — auto-create via API
    if (connectionType === "salesflow") {
      if (!salesflowInstanceName.trim()) {
        toast.error("Digite o nome da instância");
        return;
      }

      if (!salesflowSystemName.trim()) {
        toast.error("Digite o nome do sistema");
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
              instanceName: salesflowInstanceName.trim(),
              systemName: salesflowSystemName.trim(),
              action: 'create'
            })
          }
        );

        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro ao criar instância');

        toast.success("Instância SalesflowAPI criada com sucesso!");

        // Auto-connect to generate QR Code
        if (result.connection) {
          await connectSalesflow(result.connection.id);
        }

        setCreateDialogOpen(false);
        setNewConnectionName("");
        setSalesflowInstanceName("");
        setSalesflowSystemName("");
        loadConnections();
      } catch (error: any) {
        console.error("Error creating SalesflowAPI instance:", error);
        toast.error(error.message || "Erro ao criar instância SalesflowAPI");
      } finally {
        setCreating(false);
      }
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

  const connectSalesflow = async (connectionId: string) => {
    try {
      setSalesflowConnecting(connectionId);
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
            connectionId: connectionId
          })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao conectar SalesflowAPI');

      toast.success("Solicitação de conexão enviada!");
      loadConnections();
    } catch (error: any) {
      console.error("Error connecting SalesflowAPI:", error);
      toast.error(error.message || "Erro ao conectar");
    } finally {
      setSalesflowConnecting(null);
    }
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

  const deleteConnection = async (connection: WhatsAppConnection) => {
    if (!confirm("Tem certeza que deseja excluir esta conexão?")) return;

    try {
      // Deletar da SalesflowAPI se for o provider
      if (connection.provider === 'uazapi' || connection.provider === 'salesflow') {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uazapi-create-instance`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({
              action: 'delete',
              connectionId: connection.id
            })
          }
        );
      } else {
        await disconnectConnection(connection.id);
      }

      const { error } = await supabase
        .from("whatsapps")
        .delete()
        .eq("id", connection.id);

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
      case "WAITING_QR":
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
    if (provider === 'uazapi' || provider === 'salesflow') {
      return (
        <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-600">
          <Zap className="h-3 w-3" />
          SalesflowAPI
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

            <Tabs value={connectionType} onValueChange={(v) => setConnectionType(v as "salesflow" | "cloud_api" | "manual")}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="cloud_api" className="gap-2">
                  <Cloud className="h-4 w-4" />
                  Facebook
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <Settings className="h-4 w-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="salesflow" className="gap-2">
                  <Zap className="h-4 w-4" />
                  SalesflowAPI
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

              <TabsContent value="salesflow" className="space-y-4 mt-4">
                <Alert className="border-green-200 bg-green-50">
                  <Zap className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>SalesflowAPI</strong> - A instância será criada automaticamente no servidor.
                    Basta informar um nome e clicar em criar.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="salesflow-instance">Nome da Instância *</Label>
                    <Input
                      id="salesflow-instance"
                      placeholder="Ex: minha-empresa, atendimento, vendas"
                      value={salesflowInstanceName}
                      onChange={(e) => setSalesflowInstanceName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome único para identificar esta conexão WhatsApp
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="salesflow-system-name">System Name *</Label>
                    <Input
                      id="salesflow-system-name"
                      placeholder="Ex: uazapi-v2-dev"
                      value={salesflowSystemName}
                      onChange={(e) => setSalesflowSystemName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome do sistema para identificação na API
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {connections.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-lg bg-muted/50">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Nenhuma conexão encontrada</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
              Você ainda não conectou nenhum número de WhatsApp. Clique em "Nova Conexão" para começar.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar primeira conexão
            </Button>
          </div>
        )}

        {connections.map((connection) => {
          const isOfficial = ['cloud_api', 'coex', 'meta'].includes(connection.provider || '');
          const defaultQueue = connectionQueuesMap[connection.id]?.find(q => q.is_default);
          const defaultQueueName = defaultQueue ? getQueueName(defaultQueue.queue_id) : 'Nenhuma fila';

          return (
            <Card key={connection.id} className={`relative overflow-hidden transition-all hover:shadow-md ${connection.is_default ? 'border-primary shadow-sm' : ''} bg-card`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 w-full">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold truncate leading-none" title={connection.name}>
                          {connection.name}
                        </CardTitle>
                        {connection.is_default && (
                          <Badge variant="default" className="text-[10px] h-5 px-1.5 bg-orange-500 hover:bg-orange-600 border-none">
                            Padrão
                          </Badge>
                        )}
                      </div>
                      {getStatusBadge(connection.status)}
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      <div className="flex items-center gap-2">
                        {getProviderBadge(connection.provider)}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground bg-muted/50 border-border">
                          Qualidade: {connection.quality_rating || 'UNKNOWN'}
                        </Badge>
                        {['uazapi', 'salesflow'].includes(connection.provider || '') && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2 h-6 text-xs px-2"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const btn = e.currentTarget;
                              const originalText = btn.innerText;
                              btn.innerText = 'Checking...';
                              btn.disabled = true;
                              try {
                                const { data, error } = await supabase.functions.invoke('uazapi-check-status', {
                                  body: { connectionId: connection.id }
                                });
                                if (error) throw error;
                                if (data.status) {
                                  loadConnections();
                                  alert(`Status atualizado: ${data.status}`);
                                } else {
                                  alert('Status não mudou.');
                                }
                              } catch (err: any) {
                                alert('Erro: ' + err.message);
                              } finally {
                                btn.innerText = originalText;
                                btn.disabled = false;
                              }
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Check
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        ID: {connection.phone_number_id || connection.waba_id || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* QR Code Display Logic */}
                {(connection.status === 'WAITING_QR' || connection.status === 'OPENING' || connection.status === "CONNECTING") && connection.qr_code && (
                  <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-border">
                    <img src={connection.qr_code} alt="QR Code" className="w-40 h-40 object-contain" />
                    <p className="text-xs text-muted-foreground mt-2 text-center">Escaneie com seu WhatsApp</p>
                  </div>
                )}

                {/* Webhook Configuration / Queue Info */}
                {connection.status === 'CONNECTED' && (
                  <Collapsible
                    open={expandedWebhook === connection.id}
                    onOpenChange={(isOpen) => setExpandedWebhook(isOpen ? connection.id : null)}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent w-full justify-between">
                          <span className="flex items-center gap-2 text-xs">
                            <Webhook className="h-3 w-3" /> Configuração do Webhook
                          </span>
                          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 ${expandedWebhook === connection.id ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Fila Padrão</Label>
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className={`text-xs ${defaultQueue ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20' : 'bg-muted text-muted-foreground'}`}>
                              {defaultQueueName || 'Nenhuma fila configurada'} (padrão)
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/50">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Callback URL (Webhook)</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono border truncate">
                              {webhookUrl}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Verify Token</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono border truncate">
                              {META_WEBHOOK_VERIFY_TOKEN}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(META_WEBHOOK_VERIFY_TOKEN, 'Verify Token')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* API Credentials (Salesflow) */}
                {(connection.provider === 'uazapi' || connection.provider === 'salesflow') && connection.status === 'CONNECTED' && (
                  <Collapsible className="space-y-2 mt-2">
                    <div className="flex items-center justify-between text-sm font-medium text-foreground">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto hover:bg-transparent w-full justify-between">
                          <span className="flex items-center gap-2 text-xs">
                            <Settings className="h-3 w-3" /> Credenciais da API (Integração)
                          </span>
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    <CollapsibleContent>
                      <div className="p-3 bg-muted/30 rounded-lg border border-border/50 space-y-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Server URL</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono border truncate">
                              {connection.uazapi_url || 'https://salesflow.uazapi.com'}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(connection.uazapi_url || 'https://salesflow.uazapi.com', 'API URL')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">API Token (Key)</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono border truncate">
                              {connection.uazapi_token ? `${connection.uazapi_token.substring(0, 8)}...` : '**********'}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(connection.uazapi_token || '', 'API Token')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Instance Name</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 bg-background p-1.5 rounded text-[10px] font-mono border truncate">
                              {connection.uazapi_instance_id || connection.name}
                            </code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(connection.uazapi_instance_id || connection.name, 'Instance Name')}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  {/* Salesflow Connect Button */}
                  {(connection.provider === 'uazapi' || connection.provider === 'salesflow') && connection.status !== 'CONNECTED' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 h-9 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                      onClick={() => connectSalesflow(connection.id)}
                      disabled={!!salesflowConnecting}
                    >
                      {salesflowConnecting === connection.id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <Zap className="h-3.5 w-3.5 mr-2" />
                          Conectar
                        </>
                      )}
                    </Button>
                  )}

                  {connection.status === 'CONNECTED' && (
                    <>
                      <Button variant="secondary" size="sm" className="flex-1 h-9 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200" onClick={() => openQueueDialog(connection)}>
                        <Bot className="h-3.5 w-3.5 mr-2" />
                        Alterar Filas
                      </Button>

                      <Button variant="secondary" size="sm" className="flex-1 h-9 bg-zinc-900 text-zinc-100 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200" onClick={() => disconnectConnection(connection.id)}>
                        <WifiOff className="h-3.5 w-3.5 mr-2" />
                        Desconectar
                      </Button>

                      <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => deleteConnection(connection)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}

                  {connection.status !== 'CONNECTED' && (
                    <Button variant="destructive" size="sm" className="w-full justify-center h-9" onClick={() => deleteConnection(connection)}>
                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                      Remover Conexão
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
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
      {/* Queue Assignment Dialog */}
      <Dialog open={queueDialogOpen} onOpenChange={setQueueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerenciar Filas</DialogTitle>
            <DialogDescription>
              Selecione as filas que esta conexão pode atender. A fila padrão receberá novos chats.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {queues.length === 0 ? (
              <p className="text-sm text-center text-muted-foreground">Nenhuma fila cadastrada no sistema.</p>
            ) : (
              <div className="grid gap-3">
                {queues.map((queue) => (
                  <div key={queue.id} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border">
                    <Checkbox
                      id={`queue-${queue.id}`}
                      checked={selectedQueueIds.includes(queue.id)}
                      onCheckedChange={() => toggleQueueSelection(queue.id)}
                    />
                    <div className="flex-1 grid gap-1.5 leading-none">
                      <Label
                        htmlFor={`queue-${queue.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {queue.name}
                      </Label>
                    </div>
                    {selectedQueueIds.includes(queue.id) && (
                      <Badge
                        variant={defaultQueueId === queue.id ? "default" : "outline"}
                        className={`cursor-pointer text-[10px] h-5 ${defaultQueueId === queue.id ? 'bg-red-500 hover:bg-red-600' : 'hover:bg-muted'}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setDefaultQueueId(queue.id);
                        }}
                      >
                        {defaultQueueId === queue.id ? "Padrão" : "Definir Padrão"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQueueDialogOpen(false)}>Cancelar</Button>
            <Button onClick={updateConnectionQueues} disabled={updatingQueue}>
              {updatingQueue ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
}
