import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Eye, EyeOff, Loader2, Shield, Check, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface LLMConfiguration {
  id: string;
  provider: string;
  default_model: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  api_key_masked?: string;
  organization_id?: string;
  api_base_url?: string;
  request_timeout_seconds?: number;
  max_retries?: number;
  advanced_settings?: Record<string, any>;
}

interface OpenAIConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConfig?: LLMConfiguration;
  onSaved: () => void;
}

const OPENAI_MODELS = [
  // GPT-4o Series
  { id: "gpt-4o", name: "GPT-4o", description: "Modelo flagship, multimodal (texto + imagens)" },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Rápido e econômico, ótimo custo-benefício" },
  { id: "gpt-4o-audio-preview", name: "GPT-4o Audio", description: "Suporte a áudio (preview)" },
  
  // GPT-4.1 Series (mais recentes)
  { id: "gpt-4.1", name: "GPT-4.1", description: "Última geração, melhor raciocínio" },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", description: "Versão compacta do 4.1" },
  { id: "gpt-4.1-nano", name: "GPT-4.1 Nano", description: "Ultra rápido e econômico" },
  
  // o-Series (Raciocínio)
  { id: "o1", name: "o1", description: "Raciocínio avançado, ideal para problemas complexos" },
  { id: "o1-mini", name: "o1-mini", description: "Raciocínio rápido, mais econômico" },
  { id: "o1-preview", name: "o1-preview", description: "Preview do modelo o1" },
  { id: "o3-mini", name: "o3-mini", description: "Nova geração de raciocínio (mais recente)" },
  
  // GPT-4 Turbo
  { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "Alta performance, contexto 128K" },
  { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo Preview", description: "Versão preview" },
  
  // GPT-3.5 (Legado)
  { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Legado, mais econômico" },
];

export function OpenAIConfigModal({ open, onOpenChange, existingConfig, onSaved }: OpenAIConfigModalProps) {
  const { profile } = useAuth();
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    api_key: "",
    organization_id: "",
    default_model: "gpt-4o-mini",
    api_base_url: "https://api.openai.com/v1",
    request_timeout_seconds: 30,
    max_retries: 3,
    rate_limiting_enabled: false,
    requests_per_minute: 60,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingConfig) {
      setFormData({
        api_key: "", // Never pre-fill API key
        organization_id: existingConfig.organization_id || "",
        default_model: existingConfig.default_model || "gpt-4o-mini",
        api_base_url: existingConfig.api_base_url || "https://api.openai.com/v1",
        request_timeout_seconds: existingConfig.request_timeout_seconds || 30,
        max_retries: existingConfig.max_retries || 3,
        rate_limiting_enabled: existingConfig.advanced_settings?.rate_limiting_enabled || false,
        requests_per_minute: existingConfig.advanced_settings?.requests_per_minute || 60,
      });
    }
  }, [existingConfig]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!existingConfig && !formData.api_key) {
      newErrors.api_key = "API Key é obrigatória";
    } else if (formData.api_key && !formData.api_key.startsWith("sk-")) {
      newErrors.api_key = "API Key deve começar com 'sk-'";
    }

    if (formData.organization_id && !formData.organization_id.startsWith("org-")) {
      newErrors.organization_id = "Organization ID deve começar com 'org-'";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!formData.api_key && !existingConfig) {
      toast.error("Insira a API Key primeiro");
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('llm-config', {
        body: {
          action: 'test',
          provider: 'openai',
          api_key: formData.api_key || undefined,
          model: formData.default_model,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: "Conexão estabelecida com sucesso!" });
        toast.success("Conexão com OpenAI estabelecida!");
      } else {
        setTestResult({ success: false, message: data?.error || "Falha ao conectar" });
        toast.error(data?.error || "Falha ao testar conexão");
      }
    } catch (error: any) {
      console.error("Test error:", error);
      setTestResult({ success: false, message: error.message || "Erro ao testar conexão" });
      toast.error("Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      const { data, error } = await supabase.functions.invoke('llm-config', {
        body: {
          action: existingConfig ? 'update' : 'create',
          provider: 'openai',
          config: {
            api_key: formData.api_key || undefined,
            organization_id: formData.organization_id || undefined,
            default_model: formData.default_model,
            api_base_url: formData.api_base_url,
            request_timeout_seconds: formData.request_timeout_seconds,
            max_retries: formData.max_retries,
            advanced_settings: {
              rate_limiting_enabled: formData.rate_limiting_enabled,
              requests_per_minute: formData.requests_per_minute,
            },
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Configuração OpenAI salva com sucesso!");
        onSaved();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || "Erro ao salvar");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#10A37F] flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729z" />
              </svg>
            </div>
            Configurar OpenAI
          </DialogTitle>
          <DialogDescription>
            Configure sua integração com a API da OpenAI para usar modelos GPT
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">
              OpenAI API Key {!existingConfig && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                placeholder={existingConfig ? "••••••••••••••••" : "sk-proj-..."}
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className={errors.api_key ? "border-destructive" : ""}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.api_key && <p className="text-xs text-destructive">{errors.api_key}</p>}
            <p className="text-xs text-muted-foreground">
              Obtenha em{" "}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                platform.openai.com <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            {existingConfig && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a API Key atual
              </p>
            )}
          </div>

          {/* Organization ID */}
          <div className="space-y-2">
            <Label htmlFor="organization_id">Organization ID (opcional)</Label>
            <Input
              id="organization_id"
              placeholder="org-..."
              value={formData.organization_id}
              onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
              className={errors.organization_id ? "border-destructive" : ""}
            />
            {errors.organization_id && <p className="text-xs text-destructive">{errors.organization_id}</p>}
            <p className="text-xs text-muted-foreground">
              Necessário apenas se você pertence a múltiplas organizações
            </p>
          </div>

          {/* Default Model */}
          <div className="space-y-2">
            <Label>Modelo Padrão</Label>
            <Select
              value={formData.default_model}
              onValueChange={(value) => setFormData({ ...formData, default_model: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPENAI_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Este modelo será usado por padrão nos Agentes de IA
            </p>
          </div>

          {/* Advanced Settings */}
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm">Configurações Avançadas</AccordionTrigger>
              <AccordionContent className="space-y-4 pt-4">
                {/* API Base URL */}
                <div className="space-y-2">
                  <Label htmlFor="api_base_url">URL Base da API</Label>
                  <Input
                    id="api_base_url"
                    placeholder="https://api.openai.com/v1"
                    value={formData.api_base_url}
                    onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Altere apenas se usar um proxy ou endpoint customizado
                  </p>
                </div>

                {/* Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (segundos)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min={10}
                    max={120}
                    value={formData.request_timeout_seconds}
                    onChange={(e) => setFormData({ ...formData, request_timeout_seconds: parseInt(e.target.value) })}
                  />
                </div>

                {/* Max Retries */}
                <div className="space-y-2">
                  <Label htmlFor="retries">Máximo de Tentativas</Label>
                  <Input
                    id="retries"
                    type="number"
                    min={0}
                    max={5}
                    value={formData.max_retries}
                    onChange={(e) => setFormData({ ...formData, max_retries: parseInt(e.target.value) })}
                  />
                </div>

                {/* Rate Limiting */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Limite de Requisições</Label>
                    <p className="text-xs text-muted-foreground">
                      Limitar requisições por minuto
                    </p>
                  </div>
                  <Switch
                    checked={formData.rate_limiting_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, rate_limiting_enabled: checked })}
                  />
                </div>

                {formData.rate_limiting_enabled && (
                  <div className="space-y-2">
                    <Label>Requisições por Minuto</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={formData.requests_per_minute}
                      onChange={(e) => setFormData({ ...formData, requests_per_minute: parseInt(e.target.value) })}
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Test Result */}
          {testResult && (
            <Alert variant={testResult.success ? "default" : "destructive"}>
              {testResult.success ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}

          {/* Security Note */}
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Segurança:</strong> Suas API Keys são criptografadas e armazenadas de forma segura.
              Nunca são expostas em logs ou no código cliente.
            </AlertDescription>
          </Alert>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Testar Conexão
              </>
            )}
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
