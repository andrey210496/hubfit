import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  QrCode, 
  FileText, 
  Loader2, 
  Copy, 
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AsaasChargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberPaymentId?: string;
  contactData: {
    name: string;
    email?: string | null;
    cpf?: string | null;
    number?: string | null;
  };
  amount: number;
  dueDate: string;
  description?: string;
  onSuccess?: () => void;
}

interface PaymentResult {
  id: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  status: string;
}

export function AsaasChargeDialog({
  open,
  onOpenChange,
  memberId,
  memberPaymentId,
  contactData,
  amount,
  dueDate,
  description,
  onSuccess,
}: AsaasChargeDialogProps) {
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [cpf, setCpf] = useState(contactData.cpf || '');
  const [email, setEmail] = useState(contactData.email || '');
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [asaasConfigured, setAsaasConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (open) {
      checkAsaasConfig();
      setCpf(contactData.cpf || '');
      setEmail(contactData.email || '');
      setPaymentResult(null);
    }
  }, [open, contactData]);

  const checkAsaasConfig = async () => {
    try {
      // Get company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);

        // Check if Asaas is configured for this company
        const { data: config } = await supabase
          .from('asaas_company_config')
          .select('wallet_id, is_active')
          .eq('company_id', profile.company_id)
          .maybeSingle();

        const { data: platformConfig } = await supabase.functions.invoke('asaas-gateway', {
          body: { action: 'get_config' },
        });

        const isConfigured = Boolean(
          platformConfig?.configured && 
          platformConfig?.isActive
        );
        
        setAsaasConfigured(isConfigured);
      }
    } catch (error) {
      console.error('Error checking Asaas config:', error);
      setAsaasConfigured(false);
    }
  };

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return numbers
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
  };

  const handleCPFChange = (value: string) => {
    setCpf(formatCPF(value));
  };

  const cleanCPF = (cpf: string) => cpf.replace(/\D/g, '');

  const createCharge = async () => {
    if (!cpf || cleanCPF(cpf).length < 11) {
      toast.error('CPF/CNPJ é obrigatório');
      return;
    }

    if (!companyId) {
      toast.error('Erro ao identificar empresa');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('asaas-gateway', {
        body: {
          action: 'create_payment',
          companyId,
          memberId,
          memberPaymentId,
          customerData: {
            name: contactData.name,
            email: email || undefined,
            cpfCnpj: cleanCPF(cpf),
            phone: contactData.number?.replace(/\D/g, '') || undefined,
          },
          payment: {
            billingType,
            value: amount,
            dueDate: format(new Date(dueDate), 'yyyy-MM-dd'),
            description: description || `Cobrança - ${contactData.name}`,
          },
        },
      });

      if (error) throw new Error(error.message);

      if (data?.success) {
        setPaymentResult(data.payment);
        toast.success('Cobrança gerada com sucesso!');
        onSuccess?.();
      } else {
        throw new Error(data?.error || 'Erro ao criar cobrança');
      }
    } catch (error) {
      console.error('Error creating charge:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar cobrança');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Código copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerar Cobrança Online
          </DialogTitle>
          <DialogDescription>
            Envie uma cobrança para o cliente via PIX, Boleto ou Cartão
          </DialogDescription>
        </DialogHeader>

        {asaasConfigured === false ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A integração com o gateway de pagamento não está configurada. 
              Configure em Configurações → Integração Asaas.
            </AlertDescription>
          </Alert>
        ) : paymentResult ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Cobrança gerada com sucesso!
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant="secondary">{paymentResult.status}</Badge>
              </div>
            </div>

            {billingType === 'PIX' && paymentResult.pixQrCode && (
              <div className="space-y-3">
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${paymentResult.pixQrCode}`} 
                    alt="QR Code PIX" 
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
                {paymentResult.pixCopyPaste && (
                  <div className="flex gap-2">
                    <Input 
                      value={paymentResult.pixCopyPaste} 
                      readOnly 
                      className="text-xs font-mono"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => copyToClipboard(paymentResult.pixCopyPaste!)}
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {billingType === 'BOLETO' && paymentResult.bankSlipUrl && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(paymentResult.bankSlipUrl, '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Visualizar Boleto
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            )}

            {paymentResult.invoiceUrl && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => window.open(paymentResult.invoiceUrl, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver Fatura Completa
              </Button>
            )}

            <Button 
              className="w-full" 
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Payment Info Summary */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Cliente</span>
                <span className="font-medium">{contactData.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className="font-semibold text-lg">{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Vencimento</span>
                <span>{format(new Date(dueDate), 'dd/MM/yyyy')}</span>
              </div>
            </div>

            {/* Billing Type Selection */}
            <Tabs value={billingType} onValueChange={(v) => setBillingType(v as typeof billingType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="PIX" className="gap-1">
                  <QrCode className="h-4 w-4" />
                  PIX
                </TabsTrigger>
                <TabsTrigger value="BOLETO" className="gap-1">
                  <FileText className="h-4 w-4" />
                  Boleto
                </TabsTrigger>
                <TabsTrigger value="CREDIT_CARD" className="gap-1">
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </TabsTrigger>
              </TabsList>

              <TabsContent value="PIX" className="mt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O QR Code PIX será gerado automaticamente. O cliente pode pagar escaneando ou copiando o código.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="BOLETO" className="mt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O boleto será gerado e pode ser enviado por e-mail ou impresso para o cliente.
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="CREDIT_CARD" className="mt-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O cliente receberá um link de pagamento seguro por e-mail para inserir os dados do cartão.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>

            {/* Customer Data */}
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>CPF/CNPJ *</Label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => handleCPFChange(e.target.value)}
                  maxLength={18}
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="cliente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O cliente receberá a cobrança neste e-mail
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1"
                onClick={createCharge}
                disabled={loading || !cpf}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    Gerar Cobrança
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
