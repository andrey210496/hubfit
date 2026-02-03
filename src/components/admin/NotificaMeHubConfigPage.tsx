import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Webhook, Link, CheckCircle2, XCircle, RefreshCw, Copy, Info, Server } from "lucide-react";
import { toast } from "sonner";

interface HubConfig {
  api_url: string;
  api_key: string;
  webhook_secret: string;
}

interface NotificaMeHubConfigPageProps {
  hideHeader?: boolean;
}

/**
 * Super Admin page for configuring WhatsApp integration provider globally.
 * These settings apply to all companies in the system.
 */
export default function NotificaMeHubConfigPage({ hideHeader = false }: NotificaMeHubConfigPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState<HubConfig>({
    api_url: "",
    api_key: "",
    webhook_secret: "",
  });
  const [status, setStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    loadGlobalConfig();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    setWebhookUrl(`${supabaseUrl}/functions/v1/notificame-webhook`);
  }, []);

  const loadGlobalConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("campaign_settings")
        .select("key, value")
        .eq("company_id", "00000000-0000-0000-0000-000000000000")
        .in("key", ["notificame_api_url", "notificame_api_key", "notificame_webhook_secret"]);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((item) => {
        settings[item.key] = item.value || "";
      });

      setConfig({
        api_url: settings.notificame_api_url || "",
        api_key: settings.notificame_api_key || "",
        webhook_secret: settings.notificame_webhook_secret || "",
      });

      // Test connection
      if (settings.notificame_api_url && settings.notificame_api_key) {
        await testConnection(false);
      }
    } catch (error) {
      console.error("Error loading config:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const globalCompanyId = "00000000-0000-0000-0000-000000000000";
      const settings = [
        { key: "notificame_api_url", value: config.api_url },
        { key: "notificame_api_key", value: config.api_key },
        { key: "notificame_webhook_secret", value: config.webhook_secret },
      ];

      for (const setting of settings) {
        const { error } = await supabase
          .from("campaign_settings")
          .upsert({
            company_id: globalCompanyId,
            key: setting.key,
            value: setting.value,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: "company_id,key",
          });

        if (error) throw error;
      }

      toast.success("Configurações salvas!");
      await testConnection(true);
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (showToast = true) => {
    if (!config.api_url || !config.api_key) {
      setStatus("disconnected");
      if (showToast) toast.error("Configure a URL e API Key primeiro");
      return;
    }

    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('notificame-hub', {
        body: { action: 'test_connection' },
      });

      if (error) {
        console.error("Error testing connection:", error);
        setStatus("disconnected");
        if (showToast) toast.error("Erro ao testar conexão");
        return;
      }

      if (data?.success) {
        setStatus("connected");
        if (showToast) toast.success("Conexão estabelecida!");
      } else {
        setStatus("disconnected");
        if (showToast) toast.error(data?.error || "Falha ao conectar");
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      setStatus("disconnected");
      if (showToast) toast.error("Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("URL copiada!");
  };

  const generateSecret = () => {
    const secret = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    setConfig((prev) => ({ ...prev, webhook_secret: secret.substring(0, 64) }));
    toast.info("Secret gerado!");
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
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Server className="h-6 w-6" />
              Integração WhatsApp - Configuração Global
            </h1>
            <p className="text-muted-foreground">
              Configure o provedor de integração WhatsApp para todas as empresas
            </p>
          </div>
          <Badge
            variant={
              status === "connected"
                ? "default"
                : status === "disconnected"
                ? "destructive"
                : "secondary"
            }
            className="gap-1"
          >
            {status === "connected" ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </>
            ) : status === "disconnected" ? (
              <>
                <XCircle className="h-3 w-3" />
                Desconectado
              </>
            ) : (
              "Verificando..."
            )}
          </Badge>
        </div>
      )}

      {hideHeader && (
        <div className="flex justify-end">
          <Badge
            variant={
              status === "connected"
                ? "default"
                : status === "disconnected"
                ? "destructive"
                : "secondary"
            }
            className="gap-1"
          >
            {status === "connected" ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </>
            ) : status === "disconnected" ? (
              <>
                <XCircle className="h-3 w-3" />
                Desconectado
              </>
            ) : (
              "Verificando..."
            )}
          </Badge>
        </div>
      )}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Configuração Super Admin:</strong> Estas configurações são globais e afetam todas as empresas do sistema.
          Os clientes utilizarão o Token de Canal para vincular seus números.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              Configuração da API
            </CardTitle>
            <CardDescription>
              Credenciais do provedor de WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api_url">URL da API</Label>
              <Input
                id="api_url"
                placeholder="https://hub.notificame.com.br"
                value={config.api_url}
                onChange={(e) => setConfig((prev) => ({ ...prev, api_url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="api_key">API Key Master</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Token de acesso master"
                value={config.api_key}
                onChange={(e) => setConfig((prev) => ({ ...prev, api_key: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveConfig} disabled={saving} className="flex-1">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configurações"
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => testConnection(true)}
                disabled={testing || !config.api_url || !config.api_key}
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Configuração do Webhook
            </CardTitle>
            <CardDescription>
              URL e secret para receber eventos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input value={webhookUrl} readOnly className="bg-muted font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure esta URL no painel do provedor para receber mensagens e atualizações de status.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhook_secret">Webhook Secret (opcional)</Label>
              <div className="flex gap-2">
                <Input
                  id="webhook_secret"
                  type="password"
                  placeholder="Secret para validar webhooks"
                  value={config.webhook_secret}
                  onChange={(e) => setConfig((prev) => ({ ...prev, webhook_secret: e.target.value }))}
                />
                <Button variant="outline" size="icon" onClick={generateSecret}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instruções de Configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Configure o Provedor</h4>
            <p className="text-sm text-muted-foreground">
              Preencha a URL da API e a API Key Master fornecidas pelo provedor de WhatsApp.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Configure o Webhook no Provedor</h4>
            <p className="text-sm text-muted-foreground">
              Copie a URL do webhook acima e configure no painel do provedor para receber mensagens.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Clientes Vinculam Tokens</h4>
            <p className="text-sm text-muted-foreground">
              Cada cliente criará seu canal no provedor e vinculará o Token de Canal na página de Conexão WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
