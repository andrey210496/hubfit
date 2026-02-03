import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, CheckCircle2, XCircle, RefreshCw, Copy, Info, Wallet, DollarSign, Globe } from "lucide-react";
import { toast } from "sonner";

interface AsaasConfig {
  id?: string;
  environment: 'sandbox' | 'production';
  api_key_sandbox: string;
  api_key_production: string;
  platform_wallet_id: string;
  platform_fee_type: 'fixed' | 'percentage' | 'per_plan';
  platform_fee_value: number;
  is_active: boolean;
}

const defaultConfig: AsaasConfig = {
  environment: 'sandbox',
  api_key_sandbox: '',
  api_key_production: '',
  platform_wallet_id: '',
  platform_fee_type: 'fixed',
  platform_fee_value: 0,
  is_active: true,
};

/**
 * Super Admin page for configuring Asaas payment gateway globally.
 * These settings apply to all companies in the system.
 */
export default function AsaasConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState<AsaasConfig>(defaultConfig);
  const [status, setStatus] = useState<"connected" | "disconnected" | "unknown">("unknown");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    loadConfig();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    setWebhookUrl(`${supabaseUrl}/functions/v1/asaas-webhook`);
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("asaas_platform_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConfig({
          id: data.id,
          environment: data.environment as 'sandbox' | 'production',
          api_key_sandbox: data.api_key_sandbox || '',
          api_key_production: data.api_key_production || '',
          platform_wallet_id: data.platform_wallet_id || '',
          platform_fee_type: data.platform_fee_type as 'fixed' | 'percentage' | 'per_plan',
          platform_fee_value: Number(data.platform_fee_value) || 0,
          is_active: data.is_active ?? true,
        });

        // Test connection if keys are configured
        if (data.api_key_sandbox || data.api_key_production) {
          await testConnection(false);
        }
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

      const configData = {
        environment: config.environment,
        api_key_sandbox: config.api_key_sandbox || null,
        api_key_production: config.api_key_production || null,
        platform_wallet_id: config.platform_wallet_id || null,
        platform_fee_type: config.platform_fee_type,
        platform_fee_value: config.platform_fee_value,
        is_active: config.is_active,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        // Update existing
        const { error } = await supabase
          .from("asaas_platform_config")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("asaas_platform_config")
          .insert(configData)
          .select()
          .single();

        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
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
    const apiKey = config.environment === 'production' 
      ? config.api_key_production 
      : config.api_key_sandbox;

    if (!apiKey) {
      setStatus("disconnected");
      if (showToast) toast.error("Configure a API Key primeiro");
      return;
    }

    try {
      setTesting(true);

      const { data, error } = await supabase.functions.invoke('asaas-gateway', {
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
        if (showToast) toast.error(data?.error || "Falha na conexão");
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
    toast.success("Copiado para a área de transferência!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <CreditCard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Integração Asaas</h1>
            <p className="text-muted-foreground">
              Configure o gateway de pagamento para todas as empresas
            </p>
          </div>
        </div>
        <Badge 
          variant={status === "connected" ? "default" : status === "disconnected" ? "destructive" : "secondary"}
          className="flex items-center gap-1"
        >
          {status === "connected" ? (
            <><CheckCircle2 className="h-3 w-3" /> Conectado</>
          ) : status === "disconnected" ? (
            <><XCircle className="h-3 w-3" /> Desconectado</>
          ) : (
            <>Verificando...</>
          )}
        </Badge>
      </div>

      {/* Environment & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Ambiente e Status
          </CardTitle>
          <CardDescription>
            Configure o ambiente de execução e ative/desative a integração
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Integração Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Habilita ou desabilita a integração para todas as empresas
              </p>
            </div>
            <Switch
              checked={config.is_active}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, is_active: checked }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Ambiente</Label>
            <Select
              value={config.environment}
              onValueChange={(value: 'sandbox' | 'production') => 
                setConfig(prev => ({ ...prev, environment: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">
                  <span className="flex items-center gap-2">
                    🧪 Sandbox (Homologação)
                  </span>
                </SelectItem>
                <SelectItem value="production">
                  <span className="flex items-center gap-2">
                    🚀 Produção
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.environment === 'sandbox' 
                ? 'Ambiente de testes - nenhuma transação real será processada'
                : 'Ambiente de produção - transações reais serão processadas'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credenciais da API
          </CardTitle>
          <CardDescription>
            Configure as chaves de API do Asaas para cada ambiente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key (Sandbox)</Label>
            <Input
              type="password"
              placeholder="$aact_..."
              value={config.api_key_sandbox}
              onChange={(e) => setConfig(prev => ({ ...prev, api_key_sandbox: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Chave para ambiente de homologação
            </p>
          </div>

          <div className="space-y-2">
            <Label>API Key (Produção)</Label>
            <Input
              type="password"
              placeholder="$aact_..."
              value={config.api_key_production}
              onChange={(e) => setConfig(prev => ({ ...prev, api_key_production: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Chave para ambiente de produção
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => testConnection(true)}
            disabled={testing}
          >
            {testing ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testando...</>
            ) : (
              <><RefreshCw className="h-4 w-4 mr-2" /> Testar Conexão</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Platform Fee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Comissão da Plataforma
          </CardTitle>
          <CardDescription>
            Configure a taxa que a plataforma receberá em cada transação (Split)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wallet ID da Plataforma</Label>
            <Input
              placeholder="Seu Wallet ID no Asaas"
              value={config.platform_wallet_id}
              onChange={(e) => setConfig(prev => ({ ...prev, platform_wallet_id: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              ID da carteira que receberá as comissões (encontre em Minha Conta → Dados Comerciais)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Comissão</Label>
              <Select
                value={config.platform_fee_type}
                onValueChange={(value: 'fixed' | 'percentage' | 'per_plan') => 
                  setConfig(prev => ({ ...prev, platform_fee_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  <SelectItem value="percentage">Percentual (%)</SelectItem>
                  <SelectItem value="per_plan">Por Plano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>
                {config.platform_fee_type === 'fixed' ? 'Valor (R$)' : 
                 config.platform_fee_type === 'percentage' ? 'Percentual (%)' : 'Valor Base'}
              </Label>
              <Input
                type="number"
                min={0}
                step={config.platform_fee_type === 'percentage' ? 0.1 : 0.01}
                value={config.platform_fee_value}
                onChange={(e) => setConfig(prev => ({ 
                  ...prev, 
                  platform_fee_value: parseFloat(e.target.value) || 0 
                }))}
              />
            </div>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              {config.platform_fee_type === 'fixed' 
                ? `A plataforma receberá R$ ${config.platform_fee_value.toFixed(2)} por transação`
                : config.platform_fee_type === 'percentage'
                ? `A plataforma receberá ${config.platform_fee_value}% de cada transação`
                : 'A comissão será definida conforme o plano de cada empresa'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Webhook */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Webhook
          </CardTitle>
          <CardDescription>
            Configure este URL no painel do Asaas para receber notificações de pagamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input 
              value={webhookUrl} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            No painel do Asaas, acesse Integrações → Webhooks e adicione este URL
          </p>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={saving} size="lg">
          {saving ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>
    </div>
  );
}
