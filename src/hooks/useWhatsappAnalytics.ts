import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ConversationAnalytics {
  type: 'conversation';
  waba_id: string;
  analytics: any;
}

interface TemplateAnalytics {
  type: 'template';
  start_date: string;
  end_date: string;
  templates: Array<{
    template_id: string;
    template_name: string;
    sent: number;
    delivered: number;
    read: number;
    clicked: number;
    replied: number;
  }>;
}

interface PhoneInsights {
  type: 'phone_insights';
  phone_number_id: string;
  insights: {
    verified_name?: string;
    quality_rating?: string;
    is_official_business_account?: boolean;
    account_mode?: string;
    status?: string;
    display_phone_number?: string;
    name_status?: string;
    messaging_limit_tier?: string;
  };
}

type AnalyticsResult = ConversationAnalytics | TemplateAnalytics | PhoneInsights;

export function useWhatsappAnalytics() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResult | null>(null);
  const { toast } = useToast();

  const fetchAnalytics = async (params: {
    whatsappId?: string;
    type: 'conversation' | 'template' | 'phone_insights';
    startDate?: string;
    endDate?: string;
    granularity?: 'HALF_HOUR' | 'DAY' | 'MONTH';
  }) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('whatsapp-analytics', {
        body: params,
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error);
      }

      setData(result as AnalyticsResult);
      return result;
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Erro ao carregar analytics',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    data,
    fetchAnalytics,
    fetchConversationAnalytics: (whatsappId?: string, startDate?: string, endDate?: string) =>
      fetchAnalytics({ whatsappId, type: 'conversation', startDate, endDate }),
    fetchTemplateAnalytics: (startDate?: string, endDate?: string) =>
      fetchAnalytics({ type: 'template', startDate, endDate }),
    fetchPhoneInsights: (whatsappId?: string) =>
      fetchAnalytics({ whatsappId, type: 'phone_insights' }),
  };
}

export function useValidateWhatsappNumbers() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{
    input: string;
    wa_id: string | null;
    valid: boolean;
  }> | null>(null);
  const { toast } = useToast();

  const validateNumbers = async (phoneNumbers: string[], whatsappId?: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('validate-whatsapp-number', {
        body: { phoneNumbers, whatsappId },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error);
      }

      setResults(result.results);
      
      toast({
        title: 'Validação concluída',
        description: `${result.valid} válidos, ${result.invalid} inválidos de ${result.total} números`,
      });

      return result;
    } catch (error: any) {
      console.error('Error validating numbers:', error);
      toast({
        title: 'Erro ao validar números',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    results,
    validateNumbers,
  };
}

export function useSendInteractiveMessage() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const sendButtonMessage = async (
    ticketId: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    options?: { header?: string; footer?: string }
  ) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-interactive', {
        body: {
          ticketId,
          interactiveMessage: {
            type: 'button',
            body,
            buttons,
            ...(options?.header && { header: { type: 'text', text: options.header } }),
            ...(options?.footer && { footer: options.footer }),
          },
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending button message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const sendListMessage = async (
    ticketId: string,
    body: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    options?: { header?: string; footer?: string }
  ) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('send-interactive', {
        body: {
          ticketId,
          interactiveMessage: {
            type: 'list',
            body,
            buttonText,
            sections,
            ...(options?.header && { header: { type: 'text', text: options.header } }),
            ...(options?.footer && { footer: options.footer }),
          },
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error);
      }

      return result;
    } catch (error: any) {
      console.error('Error sending list message:', error);
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    sendButtonMessage,
    sendListMessage,
  };
}
