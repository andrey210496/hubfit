import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  companyId: string;
  eventType: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { companyId, eventType, data }: WebhookPayload = await req.json();

    console.log(`[Webhook Dispatcher] Event: ${eventType}, Company: ${companyId}`);

    // Fetch active webhooks for this company and event
    const { data: webhooks, error: webhooksError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (webhooksError) {
      console.error('[Webhook Dispatcher] Error fetching webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!webhooks || webhooks.length === 0) {
      console.log('[Webhook Dispatcher] No active webhooks found for this event');
      return new Response(JSON.stringify({ success: true, dispatched: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[Webhook Dispatcher] Found ${webhooks.length} webhooks to dispatch`);

    const results = await Promise.all(
      webhooks.map(async (webhook) => {
        const startTime = Date.now();
        let responseStatus: number | null = null;
        let responseBody: string | null = null;
        let errorMessage: string | null = null;

        try {
          // Prepare headers
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(webhook.headers || {}),
          };

          // Add signature if secret is configured
          if (webhook.secret) {
            const encoder = new TextEncoder();
            const keyData = encoder.encode(webhook.secret);
            const key = await crypto.subtle.importKey(
              'raw',
              keyData,
              { name: 'HMAC', hash: 'SHA-256' },
              false,
              ['sign']
            );
            const payload = JSON.stringify({ event: eventType, data, timestamp: Date.now() });
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
            const signatureHex = Array.from(new Uint8Array(signature))
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');
            headers['X-Webhook-Signature'] = signatureHex;
          }

          const payload = {
            event: eventType,
            data,
            timestamp: new Date().toISOString(),
            webhook_id: webhook.id,
          };

          console.log(`[Webhook Dispatcher] Sending to ${webhook.url}`);

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
          });

          responseStatus = response.status;
          responseBody = await response.text();

          console.log(`[Webhook Dispatcher] Response status: ${responseStatus}`);

        } catch (error) {
          console.error(`[Webhook Dispatcher] Error sending to ${webhook.url}:`, error);
          errorMessage = error instanceof Error ? error.message : 'Unknown error';
        }

        const durationMs = Date.now() - startTime;

        // Log the webhook execution
        await supabase.from('webhook_logs').insert({
          webhook_id: webhook.id,
          company_id: companyId,
          event_type: eventType,
          payload: { event: eventType, data },
          response_status: responseStatus,
          response_body: responseBody?.substring(0, 5000), // Limit response body size
          error_message: errorMessage,
          duration_ms: durationMs,
        });

        return {
          webhook_id: webhook.id,
          success: responseStatus !== null && responseStatus >= 200 && responseStatus < 300,
          status: responseStatus,
          duration_ms: durationMs,
        };
      })
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`[Webhook Dispatcher] Dispatched ${successCount}/${results.length} successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      dispatched: results.length,
      successful: successCount,
      results 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Webhook Dispatcher] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
