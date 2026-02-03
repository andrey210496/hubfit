import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhooksList } from './WebhooksList';
import { WebhookForm } from './WebhookForm';
import { WebhookLogs } from './WebhookLogs';
import { WebhookEndpoints } from './WebhookEndpoints';
import { useAuth } from '@/hooks/useAuth';

export function WebhooksPage() {
  const { profile } = useAuth();
  const { webhooks, logs, loading, logsLoading, fetchLogs, createWebhook, updateWebhook, deleteWebhook, testWebhook } = useWebhooks();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<typeof webhooks[0] | null>(null);
  const [activeTab, setActiveTab] = useState('webhooks');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'logs') {
      fetchLogs();
    }
  };

  const handleEdit = (webhook: typeof webhooks[0]) => {
    setEditingWebhook(webhook);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingWebhook(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-muted-foreground">
            Configure webhooks para integrar com sistemas externos
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Webhook
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="webhooks">Configurações</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="webhooks" className="flex-1 p-4">
          <WebhooksList
            webhooks={webhooks}
            loading={loading}
            onEdit={handleEdit}
            onDelete={deleteWebhook}
            onToggle={(id, isActive) => updateWebhook(id, { is_active: isActive })}
            onTest={testWebhook}
          />
        </TabsContent>

        <TabsContent value="endpoints" className="flex-1 p-4">
          <WebhookEndpoints companyId={profile?.company_id || ''} />
        </TabsContent>

        <TabsContent value="logs" className="flex-1 p-4">
          <WebhookLogs 
            logs={logs} 
            loading={logsLoading} 
            webhooks={webhooks}
            onRefresh={() => fetchLogs()}
          />
        </TabsContent>
      </Tabs>

      <WebhookForm
        open={isFormOpen}
        onClose={handleFormClose}
        webhook={editingWebhook}
        onSave={async (data) => {
          if (editingWebhook) {
            await updateWebhook(editingWebhook.id, data);
          } else {
            await createWebhook({
              name: data.name,
              url: data.url,
              secret: data.secret || null,
              events: data.events,
              is_active: data.is_active,
              headers: data.headers || null,
            });
          }
          handleFormClose();
        }}
      />
    </div>
  );
}
