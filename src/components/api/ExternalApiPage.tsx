import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, FileCode, Activity } from 'lucide-react';
import { ApiTokensList } from './ApiTokensList';
import { ApiDocumentation } from './ApiDocumentation';
import { ApiLogs } from './ApiLogs';

export function ExternalApiPage() {
  const [activeTab, setActiveTab] = useState('tokens');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">API Externa</h1>
        <p className="text-muted-foreground">
          Gerencie tokens de acesso e integre com sistemas externos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tokens" className="gap-2">
            <Key className="h-4 w-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <FileCode className="h-4 w-4" />
            Documentação
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <Activity className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="mt-6">
          <ApiTokensList />
        </TabsContent>

        <TabsContent value="docs" className="mt-6">
          <ApiDocumentation />
        </TabsContent>

        <TabsContent value="logs" className="mt-6">
          <ApiLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
