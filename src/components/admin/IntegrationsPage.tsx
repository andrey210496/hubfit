import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Puzzle, MessageCircle, Bot } from "lucide-react";
import { MetaAppConfigPage } from "./MetaAppConfigPage";
import { LLMIntegrationsTab } from "./llm/LLMIntegrationsTab";

/**
 * Unified Integrations page with tabs for different integration types
 */
export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState("whatsapp");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Puzzle className="h-6 w-6" />
          Integrações
        </h1>
        <p className="text-muted-foreground">
          Configure integrações externas para todas as empresas do sistema
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-2">
          <TabsTrigger value="whatsapp" className="gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="llm" className="gap-2">
            <Bot className="h-4 w-4" />
            LLM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp" className="mt-6">
          <MetaAppConfigPage />
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <LLMIntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
