import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Loader2, Eye } from 'lucide-react';
import { useApiTokens, ApiLog } from '@/hooks/useApiTokens';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-500',
  POST: 'bg-blue-500/10 text-blue-500',
  PUT: 'bg-amber-500/10 text-amber-500',
  DELETE: 'bg-red-500/10 text-red-500',
};

const statusColors = (status: number | null) => {
  if (!status) return 'bg-gray-500/10 text-gray-500';
  if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-500';
  if (status >= 400 && status < 500) return 'bg-amber-500/10 text-amber-500';
  if (status >= 500) return 'bg-red-500/10 text-red-500';
  return 'bg-gray-500/10 text-gray-500';
};

export function ApiLogs() {
  const { tokens, logs, logsLoading, fetchLogs } = useApiTokens();
  const [selectedToken, setSelectedToken] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  useEffect(() => {
    fetchLogs(selectedToken === 'all' ? undefined : selectedToken);
  }, [selectedToken, fetchLogs]);

  const handleRefresh = () => {
    fetchLogs(selectedToken === 'all' ? undefined : selectedToken);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Logs de API</CardTitle>
            <CardDescription>
              Histórico de requisições à API externa
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedToken} onValueChange={setSelectedToken}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por token" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tokens</SelectItem>
                {tokens.map((token) => (
                  <SelectItem key={token.id} value={token.id}>
                    {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum log encontrado.</p>
              <p className="text-sm">As requisições à API aparecerão aqui.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={methodColors[log.method] || ''}>
                        {log.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.endpoint}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors(log.response_status)}>
                        {log.response_status || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.duration_ms ? `${log.duration_ms}ms` : '-'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedLog(log)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Requisição</DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                  <p className="text-sm">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Duração</p>
                  <p className="text-sm">{selectedLog.duration_ms}ms</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">IP</p>
                  <p className="text-sm">{selectedLog.ip_address || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant="outline" className={statusColors(selectedLog.response_status)}>
                    {selectedLog.response_status}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Endpoint</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={methodColors[selectedLog.method] || ''}>
                    {selectedLog.method}
                  </Badge>
                  <code className="text-sm">{selectedLog.endpoint}</code>
                </div>
              </div>

              {selectedLog.request_body && Object.keys(selectedLog.request_body).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Request Body</p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.response_body && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Response Body</p>
                  <pre className="bg-muted p-3 rounded text-sm overflow-x-auto max-h-[200px]">
                    {JSON.stringify(selectedLog.response_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.user_agent && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">User Agent</p>
                  <p className="text-sm text-muted-foreground break-all">{selectedLog.user_agent}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
