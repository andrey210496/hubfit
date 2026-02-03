import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Save, Cloud, Key, Shield } from "lucide-react";
import { toast } from "sonner";
interface MetaAppConfigPageProps {
  hideHeader?: boolean;
}

export function MetaAppConfigPage({ hideHeader = false }: MetaAppConfigPageProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    meta_app_id: "",
    meta_config_id: "",
    meta_app_secret: "",
    meta_api_version: "v21.0",
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("campaign_settings")
        .select("key, value")
        .eq("company_id", "00000000-0000-0000-0000-000000000000")
        .in("key", ["meta_app_id", "meta_config_id", "meta_app_secret", "meta_api_version"]);

      if (error) throw error;

      const settings: Record<string, string> = {};
      data?.forEach((item) => {
        settings[item.key] = item.value || "";
      });

      setConfig({
        meta_app_id: settings.meta_app_id || "",
        meta_config_id: settings.meta_config_id || "",
        meta_app_secret: settings.meta_app_secret || "",
        meta_api_version: settings.meta_api_version || "v21.0",
      });
    } catch (error) {
      console.error("Error loading config:", error);
      toast.error("Erro ao carregar configuração");
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);

      const entries = [
        { key: "meta_app_id", value: config.meta_app_id },
        { key: "meta_config_id", value: config.meta_config_id },
        { key: "meta_app_secret", value: config.meta_app_secret },
        { key: "meta_api_version", value: config.meta_api_version },
      ];

      for (const entry of entries) {
        const { data: existing } = await supabase
          .from("campaign_settings")
          .select("id")
          .eq("company_id", "00000000-0000-0000-0000-000000000000")
          .eq("key", entry.key)
          .single();

        if (existing) {
          await supabase
            .from("campaign_settings")
            .update({ value: entry.value })
            .eq("id", existing.id);
        } else {
          await supabase.from("campaign_settings").insert({
            company_id: "00000000-0000-0000-0000-000000000000",
            key: entry.key,
            value: entry.value,
          });
        }
      }

      toast.success("Configuração salva com sucesso!");
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configuração");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {!hideHeader && (
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            Configuração Meta Cloud API
          </h1>
          <p className="text-muted-foreground">
            Configure as credenciais do app da Meta para o Embedded Signup
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Credenciais do Meta App</CardTitle>
          <CardDescription>
            Obtenha essas informações no Meta Developer Portal
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Essas credenciais são usadas para permitir que clientes conectem 
              seus números WhatsApp Business via API Oficial da Meta.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="app-id">App ID</Label>
            <Input
              id="app-id"
              placeholder="Ex: 1373629487606011"
              value={config.meta_app_id}
              onChange={(e) => setConfig({ ...config, meta_app_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ID do aplicativo no Meta Developer Portal
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="config-id">Config ID (Embedded Signup)</Label>
            <Input
              id="config-id"
              placeholder="Ex: 748870054904726"
              value={config.meta_config_id}
              onChange={(e) => setConfig({ ...config, meta_config_id: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              ID da configuração do Embedded Signup
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="app-secret">App Secret</Label>
            <Input
              id="app-secret"
              type="password"
              placeholder="••••••••••••••••"
              value={config.meta_app_secret}
              onChange={(e) => setConfig({ ...config, meta_app_secret: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Chave secreta do aplicativo (manter confidencial)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-version">API Version</Label>
            <Input
              id="api-version"
              placeholder="Ex: v21.0"
              value={config.meta_api_version}
              onChange={(e) => setConfig({ ...config, meta_api_version: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Versão da API do WhatsApp (ex: v21.0, v22.0)
            </p>
          </div>

          <Button onClick={saveConfig} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configuração
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
