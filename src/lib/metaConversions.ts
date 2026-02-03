import { supabase } from '@/integrations/supabase/client';

interface SendConversionParams {
  tagId: string;
  contactId: string;
  ticketId?: string;
  companyId: string;
  eventName?: string;
}

export async function sendMetaConversion({
  tagId,
  contactId,
  ticketId,
  companyId,
  eventName = 'Lead',
}: SendConversionParams): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('meta-conversions', {
      body: {
        tagId,
        contactId,
        ticketId,
        companyId,
        eventName,
      },
    });

    if (error) {
      console.error('[Meta Conversion] Error:', error);
      return { success: false, error: error.message };
    }

    if (data?.skipped) {
      console.log('[Meta Conversion] Skipped:', data.reason);
      return { success: true };
    }

    console.log('[Meta Conversion] Success:', data);
    return { success: true };
  } catch (error) {
    console.error('[Meta Conversion] Exception:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
