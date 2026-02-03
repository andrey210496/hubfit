import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle2,
  Clock,
  CreditCard,
  Receipt,
  Zap,
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { AsaasChargeDialog } from './AsaasChargeDialog';

interface FinanceTabProps {
  memberId: string;
  contactData?: {
    name: string;
    email?: string | null;
    cpf?: string | null;
    number?: string | null;
  };
}

interface Payment {
  id: string;
  member_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: string;
  payment_method: string | null;
  notes: string | null;
  fitness_plan?: {
    name: string;
  } | null;
}

export function FinanceTab({ memberId, contactData }: FinanceTabProps) {
  const queryClient = useQueryClient();
  const { activePaymentMethods, hasNoMethods } = usePaymentMethods();
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isAsaasDialogOpen, setIsAsaasDialogOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['member-payments', memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('member_payments')
        .select(`
          *,
          fitness_plan:fitness_plans(name)
        `)
        .eq('member_id', memberId)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!memberId,
  });

  // Mark as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const { data, error } = await supabase
        .from('member_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: method,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
      toast.success('Pagamento registrado com sucesso!');
      setIsPaymentDialogOpen(false);
      setSelectedPaymentId('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });

  // Calculate summary values
  const today = startOfDay(new Date());
  
  const overduePayments = payments.filter(
    p => p.status === 'pending' && isBefore(parseISO(p.due_date), today)
  );
  const overdueAmount = overduePayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingPayments = payments.filter(
    p => p.status === 'pending' && !isBefore(parseISO(p.due_date), today)
  );
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const paidPayments = payments.filter(p => p.status === 'paid');
  const paidAmount = paidPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const openPaymentDialog = (paymentId: string) => {
    setSelectedPaymentId(paymentId);
    setIsPaymentDialogOpen(true);
  };

  const openAsaasDialog = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsAsaasDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedPaymentId) return;
    markAsPaid.mutate({ id: selectedPaymentId, method: paymentMethod });
  };

  const getStatusInfo = (payment: Payment) => {
    if (payment.status === 'paid') {
      return { label: 'Pago', color: 'bg-green-500/20 text-green-400', icon: CheckCircle2 };
    }
    if (isBefore(parseISO(payment.due_date), today)) {
      return { label: 'Em Atraso', color: 'bg-red-500/20 text-red-400', icon: AlertCircle };
    }
    return { label: 'Pendente', color: 'bg-yellow-500/20 text-yellow-400', icon: Clock };
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return '--';
    const labels: Record<string, string> = {
      cash: 'Dinheiro',
      credit_card: 'Cartão de Crédito',
      debit_card: 'Cartão de Débito',
      pix: 'PIX',
      bank_transfer: 'Transferência',
      boleto: 'Boleto',
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={overdueAmount > 0 ? 'border-red-500/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Atraso</p>
              <p className="text-lg font-semibold text-red-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueAmount)}
              </p>
              <p className="text-xs text-muted-foreground">{overduePayments.length} parcela(s)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">A Vencer</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingAmount)}
              </p>
              <p className="text-xs text-muted-foreground">{pendingPayments.length} parcela(s)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pago</p>
              <p className="text-lg font-semibold text-green-500">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paidAmount)}
              </p>
              <p className="text-xs text-muted-foreground">{paidPayments.length} pagamento(s)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Receipt className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Devedor</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(overdueAmount + pendingAmount)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum pagamento encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const statusInfo = getStatusInfo(payment);
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(parseISO(payment.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {payment.fitness_plan?.name || 'Mensalidade'}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusInfo.color} gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.paid_at ? (
                          <div>
                            <p className="text-sm">{getPaymentMethodLabel(payment.payment_method)}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(payment.paid_at), 'dd/MM/yyyy', { locale: ptBR })}
                            </p>
                          </div>
                        ) : (
                          '--'
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.status !== 'paid' && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPaymentDialog(payment.id)}
                              title="Registrar pagamento manual"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Manual
                            </Button>
                            {contactData && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => openAsaasDialog(payment)}
                                title="Gerar cobrança online (PIX, Boleto, Cartão)"
                              >
                                <Zap className="h-4 w-4 mr-1" />
                                Online
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              {hasNoMethods ? (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Nenhum método configurado
                  </p>
                  <Link to="/gestao/fitness/configuracoes">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Settings className="h-3 w-3" />
                      Configurar
                    </Button>
                  </Link>
                </div>
              ) : (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePaymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.code}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleConfirmPayment}
                disabled={markAsPaid.isPending}
              >
                {markAsPaid.isPending ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asaas Charge Dialog */}
      {contactData && selectedPayment && (
        <AsaasChargeDialog
          open={isAsaasDialogOpen}
          onOpenChange={setIsAsaasDialogOpen}
          memberId={memberId}
          memberPaymentId={selectedPayment.id}
          contactData={contactData}
          amount={Number(selectedPayment.amount)}
          dueDate={selectedPayment.due_date}
          description={selectedPayment.fitness_plan?.name || 'Mensalidade'}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['member-payments', memberId] });
          }}
        />
      )}
    </div>
  );
}
