import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PaymentMethod {
  id: string;
  company_id: string;
  name: string;
  code: string;
  icon: string;
  is_active: boolean;
  accepts_installments: boolean;
  max_installments: number;
  fee_percentage: number;
  order_num: number;
  installment_fees: number[];
  credit_card_type: 'machine' | 'recurring' | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentMethodData {
  name: string;
  code: string;
  icon?: string;
  is_active?: boolean;
  accepts_installments?: boolean;
  max_installments?: number;
  fee_percentage?: number;
  order_num?: number;
  installment_fees?: number[];
  credit_card_type?: 'machine' | 'recurring' | null;
}

const DEFAULT_INSTALLMENT_FEES = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // 12 parcelas

const DEFAULT_PAYMENT_METHODS: Omit<CreatePaymentMethodData, 'order_num'>[] = [
  { name: 'PIX', code: 'pix', icon: 'qr-code' },
  { name: 'Cartão de Crédito (Máquina)', code: 'credit_card_machine', icon: 'credit-card', accepts_installments: true, max_installments: 12, credit_card_type: 'machine', installment_fees: DEFAULT_INSTALLMENT_FEES },
  { name: 'Cartão de Crédito (Recorrente)', code: 'credit_card_recurring', icon: 'credit-card', accepts_installments: true, max_installments: 12, credit_card_type: 'recurring', installment_fees: DEFAULT_INSTALLMENT_FEES },
  { name: 'Cartão de Débito', code: 'debit_card', icon: 'credit-card' },
  { name: 'Dinheiro', code: 'cash', icon: 'banknote' },
  { name: 'Boleto', code: 'boleto', icon: 'file-text' },
  { name: 'Transferência Bancária', code: 'bank_transfer', icon: 'building-2' },
];

export function usePaymentMethods() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: paymentMethods = [], isLoading, error } = useQuery({
    queryKey: ['payment-methods', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('order_num', { ascending: true });

      if (error) throw error;
      return data as PaymentMethod[];
    },
    enabled: !!profile?.company_id,
  });

  const activePaymentMethods = paymentMethods.filter(pm => pm.is_active);

  const createPaymentMethod = useMutation({
    mutationFn: async (methodData: CreatePaymentMethodData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          ...methodData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pagamento criado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar método: ' + error.message);
    },
  });

  const updatePaymentMethod = useMutation({
    mutationFn: async ({ id, ...methodData }: Partial<PaymentMethod> & { id: string }) => {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(methodData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pagamento atualizado!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar método: ' + error.message);
    },
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Método de pagamento removido!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover método: ' + error.message);
    },
  });

  const initializeDefaultMethods = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const methodsToInsert = DEFAULT_PAYMENT_METHODS.map((method, index) => ({
        ...method,
        company_id: profile.company_id,
        order_num: index,
      }));

      const { data, error } = await supabase
        .from('payment_methods')
        .insert(methodsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast.success('Métodos de pagamento padrão criados!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar métodos padrão: ' + error.message);
    },
  });

  return {
    paymentMethods,
    activePaymentMethods,
    isLoading,
    error,
    createPaymentMethod,
    updatePaymentMethod,
    deletePaymentMethod,
    initializeDefaultMethods,
    hasNoMethods: paymentMethods.length === 0,
  };
}

export function getPaymentMethodIcon(code: string): string {
  const icons: Record<string, string> = {
    pix: 'qr-code',
    credit_card: 'credit-card',
    debit_card: 'credit-card',
    cash: 'banknote',
    boleto: 'file-text',
    bank_transfer: 'building-2',
  };
  return icons[code] || 'credit-card';
}
