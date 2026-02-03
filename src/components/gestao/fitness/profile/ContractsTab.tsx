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
  DialogFooter,
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
import { 
  Plus, 
  FileText, 
  Calendar, 
  XCircle,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  useClientContracts, 
  getContractStatusLabel, 
  getContractStatusColor,
} from '@/hooks/useClientContracts';
import { useFitnessPlans, getPeriodLabel } from '@/hooks/useFitnessPlans';

interface ContractsTabProps {
  memberId: string;
}

export function ContractsTab({ memberId }: ContractsTabProps) {
  const { contracts, activeContract, isLoading, createContract, updateContract, cancelContract } = useClientContracts(memberId);
  const { plans } = useFitnessPlans();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  
  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentDay, setPaymentDay] = useState('10');
  const [notes, setNotes] = useState('');

  const activePlans = plans.filter(p => p.is_active);

  const handleSubmit = async () => {
    if (!selectedPlanId) return;

    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return;

    await createContract.mutateAsync({
      member_id: memberId,
      fitness_plan_id: selectedPlanId,
      start_date: startDate,
      price: plan.price,
      payment_day: parseInt(paymentDay),
      notes: notes || undefined,
    });

    setSelectedPlanId('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setPaymentDay('10');
    setNotes('');
    setIsDialogOpen(false);
  };

  const handleCancel = async () => {
    if (!selectedContractId || !cancelReason) return;

    await cancelContract.mutateAsync({
      id: selectedContractId,
      reason: cancelReason,
    });

    setCancelReason('');
    setSelectedContractId('');
    setIsCancelDialogOpen(false);
  };

  const handlePauseResume = async (contractId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
    await updateContract.mutateAsync({
      id: contractId,
      status: newStatus,
    });
  };

  const openCancelDialog = (contractId: string) => {
    setSelectedContractId(contractId);
    setIsCancelDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Active Contract Summary */}
      {activeContract && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <FileText className="h-5 w-5" />
              Contrato Ativo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Plano</p>
                <p className="font-medium">{activeContract.fitness_plan?.name || '--'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Período</p>
                <p className="font-medium">
                  {activeContract.fitness_plan?.period 
                    ? getPeriodLabel(activeContract.fitness_plan.period as any) 
                    : '--'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(activeContract.price)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Validade</p>
                <p className="font-medium">
                  {activeContract.end_date 
                    ? format(parseISO(activeContract.end_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '--'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handlePauseResume(activeContract.id, activeContract.status)}
              >
                <PauseCircle className="h-4 w-4 mr-1" />
                Pausar
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                className="text-red-500 hover:text-red-600"
                onClick={() => openCancelDialog(activeContract.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contracts Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Contratos
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Contrato
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Contrato</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Plano *</Label>
                  <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - {getPeriodLabel(plan.period)} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Início *</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dia de Vencimento</Label>
                    <Select value={paymentDay} onValueChange={setPaymentDay}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={String(day)}>
                            Dia {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observações do contrato"
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!selectedPlanId || createContract.isPending}
                >
                  {createContract.isPending ? 'Salvando...' : 'Criar Contrato'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum contrato encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plano</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>{contract.fitness_plan?.name || '--'}</TableCell>
                    <TableCell>
                      {format(parseISO(contract.start_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {contract.end_date 
                        ? format(parseISO(contract.end_date), 'dd/MM/yyyy', { locale: ptBR })
                        : '--'}
                    </TableCell>
                    <TableCell>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.price)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getContractStatusColor(contract.status)}>
                        {getContractStatusLabel(contract.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(contract.status === 'active' || contract.status === 'paused') && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePauseResume(contract.id, contract.status)}
                            >
                              {contract.status === 'paused' ? (
                                <PlayCircle className="h-4 w-4" />
                              ) : (
                                <PauseCircle className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openCancelDialog(contract.id)}
                            >
                              <XCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Contrato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Motivo do Cancelamento *</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo do cancelamento"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancel}
              disabled={!cancelReason || cancelContract.isPending}
            >
              {cancelContract.isPending ? 'Cancelando...' : 'Confirmar Cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
