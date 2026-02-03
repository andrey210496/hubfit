import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Puzzle, MessageCircle, Bot } from "lucide-react";
import NotificaMeHubConfigPage from "./NotificaMeHubConfigPage";
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
          <WhatsAppContent />
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <LLMIntegrationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// WhatsApp sub-tabs content
function WhatsAppContent() {
  const [whatsappTab, setWhatsappTab] = useState("notificame");

  return (
    <div className="space-y-4">
      <Tabs value={whatsappTab} onValueChange={setWhatsappTab} className="w-full">
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="notificame" className="flex-1">
            NotificaMe Hub
          </TabsTrigger>
          <TabsTrigger value="meta" className="flex-1">
            Meta Cloud API
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notificame" className="mt-4">
          <NotificaMeHubConfigPage hideHeader />
        </TabsContent>

        <TabsContent value="meta" className="mt-4">
          <MetaAppConfigPage hideHeader />
        </TabsContent>
      </Tabs>
    </div>
  );
}
