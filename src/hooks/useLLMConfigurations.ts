import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface LLMConfiguration {
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

export function useLLMConfigurations() {
  const { profile } = useAuth();
  const [configurations, setConfigurations] = useState<LLMConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);

  const fetchConfigurations = useCallback(async () => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Use explicit type casting since the table was just created
      const { data, error } = await supabase
        .from("llm_configurations" as any)
        .select("*")
        .eq("company_id", profile.company_id);

      if (error) {
        console.error("Error fetching LLM configurations:", error);
        // Don't throw - just set empty array if table doesn't exist yet
        setConfigurations([]);
        return;
      }

      // Map the data to our interface, masking the API key
      const mapped: LLMConfiguration[] = (data || []).map((config: any) => ({
        id: config.id,
        provider: config.provider,
        default_model: config.default_model,
        is_active: config.is_active,
        last_tested_at: config.last_tested_at,
        last_test_status: config.last_test_status,
        last_test_error: config.last_test_error,
        organization_id: config.organization_id,
        api_base_url: config.api_base_url,
        request_timeout_seconds: config.request_timeout_seconds,
        max_retries: config.max_retries,
        advanced_settings: config.advanced_settings,
        api_key_masked: config.api_key_encrypted 
          ? `${config.api_key_encrypted.substring(0, 7)}...${config.api_key_encrypted.slice(-3)}`
          : undefined,
      }));

      setConfigurations(mapped);
    } catch (error) {
      console.error("Error fetching LLM configurations:", error);
      setConfigurations([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.company_id]);

  useEffect(() => {
    fetchConfigurations();
  }, [fetchConfigurations]);

  const testConnection = async (provider: string) => {
    setTesting(provider);
    
    try {
      const { data, error } = await supabase.functions.invoke('llm-config', {
        body: {
          action: 'test',
          provider,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Conexão com ${provider === 'openai' ? 'OpenAI' : 'Gemini'} estabelecida!`);
        // Refresh configurations to get updated test status
        await fetchConfigurations();
      } else {
        toast.error(data?.error || "Falha ao testar conexão");
      }
    } catch (error: any) {
      console.error("Test connection error:", error);
      toast.error("Erro ao testar conexão");
    } finally {
      setTesting(null);
    }
  };

  const deleteConfiguration = async (provider: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('llm-config', {
        body: {
          action: 'delete',
          provider,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Configuração removida com sucesso!");
        await fetchConfigurations();
      } else {
        throw new Error(data?.error || "Erro ao remover");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error(error.message || "Erro ao remover configuração");
    }
  };

  return {
    configurations,
    loading,
    testing,
    refetch: fetchConfigurations,
    testConnection,
    deleteConfiguration,
  };
}
