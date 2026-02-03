import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fixed global verify token for the Meta App webhook
// This is configured once in the Meta App settings and used for all connections
const VERIFY_TOKEN = Deno.env.get('META_WEBHOOK_VERIFY_TOKEN') || 'hubfit_webhook_2024';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);

  // Handle webhook verification (GET request from Meta)
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    console.log('[Meta Webhook] Verification request:', { mode, token, challenge: challenge?.substring(0, 20) });

    if (mode === 'subscribe' && challenge) {
      // Use global fixed token - same for all connections
      if (token === VERIFY_TOKEN) {
        console.log('[Meta Webhook] Verification successful with global token');

        // Return challenge to complete verification
        return new Response(challenge, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }

      console.log('[Meta Webhook] Token mismatch. Expected:', VERIFY_TOKEN, 'Got:', token);
      return new Response('Forbidden', { status: 403 });
    }

    return new Response('Bad Request', { status: 400 });
  }

  // Handle incoming messages (POST request from Meta)
  if (req.method === 'POST') {
    try {
      const body = await req.json();
      console.log('[Meta Webhook] Incoming message:', JSON.stringify(body).substring(0, 500));

      // Process each entry
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];

        for (const change of changes) {
          const value = change.value || {};

          // Get phone_number_id to identify which connection
          const phoneNumberId = value.metadata?.phone_number_id;

          if (!phoneNumberId) {
            console.log('[Meta Webhook] No phone_number_id in payload');
            continue;
          }

          // Find connection by phone_number_id (use limit 1 in case of duplicates)
          const { data: connections, error: connError } = await supabase
            .from('whatsapps')
            .select('id, company_id, name')
            .eq('phone_number_id', phoneNumberId)
            .eq('status', 'CONNECTED')
            .limit(1);

          const connection = connections?.[0];

          if (connError || !connection) {
            console.log('[Meta Webhook] No connection found for phone_number_id:', phoneNumberId);
            continue;
          }

          // Process status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              console.log('[Meta Webhook] Status update:', status.status, 'for message:', status.id);

              // Update message ack status
              const ackMap: Record<string, number> = {
                'sent': 1,
                'delivered': 2,
                'read': 3,
                'failed': -1,
              };

              if (ackMap[status.status] !== undefined) {
                // Try to update by wid first (where send-template stores the message ID)
                const { data: widUpdate, error: widError } = await supabase
                  .from('messages')
                  .update({ ack: ackMap[status.status] })
                  .eq('wid', status.id)
                  .select('id');

                // If no rows updated by wid, try remote_jid as fallback
                if (!widUpdate || widUpdate.length === 0) {
                  await supabase
                    .from('messages')
                    .update({ ack: ackMap[status.status] })
                    .eq('remote_jid', status.id);
                }

                // Handle failure details - just log, the ack update above already set -1
                if (status.status === 'failed' && status.errors) {
                  console.log('[Meta Webhook] Message failed:', status.id, JSON.stringify(status.errors));
                }
              }
            }
          }

          // Process incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              console.log('[Meta Webhook] New message from:', message.from);

              const contactPhone = message.from;
              const contactName = value.contacts?.[0]?.profile?.name || contactPhone;
              const messageBody = message.text?.body || message.caption || '[Mídia]';
              const messageType = message.type || 'text';

              // Find or create contact
              // eslint-disable-next-line prefer-const
              let { data: contact, error: contactError } = await supabase
                .from('contacts')
                .select('id')
                .eq('company_id', connection.company_id)
                .eq('number', contactPhone)
                .single();

              if (!contact) {
                const { data: newContact, error: createError } = await supabase
                  .from('contacts')
                  .insert({
                    company_id: connection.company_id,
                    name: contactName,
                    number: contactPhone,
                  })
                  .select('id')
                  .single();

                if (createError) {
                  console.error('[Meta Webhook] Error creating contact:', createError);
                  continue;
                }
                contact = newContact;
              }

              // Find or create ticket
              // eslint-disable-next-line prefer-const
              let { data: ticket, error: ticketError } = await supabase
                .from('tickets')
                .select('id')
                .eq('company_id', connection.company_id)
                .eq('contact_id', contact.id)
                .eq('whatsapp_id', connection.id)
                .neq('status', 'closed')
                .single();

              if (!ticket) {
                const { data: newTicket, error: createTicketError } = await supabase
                  .from('tickets')
                  .insert({
                    company_id: connection.company_id,
                    contact_id: contact.id,
                    whatsapp_id: connection.id,
                    status: 'pending',
                    last_message: messageBody,
                    last_message_at: new Date().toISOString(),
                  })
                  .select('id')
                  .single();

                if (createTicketError) {
                  console.error('[Meta Webhook] Error creating ticket:', createTicketError);
                  continue;
                }
                ticket = newTicket;
              } else {
                // Update ticket with last message
                await supabase
                  .from('tickets')
                  .update({
                    last_message: messageBody,
                    last_message_at: new Date().toISOString(),
                    unread_messages: supabase.rpc('increment_unread', { ticket_id: ticket.id }),
                  })
                  .eq('id', ticket.id);
              }

              // Handle media if present
              const mediaUrl = null;
              let mediaType = null;

              if (message.type !== 'text' && message[message.type]?.id) {
                mediaType = message.type;
                // Media URL would need to be fetched from Meta's API using the media ID
                // For now, we store the reference
                console.log('[Meta Webhook] Media message received, type:', mediaType);
              }

              // Create message record
              const { error: msgError } = await supabase
                .from('messages')
                .insert({
                  company_id: connection.company_id,
                  ticket_id: ticket.id,
                  contact_id: contact.id,
                  body: messageBody,
                  from_me: false,
                  remote_jid: message.id,
                  media_type: mediaType,
                  media_url: mediaUrl,
                  ack: 0,
                  is_read: false,
                });

              if (msgError) {
                console.error('[Meta Webhook] Error creating message:', msgError);
              } else {
                console.log('[Meta Webhook] Message saved successfully');
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('[Meta Webhook] Error processing webhook:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response('Method Not Allowed', { status: 405 });
});
