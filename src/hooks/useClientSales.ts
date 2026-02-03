import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type SaleType = 'plan' | 'product' | 'service' | 'other';
export type SaleStatus = 'pending' | 'paid' | 'cancelled' | 'refunded';

export interface ClientSale {
  id: string;
  company_id: string;
  member_id: string;
  contract_id: string | null;
  sale_type: SaleType;
  description: string;
  amount: number;
  discount: number;
  total: number;
  payment_method: string | null;
  status: SaleStatus;
  sold_by: string | null;
  sold_at: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  seller?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateSaleData {
  member_id: string;
  contract_id?: string;
  sale_type: SaleType;
  description: string;
  amount: number;
  discount?: number;
  total: number;
  payment_method?: string;
  status?: SaleStatus;
  notes?: string;
}

export function useClientSales(memberId?: string) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading, error } = useQuery({
    queryKey: ['client-sales', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      
      const { data, error } = await supabase
        .from('client_sales')
        .select(`
          *,
          seller:profiles!client_sales_sold_by_fkey(id, name)
        `)
        .eq('member_id', memberId)
        .order('sold_at', { ascending: false });

      if (error) throw error;
      return data as ClientSale[];
    },
    enabled: !!memberId,
  });

  const createSale = useMutation({
    mutationFn: async (saleData: CreateSaleData) => {
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('client_sales')
        .insert({
          ...saleData,
          company_id: profile.company_id,
          sold_by: profile.id,
        })
        .select(`
          *,
          seller:profiles!client_sales_sold_by_fkey(id, name)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-sales'] });
      toast.success('Venda registrada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar venda: ' + error.message);
    },
  });

  const updateSale = useMutation({
    mutationFn: async ({ id, ...saleData }: Partial<ClientSale> & { id: string }) => {
      const { data, error } = await supabase
        .from('client_sales')
        .update(saleData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-sales'] });
      toast.success('Venda atualizada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar venda: ' + error.message);
    },
  });

  const totalPaid = sales
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + Number(s.total), 0);

  const totalPending = sales
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + Number(s.total), 0);

  return {
    sales,
    isLoading,
    error,
    createSale,
    updateSale,
    totalPaid,
    totalPending,
  };
}

export function getSaleTypeLabel(type: SaleType): string {
  const labels: Record<SaleType, string> = {
    plan: 'Plano',
    product: 'Produto',
    service: 'Serviço',
    other: 'Outro',
  };
  return labels[type];
}

export function getSaleStatusLabel(status: SaleStatus): string {
  const labels: Record<SaleStatus, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    cancelled: 'Cancelado',
    refunded: 'Reembolsado',
  };
  return labels[status];
}

export function getSaleStatusColor(status: SaleStatus): string {
  const colors: Record<SaleStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    paid: 'bg-green-500/20 text-green-400',
    cancelled: 'bg-red-500/20 text-red-400',
    refunded: 'bg-blue-500/20 text-blue-400',
  };
  return colors[status];
}

export function getPaymentMethodLabel(method: string | null): string {
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
}
