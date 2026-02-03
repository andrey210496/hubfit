import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Loader2, 
  RefreshCw,
  Phone,
  Mail,
  DollarSign
} from 'lucide-react';
import { useOverdueInvoices } from '@/hooks/useOverdueInvoices';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function OverdueInvoicesAlert() {
  const { invoices, stats, loading, refetch } = useOverdueInvoices();

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue > 30) {
      return <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> Crítico ({daysOverdue}d)</Badge>;
    } else if (daysOverdue > 15) {
      return <Badge className="bg-orange-500 gap-1"><AlertCircle className="h-3 w-3" /> Alerta ({daysOverdue}d)</Badge>;
    } else {
      return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Atenção ({daysOverdue}d)</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (stats.total === 0) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-3 py-6">
          <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
            <DollarSign className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-green-700 dark:text-green-400">Tudo em dia!</p>
            <p className="text-sm text-green-600 dark:text-green-500">Não há faturas vencidas no momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-red-600 dark:text-red-400">
                Faturas Vencidas ({stats.total})
              </CardTitle>
              <CardDescription>
                Total pendente: {formatCurrency(stats.totalValue)}
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Summary */}
        <div className="grid gap-2 grid-cols-3">
          {stats.critical > 0 && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-sm">Crítico</AlertTitle>
              <AlertDescription className="text-xs">
                {stats.critical} fatura{stats.critical > 1 ? 's' : ''} {'>'}30 dias
              </AlertDescription>
            </Alert>
          )}
          {stats.warning > 0 && (
            <Alert className="py-2 border-orange-500 text-orange-700 dark:text-orange-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm">Alerta</AlertTitle>
              <AlertDescription className="text-xs">
                {stats.warning} fatura{stats.warning > 1 ? 's' : ''} 15-30 dias
              </AlertDescription>
            </Alert>
          )}
          {stats.attention > 0 && (
            <Alert className="py-2">
              <Clock className="h-4 w-4" />
              <AlertTitle className="text-sm">Atenção</AlertTitle>
              <AlertDescription className="text-xs">
                {stats.attention} fatura{stats.attention > 1 ? 's' : ''} {'<'}15 dias
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Invoices Table */}
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id} className={invoice.days_overdue > 30 ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                  <TableCell className="font-medium">{invoice.company?.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {invoice.company?.email && (
                        <a href={`mailto:${invoice.company.email}`} className="flex items-center gap-1 hover:text-primary">
                          <Mail className="h-3 w-3" />
                          {invoice.company.email}
                        </a>
                      )}
                      {invoice.company?.phone && (
                        <a href={`tel:${invoice.company.phone}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" />
                          {invoice.company.phone}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-red-600">
                    {formatCurrency(invoice.value)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invoice.due_date)}
                  </TableCell>
                  <TableCell>
                    {getSeverityBadge(invoice.days_overdue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
