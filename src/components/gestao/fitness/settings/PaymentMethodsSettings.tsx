import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  CreditCard,
  Plus,
  Trash2,
  Edit,
  QrCode,
  Banknote,
  FileText,
  Building2,
  Loader2,
  Sparkles,
  GripVertical,
  Repeat,
  Smartphone,
} from 'lucide-react';
import { usePaymentMethods, PaymentMethod, CreatePaymentMethodData } from '@/hooks/usePaymentMethods';
import { ScrollArea } from '@/components/ui/scroll-area';

const ICON_OPTIONS = [
  { value: 'credit-card', label: 'Cartão', icon: CreditCard },
  { value: 'qr-code', label: 'QR Code', icon: QrCode },
  { value: 'banknote', label: 'Dinheiro', icon: Banknote },
  { value: 'file-text', label: 'Documento', icon: FileText },
  { value: 'building-2', label: 'Banco', icon: Building2 },
];

function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ElementType> = {
    'credit-card': CreditCard,
    'qr-code': QrCode,
    'banknote': Banknote,
    'file-text': FileText,
    'building-2': Building2,
  };
  return iconMap[iconName] || CreditCard;
}

const DEFAULT_INSTALLMENT_FEES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

interface FormData extends CreatePaymentMethodData {
  installment_fees: number[];
  credit_card_type: 'machine' | 'recurring' | null;
}

