import { useState, useEffect } from "react";
import { Bot, Sparkles, ExternalLink, HelpCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LLMProviderCard } from "./LLMProviderCard";
import { OpenAIConfigModal } from "./OpenAIConfigModal";
import { GeminiConfigModal } from "./GeminiConfigModal";
import { useLLMConfigurations } from "@/hooks/useLLMConfigurations";

import { OPENAI_MODELS, GEMINI_MODELS } from "@/lib/llm-models";

export function LLMIntegrationsTab() {
  const [openAIModalOpen, setOpenAIModalOpen] = useState(false);
  const [geminiModalOpen, setGeminiModalOpen] = useState(false);

  const { configurations, loading, refetch, testConnection, testing } = useLLMConfigurations();

  const openaiConfig = configurations.find(c => c.provider === 'openai');
  const geminiConfig = configurations.find(c => c.provider === 'gemini');

  // Map to simple string array for display
  const openaiModels = OPENAI_MODELS.map(m => m.name);
  const geminiModels = GEMINI_MODELS.map(m => m.name);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Integrações LLM (Large Language Model)</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>LLMs são modelos de IA que entendem e geram texto. Configure para habilitar agentes inteligentes e automações.</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-muted-foreground">
            Configure modelos de IA para alimentar seus agentes inteligentes e automações
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <a href="https://docs.lovable.dev/features/ai" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Guia de API Keys
          </a>
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          <strong>Dica:</strong> Configure pelo menos um provedor LLM para que seus Agentes de IA possam processar conversas.
          Se nenhum for configurado, o sistema usará o provedor padrão do Lovable (quando disponível).
        </AlertDescription>
      </Alert>

      {/* Provider Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* OpenAI Card */}
        <LLMProviderCard
          provider="openai"
          name="OpenAI"
          subtitle="(ChatGPT)"
          logo={<OpenAILogo />}
          models={openaiModels}
          config={openaiConfig}
          loading={loading}
          onConfigure={() => setOpenAIModalOpen(true)}
          onTest={() => testConnection('openai')}
          testing={testing === 'openai'}
        />

        {/* Gemini Card */}
        <LLMProviderCard
          provider="gemini"
          name="Google Gemini"
          logo={<GeminiLogo />}
          models={geminiModels}
          config={geminiConfig}
          loading={loading}
          onConfigure={() => setGeminiModalOpen(true)}
          onTest={() => testConnection('gemini')}
          testing={testing === 'gemini'}
        />

        {/* Coming Soon Cards */}
        <LLMProviderCard
          provider="anthropic"
          name="Anthropic"
          subtitle="(Claude)"
          logo={<AnthropicLogo />}
          models={["Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku"]}
          comingSoon
          loading={false}
        />

        <LLMProviderCard
          provider="local"
          name="Modelos Locais"
          subtitle="(Ollama)"
          logo={<LocalModelsLogo />}
          models={["LLaMA 3", "Mistral", "Qwen"]}
          comingSoon
          loading={false}
        />
      </div>

      {/* Modals */}
      <OpenAIConfigModal
        open={openAIModalOpen}
        onOpenChange={setOpenAIModalOpen}
        existingConfig={openaiConfig}
        onSaved={refetch}
      />

      <GeminiConfigModal
        open={geminiModalOpen}
        onOpenChange={setGeminiModalOpen}
        existingConfig={geminiConfig}
        onSaved={refetch}
      />
    </div>
  );
}

// Logo Components
function OpenAILogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#10A37F] flex items-center justify-center">
      <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
      </svg>
    </div>
  );
}

function GeminiLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
      <Sparkles className="w-6 h-6 text-white" />
    </div>
  );
}

function AnthropicLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-[#D4A574] flex items-center justify-center">
      <span className="text-white font-bold text-lg">A</span>
    </div>
  );
}

function LocalModelsLogo() {
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
      <Bot className="w-6 h-6 text-white" />
    </div>
  );
}
