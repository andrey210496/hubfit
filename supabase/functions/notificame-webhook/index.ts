import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse body - support both JSON and URL-encoded formats
    const contentType = req.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/x-www-form-urlencoded')) {
      // NotificaMe Hub test sends URL-encoded data
      const text = await req.text();
      console.log('NotificaMe webhook received (form-data):', text);
      
      const params = new URLSearchParams(text);
      
      // Check if it's a simple validation test (just "mensagem=Test")
      if (params.has('mensagem') && !params.has('id') && !params.has('channel')) {
        console.log('Webhook validation test received');
        return new Response(JSON.stringify({ success: true, message: 'Webhook validated' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Parse form data into body object
      body = {};
      for (const [key, value] of params.entries()) {
        // Try to parse JSON values
        try {
          body[key] = JSON.parse(value);
        } catch {
          body[key] = value;
        }
      }
    } else {
      // Standard JSON payload
      body = await req.json();
    }
    
    console.log('NotificaMe webhook received:', JSON.stringify(body));

    // NotificaMe Hub webhook payload can arrive in two formats:
    // 1) Flat: { id, from, to, direction, contents, ... }
    // 2) Nested: { type, subscriptionId, channel, direction, message: { id, from, to, contents, ... } }
    // We'll normalize to a single structure.
    const msg = (body && typeof body === 'object' && (body as any).message)
      ? (body as any).message
      : body;

    const eventType = (body as any)?.type ?? (msg as any)?.type;
    const direction = (msg as any)?.direction ?? (body as any)?.direction;
    const from = (msg as any)?.from ?? (body as any)?.from;
    const to = (msg as any)?.to ?? (body as any)?.to;
    const contents = (msg as any)?.contents ?? (body as any)?.contents;
    const timestamp = (msg as any)?.timestamp ?? (body as any)?.timestamp;
    const status = (msg as any)?.status ?? (body as any)?.status;

    // The channel token we store as instance_id is typically the subscriptionId (or the message.to)
    const channelToken =
      (body as any)?.subscriptionId ||
      (body as any)?.subscription_id ||
      to ||
      (body as any)?.to;

    // NotificaMe can resend the same message with a different `id` on retries.
    // `providerMessageId` is the provider-level stable identifier, so we prefer it for `wid`.
    const providerMessageId =
      (body as any)?.providerMessageId ||
      (body as any)?.provider_message_id ||
      (msg as any)?.providerMessageId ||
      (msg as any)?.provider_message_id;

    const rawMessageId = (msg as any)?.id || (body as any)?.id;

    // This is the identifier we persist and use for dedup/status updates.
    // Prefer providerMessageId when available; fall back to rawMessageId.
    const messageWid = providerMessageId || rawMessageId;

    console.log('Normalized NotificaMe payload:', JSON.stringify({
      eventType,
      direction,
      from,
      to,
      channelToken,
      hasContents: Boolean(contents),
      providerMessageId,
      rawMessageId,
      messageWid,
    }));

    // Ignore outbound messages (direction === 'OUT')
    if (direction === 'OUT') {
      console.log('Ignoring outbound message');
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle incoming message (direction === 'IN')
    if (direction === 'IN' && from) {
      console.log('Processing incoming message from:', from);

      // === WEBHOOK SECURITY: Validate channel BEFORE processing ===
      // Find the connection by channel token (stored in instance_id)
      // NOTE: In nested payloads, `channel` is often "whatsapp_business_account" (not a token).
      // The token comes in `subscriptionId` and/or `message.to`.
      let whatsapp = null;
      if (channelToken) {
        const { data } = await supabase
          .from('whatsapps')
          .select('id, company_id, provider, default_queue_id')
          .eq('instance_id', channelToken)
          .maybeSingle();
        whatsapp = data;
      }

      // Backwards compatibility: try matching by `channel` if token missing
      if (!whatsapp && (body as any)?.channel) {
        const { data } = await supabase
          .from('whatsapps')
          .select('id, company_id, provider, default_queue_id')
          .eq('instance_id', (body as any).channel)
          .maybeSingle();
        whatsapp = data;
      }

      // SECURITY: Reject messages that don't match any configured connection
      // This prevents attackers from injecting fake messages
      if (!whatsapp) {
        console.warn('SECURITY: Rejected message - no connection found for token:', channelToken);
        // Return 401 to indicate the channel is not authorized
        return new Response(JSON.stringify({ error: 'Unauthorized channel' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract phone number (only digits)
      const phoneNumber = from.replace(/\D/g, '');

      // Find or create contact
      const contact = await findOrCreateContact(supabase, whatsapp.company_id, phoneNumber, whatsapp.id);

      if (!contact) {
        console.error('Failed to find/create contact');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Find or create ticket (with default queue from connection)
      const ticket = await findOrCreateTicket(supabase, whatsapp.company_id, contact.id, whatsapp.id, whatsapp.default_queue_id);

      if (!ticket) {
        console.error('Failed to find/create ticket');
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Parse message content
      let messageBody = '';
      let mediaUrl = null;
      let mediaType = null;

      if (contents) {
        const content = typeof contents === 'string' ? JSON.parse(contents) : contents;
        
        if (Array.isArray(content)) {
          for (const item of content) {
            if (item.type === 'text') {
              messageBody = item.text || '';
            } else if (item.type === 'file') {
              mediaUrl = item.fileUrl || item.url;
              mediaType = item.fileMimeType || 'document';
              messageBody = item.fileCaption || `[${mediaType}]`;
            } else if (item.type === 'location') {
              messageBody = `📍 Localização: ${item.latitude}, ${item.longitude}`;
            } else if (item.type === 'contacts') {
              messageBody = '📇 Contato compartilhado';
            } else if (item.type === 'interactive') {
              // Interactive response (button click or list selection)
              const interactive = item.interactive || {};
              if (interactive.button_reply) {
                messageBody = interactive.button_reply.title || interactive.button_reply.id;
              } else if (interactive.list_reply) {
                messageBody = interactive.list_reply.title || interactive.list_reply.id;
              }
            }
          }
        } else if (content.type === 'text') {
          messageBody = content.text || '';
        }
      }

      // Check for duplicate message (NotificaMe may send retries)
      if (messageWid) {
        const { data: existingMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('wid', messageWid)
          .maybeSingle();

        if (existingMsg) {
          console.log('Duplicate message ignored, wid:', messageWid);
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }

      // Create message record
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          company_id: whatsapp.company_id,
          ticket_id: ticket.id,
          contact_id: contact.id,
          body: messageBody || '[mensagem sem texto]',
          from_me: false,
          is_read: false,
          wid: messageWid,
          remote_jid: from,
          media_url: mediaUrl,
          media_type: mediaType,
          ack: 2, // Received
          created_at: timestamp ? new Date(timestamp).toISOString() : new Date().toISOString(),
          data_json: {
            source: 'notificame_hub',
            originalPayload: body,
          },
        });

      if (msgError) {
        console.error('Error creating message:', msgError);
      } else {
        console.log('Message created successfully for ticket:', ticket.id);

        // Update ticket
        await supabase
          .from('tickets')
          .update({
            last_message: messageBody || '[mídia]',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticket.id);

        // Update contact interaction stats
        await supabase
          .from('contacts')
          .update({
            last_interaction_at: new Date().toISOString(),
            messages_received: (contact.messages_received || 0) + 1,
          })
          .eq('id', contact.id);

        // Check for campaign UTM in first message and auto-tag
        if (messageBody && ticket.status === 'pending') {
          await checkCampaignUtmAndTag(supabase, whatsapp.company_id, contact.id, ticket.id, messageBody);
        }

        // Trigger AI Agent processing (non-blocking)
        triggerAIAgentProcess(supabaseUrl, supabaseKey, ticket.id, messageBody, contact.name, whatsapp.company_id);
      }
    }

    // Handle message status updates
    if (status && (messageWid || rawMessageId)) {
      console.log('Processing status update:', status, 'for message:', messageWid || rawMessageId);

      let ackValue = 0;
      switch (status) {
        case 'sent':
          ackValue = 1;
          break;
        case 'delivered':
          ackValue = 2;
          break;
        case 'read':
          ackValue = 3;
          break;
        case 'failed':
        case 'error':
          ackValue = -1;
          break;
      }

      if (ackValue !== 0) {
        const updatedAt = new Date().toISOString();

        // 1) Prefer updating by `wid` (our canonical key)
        let updatedAny = false;
        if (messageWid) {
          const { data: updatedRows, error: updateError } = await supabase
            .from('messages')
            .update({ ack: ackValue, updated_at: updatedAt })
            .eq('wid', messageWid)
            .select('id');

          if (updateError) {
            console.error('Error updating message status (by wid):', updateError);
          } else if (updatedRows && updatedRows.length > 0) {
            updatedAny = true;
            console.log('Message status updated (by wid):', messageWid, ackValue);
          }
        }

        // 2) Fallback: if we stored wid as providerMessageId, the provider may later send status updates
        // referencing only the raw `id`. We can match that by looking inside the stored originalPayload.
        if (!updatedAny && rawMessageId) {
          const { data: updatedRows, error: updateError } = await supabase
            .from('messages')
            .update({ ack: ackValue, updated_at: updatedAt })
            // PostgREST JSON-path filter
            .filter('data_json->originalPayload->>id', 'eq', rawMessageId)
            .select('id');

          if (updateError) {
            console.error('Error updating message status (fallback by originalPayload.id):', updateError);
          } else if (updatedRows && updatedRows.length > 0) {
            console.log('Message status updated (fallback by originalPayload.id):', rawMessageId, ackValue);
          } else {
            console.log('Message status not matched for update (wid/rawId):', messageWid, rawMessageId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NotificaMe webhook error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function findOrCreateContact(
  supabase: any,
  companyId: string,
  phoneNumber: string,
  whatsappId: string
) {
  // Try to find existing contact (some legacy records may store number with suffix)
  const candidates = [phoneNumber, `${phoneNumber}@s.whatsapp.net`];
  const { data: existing } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .in('number', candidates)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  // Create new contact
  const { data: newContact, error } = await supabase
    .from('contacts')
    .insert({
      company_id: companyId,
      number: phoneNumber,
      name: phoneNumber,
      whatsapp_id: whatsappId,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating contact:', error);
    return null;
  }

  // Auto-create member (pré-cadastro) in the management system
  // Uses 'inactive' status as pre-registration (valid enum values: active, inactive, suspended, cancelled)
  if (newContact) {
    try {
      // Check if member already exists for this contact
      const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('contact_id', newContact.id)
        .maybeSingle();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            company_id: companyId,
            contact_id: newContact.id,
            status: 'inactive',
          });

        if (memberError) {
          console.error('Error creating member (pre-registration):', memberError);
        } else {
          console.log('Member (pre-registration) created for contact:', newContact.id);
        }
      }
    } catch (memberErr) {
      console.error('Error in member creation:', memberErr);
    }
  }

  return newContact;
}

async function findOrCreateTicket(supabase: any, companyId: string, contactId: string, whatsappId: string, defaultQueueId?: string) {
  // Try to find open ticket
  const { data: existing } = await supabase
    .from('tickets')
    .select('*')
    .eq('company_id', companyId)
    .eq('contact_id', contactId)
    .in('status', ['open', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    // If ticket exists but has no queue and we have a default, update it
    if (!existing.queue_id && defaultQueueId) {
      await supabase
        .from('tickets')
        .update({ queue_id: defaultQueueId })
        .eq('id', existing.id);
      existing.queue_id = defaultQueueId;
    }
    return existing;
  }

  // Create new ticket with default queue
  const { data: newTicket, error } = await supabase
    .from('tickets')
    .insert({
      company_id: companyId,
      contact_id: contactId,
      whatsapp_id: whatsappId,
      queue_id: defaultQueueId || null,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating ticket:', error);
    return null;
  }

  return newTicket;
}

// Check for campaign UTM identifier in message and auto-tag contact
async function checkCampaignUtmAndTag(
  supabase: any,
  companyId: string,
  contactId: string,
  ticketId: string,
  messageBody: string
) {
  try {
    console.log('[Campaign UTM] Checking message for campaign identifiers:', messageBody);

    // Find all tags with campaign identifiers for this company
    const { data: campaignTags, error } = await supabase
      .from('tags')
      .select('id, name, campaign_identifier, meta_pixel_id, meta_access_token')
      .eq('company_id', companyId)
      .not('campaign_identifier', 'is', null)
      .neq('campaign_identifier', '');

    if (error || !campaignTags || campaignTags.length === 0) {
      console.log('[Campaign UTM] No campaign tags found');
      return;
    }

    // Check each campaign tag for a match
    for (const tag of campaignTags) {
      const identifier = tag.campaign_identifier.toLowerCase().trim();
      const messageLower = messageBody.toLowerCase();

      if (messageLower.includes(identifier)) {
        console.log(`[Campaign UTM] Match found! Tag: ${tag.name}, Identifier: ${identifier}`);

        // Check if contact already has this tag
        const { data: existingTag } = await supabase
          .from('contact_tags')
          .select('id')
          .eq('contact_id', contactId)
          .eq('tag_id', tag.id)
          .single();

        if (existingTag) {
          console.log('[Campaign UTM] Contact already has this tag');
          continue;
        }

        // Add tag to contact
        const { error: tagError } = await supabase
          .from('contact_tags')
          .insert({ contact_id: contactId, tag_id: tag.id });

        if (tagError) {
          console.error('[Campaign UTM] Error adding tag:', tagError);
          continue;
        }

        console.log('[Campaign UTM] Tag added successfully:', tag.name);

        // Fire Meta Conversion if configured
        if (tag.meta_pixel_id && tag.meta_access_token) {
          console.log('[Campaign UTM] Firing Meta conversion event');

          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

          try {
            await fetch(`${supabaseUrl}/functions/v1/meta-conversions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              },
              body: JSON.stringify({
                tagId: tag.id,
                contactId,
                ticketId,
                companyId,
                eventName: 'Lead',
              }),
            });
            console.log('[Campaign UTM] Meta conversion event sent');
          } catch (metaError) {
            console.error('[Campaign UTM] Error sending Meta conversion:', metaError);
          }
        }

        // Only match first campaign tag
        break;
      }
    }
  } catch (error) {
    console.error('[Campaign UTM] Error:', error);
  }
}

// Trigger AI Agent processing (non-blocking, fire-and-forget)
async function triggerAIAgentProcess(
  supabaseUrl: string,
  supabaseKey: string,
  ticketId: string,
  messageBody: string,
  contactName: string,
  companyId: string
) {
  try {
    console.log('[AI Agent Trigger] Triggering for ticket:', ticketId, 'companyId:', companyId);
    
    // Fire and forget - don't wait for response
    fetch(`${supabaseUrl}/functions/v1/ai-agent-process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        ticketId,
        message: messageBody, // ai-agent-process expects "message", not "messageBody"
        companyId,
      }),
    }).then(async (response) => {
      const rawText = await response.text();
      if (!response.ok) {
        console.error('[AI Agent Trigger] Error:', response.status, rawText);
        return;
      }

      let result: any = null;
      try {
        result = rawText ? JSON.parse(rawText) : null;
      } catch {
        result = null;
      }

      console.log('[AI Agent Trigger] Response:', result);

      // If AI decided to skip (ticket assigned to human), do nothing
      if (result?.skipped) return;

      const aiResponse = typeof result?.response === 'string' ? result.response.trim() : '';
      if (!aiResponse) return;

      // Send AI response back to the ticket so it appears in the attendance chat
      try {
        const sendRes = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            ticketId,
            body: aiResponse,
          }),
        });

        if (!sendRes.ok) {
          console.error('[AI Agent Trigger] send-message failed:', sendRes.status, await sendRes.text());
        } else {
          console.log('[AI Agent Trigger] AI response sent to ticket');
        }
      } catch (sendErr) {
        console.error('[AI Agent Trigger] send-message error:', sendErr);
      }
    }).catch((error) => {
      console.error('[AI Agent Trigger] Fetch error:', error);
    });
  } catch (error) {
    console.error('[AI Agent Trigger] Error:', error);
  }
}
