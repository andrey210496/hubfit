export interface LLMModel {
    id: string;
    name: string;
    description: string;
    provider?: 'openai' | 'gemini';
}

export const OPENAI_MODELS: LLMModel[] = [
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

export const GEMINI_MODELS: LLMModel[] = [
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
