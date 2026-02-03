import { ExternalLink, Edit, Trash2, Play, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Webhook, WEBHOOK_EVENTS } from '@/hooks/useWebhooks';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

interface WebhooksListProps {
  webhooks: Webhook[];
  loading: boolean;
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => Promise<boolean>;
  onToggle: (id: string, isActive: boolean) => Promise<boolean>;
  onTest: (webhook: Webhook) => Promise<boolean>;
}

export function WebhooksList({ webhooks, loading, onEdit, onDelete, onToggle, onTest }: WebhooksListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const handleDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  const handleTest = async (webhook: Webhook) => {
    setTesting(webhook.id);
    await onTest(webhook);
    setTesting(null);
  };

  const getEventLabel = (event: string) => {
    return WEBHOOK_EVENTS.find(e => e.value === event)?.label || event;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (webhooks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ExternalLink className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum webhook configurado</h3>
          <p className="text-muted-foreground text-center">
            Configure webhooks para enviar eventos para sistemas externos em tempo real.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {webhooks.map((webhook) => (
          <Card key={webhook.id} className={!webhook.is_active ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-3">
                <Switch
                  checked={webhook.is_active}
                  onCheckedChange={(checked) => onToggle(webhook.id, checked)}
                />
                <CardTitle className="text-base font-semibold">{webhook.name}</CardTitle>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleTest(webhook)} disabled={testing === webhook.id}>
                    <Play className="mr-2 h-4 w-4" />
                    {testing === webhook.id ? 'Testando...' : 'Testar'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(webhook)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setDeleteId(webhook.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">URL:</span>
                  <code className="bg-muted px-2 py-0.5 rounded text-xs truncate max-w-[400px]">
                    {webhook.url}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <span className="text-muted-foreground">Eventos:</span>
                  {webhook.events.map((event) => (
                    <Badge key={event} variant="secondary" className="text-xs">
                      {getEventLabel(event)}
                    </Badge>
                  ))}
                </div>
                {webhook.secret && (
                  <div className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-xs">
                      Assinatura HMAC ativa
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O webhook será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
