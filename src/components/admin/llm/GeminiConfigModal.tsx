import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, Shield, Check, ExternalLink, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface LLMConfiguration {
  id: string;
  provider: string;
  default_model: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  api_key_masked?: string;
  api_base_url?: string;
  request_timeout_seconds?: number;
  max_retries?: number;
  advanced_settings?: Record<string, any>;
}

interface GeminiConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingConfig?: LLMConfiguration;
  onSaved: () => void;
}

const GEMINI_MODELS = [
  // Gemini 2.5 Series (mais recentes)
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", description: "Top da linha, raciocínio + multimodal avançado" },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", description: "Rápido com ótima qualidade (Recomendado)" },
  { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite", description: "Ultra rápido e econômico" },
  
  // Gemini 2.0 Series
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", description: "Multimodal rápido" },
  { id: "gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", description: "Versão lite do 2.0" },
  
  // Gemini 1.5 Series
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", description: "Contexto longo (1M tokens)" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", description: "Balanceado e eficiente" },
  { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", description: "Versão compacta" },
  
  // Legado
  { id: "gemini-1.0-pro", name: "Gemini 1.0 Pro", description: "Legado, estável" },
];

const SAFETY_LEVELS = [
  { value: "BLOCK_NONE", label: "Bloquear Nenhum", description: "Sem filtro" },
  { value: "BLOCK_FEW", label: "Bloquear Poucos", description: "Filtro mínimo" },
  { value: "BLOCK_SOME", label: "Bloquear Alguns", description: "Balanceado (Padrão)" },
  { value: "BLOCK_MOST", label: "Bloquear Maioria", description: "Filtro rigoroso" },
];

export function GeminiConfigModal({ open, onOpenChange, existingConfig, onSaved }: GeminiConfigModalProps) {
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    api_key: "",
    default_model: "gemini-2.0-flash",
    api_base_url: "https://generativelanguage.googleapis.com/v1beta",
    request_timeout_seconds: 30,
    max_retries: 3,
    safety_level: "BLOCK_SOME",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (existingConfig) {
      setFormData({
        api_key: "",
        default_model: existingConfig.default_model || "gemini-2.0-flash",
        api_base_url: existingConfig.api_base_url || "https://generativelanguage.googleapis.com/v1beta",
        request_timeout_seconds: existingConfig.request_timeout_seconds || 30,
        max_retries: existingConfig.max_retries || 3,
        safety_level: existingConfig.advanced_settings?.safety_level || "BLOCK_SOME",
      });
    }
  }, [existingConfig]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!existingConfig && !formData.api_key) {
      newErrors.api_key = "API Key é obrigatória";
    } else if (formData.api_key && !formData.api_key.startsWith("AIza")) {
      newErrors.api_key = "API Key deve começar com 'AIza'";
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
          provider: 'gemini',
          api_key: formData.api_key || undefined,
          model: formData.default_model,
        },
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: "Conexão estabelecida com sucesso!" });
        toast.success("Conexão com Gemini estabelecida!");
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
          provider: 'gemini',
          config: {
            api_key: formData.api_key || undefined,
            default_model: formData.default_model,
            api_base_url: formData.api_base_url,
            request_timeout_seconds: formData.request_timeout_seconds,
            max_retries: formData.max_retries,
            advanced_settings: {
              safety_level: formData.safety_level,
            },
          },
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Configuração Gemini salva com sucesso!");
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
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            Configurar Google Gemini
          </DialogTitle>
          <DialogDescription>
            Configure sua integração com a API do Google Gemini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="api_key">
              Google AI API Key {!existingConfig && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Input
                id="api_key"
                type={showApiKey ? "text" : "password"}
                placeholder={existingConfig ? "••••••••••••••••" : "AIza..."}
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
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google AI Studio <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            {existingConfig && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para manter a API Key atual
              </p>
            )}
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
                {GEMINI_MODELS.map((model) => (
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
                    placeholder="https://generativelanguage.googleapis.com/v1beta"
                    value={formData.api_base_url}
                    onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Altere apenas se usar um endpoint customizado
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

                {/* Safety Level */}
                <div className="space-y-2">
                  <Label>Nível de Segurança de Conteúdo</Label>
                  <Select
                    value={formData.safety_level}
                    onValueChange={(value) => setFormData({ ...formData, safety_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFETY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          <div className="flex flex-col">
                            <span>{level.label}</span>
                            <span className="text-xs text-muted-foreground">{level.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Controla como o Gemini filtra conteúdo potencialmente prejudicial
                  </p>
                </div>
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