export function PaymentMethodsSettings() {
  const {
    paymentMethods,
    isLoading,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    initializeDefaultMethods,
    hasNoMethods,
  } = usePaymentMethods();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    code: '',
    icon: 'credit-card',
    is_active: true,
    accepts_installments: false,
    max_installments: 1,
    fee_percentage: 0,
    installment_fees: [...DEFAULT_INSTALLMENT_FEES],
    credit_card_type: null,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      icon: 'credit-card',
      is_active: true,
      accepts_installments: false,
      max_installments: 1,
      fee_percentage: 0,
      installment_fees: [...DEFAULT_INSTALLMENT_FEES],
      credit_card_type: null,
    });
    setEditingMethod(null);
  };

  const handleOpenDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingMethod(method);
      setFormData({
        name: method.name,
        code: method.code,
        icon: method.icon,
        is_active: method.is_active,
        accepts_installments: method.accepts_installments,
        max_installments: method.max_installments,
        fee_percentage: method.fee_percentage,
        installment_fees: method.installment_fees?.length === 12 
          ? [...method.installment_fees] 
          : [...DEFAULT_INSTALLMENT_FEES],
        credit_card_type: method.credit_card_type,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) return;

    const dataToSave = {
      ...formData,
      installment_fees: formData.credit_card_type ? formData.installment_fees : [],
    };

    if (editingMethod) {
      await updatePaymentMethod.mutateAsync({
        id: editingMethod.id,
        ...dataToSave,
      });
    } else {
      await createPaymentMethod.mutateAsync({
        ...dataToSave,
        order_num: paymentMethods.length,
      });
    }
    handleCloseDialog();
  };

  const handleToggleActive = async (method: PaymentMethod) => {
    await updatePaymentMethod.mutateAsync({
      id: method.id,
      is_active: !method.is_active,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este método de pagamento?')) {
      await deletePaymentMethod.mutateAsync(id);
    }
  };

  const handleInitializeDefaults = async () => {
    await initializeDefaultMethods.mutateAsync();
  };

  const handleInstallmentFeeChange = (index: number, value: number) => {
    const newFees = [...formData.installment_fees];
    newFees[index] = value;
    setFormData({ ...formData, installment_fees: newFees });
  };

  const isCreditCardType = formData.code.includes('credit_card') || formData.credit_card_type !== null;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Métodos de Pagamento</h3>
              <p className="text-sm text-muted-foreground">Configure as formas de pagamento aceitas</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          {hasNoMethods ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 rounded-xl border-2 border-dashed border-border/50 bg-gradient-to-b from-muted/30 to-transparent">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 border border-border/50 shadow-xl">
                  <CreditCard className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
              <h4 className="text-lg font-semibold mb-1">Nenhum método configurado</h4>
              <p className="text-muted-foreground text-center max-w-sm text-sm mb-6">
                Configure os métodos de pagamento aceitos para vendas e cobranças.
              </p>
              <div className="flex gap-2">
                <Button 
                  onClick={handleInitializeDefaults} 
                  disabled={initializeDefaultMethods.isPending}
                  className="gap-2 rounded-xl shadow-lg shadow-primary/20"
                >
                  {initializeDefaultMethods.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Criar Métodos Padrão
                </Button>
                <Button variant="outline" onClick={() => handleOpenDialog()} className="rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Personalizado
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {paymentMethods.map((method, index) => {
                  const IconComponent = getIconComponent(method.icon);
                  return (
                    <div
                      key={method.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card hover:border-border hover:shadow-md transition-all duration-200 group animate-fade-up"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="p-2.5 rounded-xl bg-primary/10">
                          <IconComponent className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{method.name}</span>
                            {method.credit_card_type === 'machine' && (
                              <Badge variant="secondary" className="text-xs rounded-lg gap-1">
                                <Smartphone className="h-3 w-3" />
                                Máquina
                              </Badge>
                            )}
                            {method.credit_card_type === 'recurring' && (
                              <Badge variant="secondary" className="text-xs rounded-lg gap-1">
                                <Repeat className="h-3 w-3" />
                                Recorrente
                              </Badge>
                            )}
                            {method.accepts_installments && !method.credit_card_type && (
                              <Badge variant="outline" className="text-xs rounded-lg">
                                Até {method.max_installments}x
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground font-mono">
                            {method.code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={method.is_active}
                          onCheckedChange={() => handleToggleActive(method)}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenDialog(method)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(method.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Método
              </Button>
            </>
          )}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingMethod ? 'Editar Método de Pagamento' : 'Novo Método de Pagamento'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes do método de pagamento
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Cartão de Crédito"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Código</Label>
                  <Input
                    placeholder="Ex: credit_card"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                    disabled={!!editingMethod}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {option.label}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Recebimento</Label>
                  {editingMethod?.credit_card_type ? (
                    <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted">
                      {editingMethod.credit_card_type === 'machine' ? (
                        <>
                          <Smartphone className="h-4 w-4" />
                          <span>Parcelado (Máquina)</span>
                        </>
                      ) : (
                        <>
                          <Repeat className="h-4 w-4" />
                          <span>Recorrente (Assinatura)</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <Select
                      value={formData.credit_card_type || 'none'}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        credit_card_type: value === 'none' ? null : value as 'machine' | 'recurring',
                        accepts_installments: value !== 'none',
                        max_installments: value !== 'none' ? 12 : 1,
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Não é cartão de crédito</SelectItem>
                        <SelectItem value="machine">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            Parcelado (Máquina)
                          </div>
                        </SelectItem>
                        <SelectItem value="recurring">
                          <div className="flex items-center gap-2">
                            <Repeat className="h-4 w-4" />
                            Recorrente (Assinatura)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {!isCreditCardType && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Aceita Parcelamento</Label>
                      <p className="text-xs text-muted-foreground">
                        Permite dividir o pagamento em parcelas
                      </p>
                    </div>
                    <Switch
                      checked={formData.accepts_installments}
                      onCheckedChange={(checked) => setFormData({ ...formData, accepts_installments: checked })}
                    />
                  </div>

                  {formData.accepts_installments && (
                    <div className="space-y-2">
                      <Label>Máximo de Parcelas</Label>
                      <Input
                        type="number"
                        min={1}
                        max={24}
                        value={formData.max_installments}
                        onChange={(e) => setFormData({ ...formData, max_installments: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Taxa (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="0"
                      value={formData.fee_percentage}
                      onChange={(e) => setFormData({ ...formData, fee_percentage: parseFloat(e.target.value) || 0 })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Taxa cobrada sobre o valor da venda
                    </p>
                  </div>
                </>
              )}

              {isCreditCardType && (
                <Card className="border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Taxas por Parcela
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure a taxa (%) para cada número de parcelas
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {formData.installment_fees.map((fee, index) => (
                        <div key={index} className="space-y-1">
                          <Label className="text-xs font-normal text-muted-foreground">
                            {index + 1}x
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              min={0}
                              step={0.01}
                              value={fee}
                              onChange={(e) => handleInstallmentFeeChange(index, parseFloat(e.target.value) || 0)}
                              className="pr-6 h-8 text-sm"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                              %
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between pt-2">
                <Label>Ativo</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || !formData.code || createPaymentMethod.isPending || updatePaymentMethod.isPending}
            >
              {(createPaymentMethod.isPending || updatePaymentMethod.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingMethod ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
