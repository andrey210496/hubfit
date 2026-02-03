import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // === WEBHOOK AUTHENTICATION ===
    // Get the access token from headers sent by Asaas
    const receivedToken = req.headers.get('asaas-access-token');
    
    // Fetch all active webhook tokens from company configs
    const { data: configs } = await supabase
      .from('asaas_company_config')
      .select('webhook_token, company_id')
      .eq('is_active', true)
      .not('webhook_token', 'is', null);
    
    // Validate token matches at least one configured webhook token
    const validTokens = configs?.map(c => c.webhook_token).filter(Boolean) || [];
    
    if (validTokens.length > 0 && (!receivedToken || !validTokens.includes(receivedToken))) {
      console.error('Asaas Webhook: Invalid or missing access token');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // === END AUTHENTICATION ===

    const payload = await req.json();
    console.log('Asaas Webhook received:', JSON.stringify(payload, null, 2));

    const { event, payment } = payload;

    if (!payment?.id) {
      console.log('No payment ID in webhook payload');
      return new Response(
        JSON.stringify({ success: true, message: 'No payment to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map Asaas events to our status
    const statusMap: Record<string, string> = {
      PAYMENT_CREATED: 'PENDING',
      PAYMENT_AWAITING_RISK_ANALYSIS: 'AWAITING_RISK_ANALYSIS',
      PAYMENT_APPROVED_BY_RISK_ANALYSIS: 'PENDING',
      PAYMENT_REPROVED_BY_RISK_ANALYSIS: 'REFUNDED',
      PAYMENT_UPDATED: payment.status,
      PAYMENT_CONFIRMED: 'CONFIRMED',
      PAYMENT_RECEIVED: 'RECEIVED',
      PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: 'REFUNDED',
      PAYMENT_ANTICIPATED: 'RECEIVED',
      PAYMENT_OVERDUE: 'OVERDUE',
      PAYMENT_DELETED: 'REFUNDED',
      PAYMENT_RESTORED: 'PENDING',
      PAYMENT_REFUNDED: 'REFUNDED',
      PAYMENT_RECEIVED_IN_CASH_UNDONE: 'PENDING',
      PAYMENT_CHARGEBACK_REQUESTED: 'CHARGEBACK_REQUESTED',
      PAYMENT_CHARGEBACK_DISPUTE: 'CHARGEBACK_DISPUTE',
      PAYMENT_AWAITING_CHARGEBACK_REVERSAL: 'AWAITING_CHARGEBACK_REVERSAL',
      PAYMENT_DUNNING_RECEIVED: 'DUNNING_RECEIVED',
      PAYMENT_DUNNING_REQUESTED: 'DUNNING_REQUESTED',
    };

    const newStatus = statusMap[event] || payment.status;

    // Update payment in our database
    const { data: asaasPayment, error: fetchError } = await supabase
      .from('asaas_payments')
      .select('*')
      .eq('asaas_payment_id', payment.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching payment:', fetchError);
      throw fetchError;
    }

    if (!asaasPayment) {
      console.log('Payment not found in our database:', payment.id);
      return new Response(
        JSON.stringify({ success: true, message: 'Payment not tracked' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update our payment record
    const { error: updateError } = await supabase
      .from('asaas_payments')
      .update({
        status: newStatus,
        net_value: payment.netValue,
        payment_date: payment.paymentDate,
        updated_at: new Date().toISOString(),
      })
      .eq('asaas_payment_id', payment.id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      throw updateError;
    }

    // If payment is confirmed/received, update member_payments table
    if (['RECEIVED', 'CONFIRMED'].includes(newStatus) && asaasPayment.member_payment_id) {
      const { error: memberPaymentError } = await supabase
        .from('member_payments')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          external_payment_id: payment.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', asaasPayment.member_payment_id);

      if (memberPaymentError) {
        console.error('Error updating member payment:', memberPaymentError);
      }
    }

    console.log(`Payment ${payment.id} updated to status: ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Asaas Webhook Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
