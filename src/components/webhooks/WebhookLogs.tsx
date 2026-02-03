import { RefreshCw, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { WebhookLog, Webhook } from '@/hooks/useWebhooks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface WebhookLogsProps {
  logs: WebhookLog[];
  loading: boolean;
  webhooks: Webhook[];
  onRefresh: () => void;
}

export function WebhookLogs({ logs, loading, webhooks, onRefresh }: WebhookLogsProps) {
  const [selectedLog, setSelectedLog] = useState<WebhookLog | null>(null);

  const getWebhookName = (webhookId: string | null) => {
    if (!webhookId) return 'Sistema';
    return webhooks.find(w => w.id === webhookId)?.name || 'Desconhecido';
  };

  const getStatusBadge = (status: number | null, error: string | null) => {
    if (error) {
      return <Badge variant="destructive">Erro</Badge>;
    }
    if (status === null) {
      return <Badge variant="secondary">Pendente</Badge>;
    }
    if (status >= 200 && status < 300) {
      return <Badge variant="default" className="bg-green-500">Sucesso</Badge>;
    }
    return <Badge variant="destructive">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Últimas {logs.length} execuções de webhooks
          </p>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum log encontrado</h3>
            <p className="text-muted-foreground">
              Os logs aparecerão aqui quando webhooks forem disparados.
            </p>
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Webhook</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {getStatusBadge(log.response_status, log.error_message)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {getWebhookName(log.webhook_id)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.event_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedLog.response_status, selectedLog.error_message)}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Duração</label>
                    <p>{selectedLog.duration_ms ? `${selectedLog.duration_ms}ms` : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Evento</label>
                    <p>{selectedLog.event_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data</label>
                    <p>{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                  </div>
                </div>

                {selectedLog.error_message && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Erro</label>
                    <pre className="mt-1 p-3 bg-destructive/10 text-destructive rounded-lg text-sm overflow-auto">
                      {selectedLog.error_message}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payload Enviado</label>
                  <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto">
                    {JSON.stringify(selectedLog.payload, null, 2)}
                  </pre>
                </div>

                {selectedLog.response_body && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Resposta</label>
                    <pre className="mt-1 p-3 bg-muted rounded-lg text-sm overflow-auto max-h-[200px]">
                      {selectedLog.response_body}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
