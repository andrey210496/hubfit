import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, ShoppingCart, DollarSign, Package, Settings, Unlock, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useClientSales, 
  getSaleTypeLabel, 
  getSaleStatusLabel, 
  getSaleStatusColor,
  getPaymentMethodLabel,
  type SaleType,
  type SaleStatus,
} from '@/hooks/useClientSales';
import { useFitnessPlans } from '@/hooks/useFitnessPlans';
import { useClientContracts } from '@/hooks/useClientContracts';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type RecurrenceType = 'one_time' | 'recurring';

interface SalesTabProps {
  memberId: string;
}

export function SalesTab({ memberId }: SalesTabProps) {
  const { sales, isLoading, createSale, totalPaid, totalPending } = useClientSales(memberId);
  const { plans } = useFitnessPlans();
  const { createContract } = useClientContracts(memberId);
  const { activePaymentMethods, hasNoMethods, isLoading: loadingMethods } = usePaymentMethods();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType | null>(null);
  const [saleType, setSaleType] = useState<SaleType>('plan');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const activePlans = plans.filter(p => p.is_active);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      setDescription(plan.name);
      setAmount(String(plan.price));
    }
  };

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0;
    const discountNum = parseFloat(discount) || 0;
    return Math.max(0, amountNum - discountNum);
  };

  const handleSubmit = async () => {
    if (!description || !amount) return;

    const total = calculateTotal();

    // Create sale
    const sale = await createSale.mutateAsync({
      member_id: memberId,
      sale_type: saleType,
      description,
      amount: parseFloat(amount),
      discount: parseFloat(discount) || 0,
      total,
      payment_method: paymentMethod || undefined,
      status: paymentMethod ? 'paid' : 'pending',
      notes: notes || undefined,
    });

    // If it's a plan sale, also create a contract
    if (saleType === 'plan' && selectedPlanId) {
      await createContract.mutateAsync({
        member_id: memberId,
        fitness_plan_id: selectedPlanId,
        price: total,
        payment_day: 10,
      });
    }

    // Reset form
    resetForm();
    setIsDialogOpen(false);
  };

  const resetForm = () => {
    setRecurrenceType(null);
    setSaleType('plan');
    setSelectedPlanId('');
    setDescription('');
    setAmount('');
    setDiscount('0');
    setPaymentMethod('');
    setNotes('');
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Recebido</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaid)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pendente</p>
              <p className="text-lg font-semibold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPending)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Vendas</p>
              <p className="text-lg font-semibold">{sales.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Histórico de Vendas
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Venda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Venda</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                {/* Recurrence Selection */}
                <div className="space-y-2">
                  <Label>Escolha o tipo de venda você deseja realizar</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRecurrenceType('one_time')}
                      className={cn(
                        "p-4 border rounded-lg text-center transition-all hover:border-primary/50",
                        recurrenceType === 'one_time' 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border"
                      )}
                    >
                      <Unlock className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium text-sm">Sem recorrência</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Venda de contratos sem recorrência, produtos e serviços.
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecurrenceType('recurring')}
                      className={cn(
                        "p-4 border rounded-lg text-center transition-all hover:border-primary/50",
                        recurrenceType === 'recurring' 
                          ? "border-primary bg-primary/5 ring-1 ring-primary" 
                          : "border-border"
                      )}
                    >
                      <RefreshCw className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium text-sm">Com recorrência</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Não afeta o limite do cartão e pode ser renovado automaticamente.
                      </p>
                    </button>
                  </div>
                </div>

                {recurrenceType && (
                  <>
                    <div className="space-y-2">
                      <Label>Tipo de Venda</Label>
                      <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="plan">Plano</SelectItem>
                          <SelectItem value="product">Produto</SelectItem>
                          <SelectItem value="service">Serviço</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                {saleType === 'plan' && (
                  <div className="space-y-2">
                    <Label>Selecionar Plano</Label>
                    <Select value={selectedPlanId} onValueChange={handleSelectPlan}>
                      <SelectTrigger>
                        <SelectValue placeholder="Escolha um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descrição da venda"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Desconto</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Total a Pagar</p>
                  <p className="text-xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  {hasNoMethods ? (
                    <div className="p-3 bg-muted rounded-lg text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Nenhum método de pagamento configurado
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
                        <SelectValue placeholder="Selecione (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {activePaymentMethods.map((method) => (
                          <SelectItem key={method.id} value={method.code}>
                            {method.name}
                            {method.accepts_installments && ` (até ${method.max_installments}x)`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações da venda"
                  />
                </div>

                    <Button 
                      className="w-full" 
                      onClick={handleSubmit}
                      disabled={!description || !amount || createSale.isPending}
                    >
                      {createSale.isPending ? 'Salvando...' : 'Registrar Venda'}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma venda registrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      {format(parseISO(sale.sold_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getSaleTypeLabel(sale.sale_type)}</Badge>
                    </TableCell>
                    <TableCell>{sale.description}</TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sale.total)}
                    </TableCell>
                    <TableCell>{getPaymentMethodLabel(sale.payment_method)}</TableCell>
                    <TableCell>
                      <Badge className={getSaleStatusColor(sale.status)}>
                        {getSaleStatusLabel(sale.status)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
