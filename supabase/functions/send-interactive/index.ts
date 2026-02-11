// supabase/functions/send-interactive/index.ts (REFATORADO — Multi-Provider)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMessage as sendViaProvider, type WhatsAppConnection } from "../_shared/providers.ts";

interface ButtonMessage {
  type: 'button';
  header?: { type: 'text'; text: string };
  body: string;
  footer?: string;
  buttons: Array<{ id: string; title: string }>;
}

interface ListMessage {
  type: 'list';
  header?: { type: 'text'; text: string };
  body: string;
  footer?: string;
  buttonText: string;
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-interactive] Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { ticketId, interactiveMessage } = body as {
      ticketId: string;
      interactiveMessage: ButtonMessage | ListMessage;
    };

    if (!ticketId || !interactiveMessage) throw new Error('Missing required fields');

    // Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, contact:contacts(*)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) throw new Error('Ticket not found');

    // Permission
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile?.company_id !== ticket.company_id) throw new Error('Access denied');

    // WhatsApp connection (with UazAPI fields)
    const { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, company_id, provider, instance_id, status, phone_number_id, access_token, uazapi_url, uazapi_token, uazapi_instance_id')
      .eq('company_id', ticket.company_id)
      .eq('status', 'CONNECTED')
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    if (!whatsapp) throw new Error('Nenhuma conexão WhatsApp ativa');

    const cleanPhone = ticket.contact.number.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
    const provider = (whatsapp.provider || '').toLowerCase();

    // Build message body for storage
    const messageBodyText = interactiveMessage.type === 'button'
      ? `[Botões] ${interactiveMessage.body}`
      : `[Lista] ${interactiveMessage.body}`;

    // Save message first
    const { data: message, error: messageError } = await supabase.from('messages').insert({
      ticket_id: ticketId,
      contact_id: ticket.contact.id,
      company_id: ticket.company_id,
      body: messageBodyText,
      from_me: true,
      is_read: true,
      ack: 0,
      media_type: 'interactive',
      remote_jid: ticket.contact.number,
      data_json: { interactiveMessage },
    }).select().single();

    if (messageError) throw new Error('Failed to create message');

    let result: any = null;
    let lastError = '';

    // === META Cloud API: Native interactive messages ===
    if ((provider === 'coex' || provider === 'cloud_api' || provider === 'meta') && whatsapp.phone_number_id && whatsapp.access_token) {
      const interactivePayload: any = {
        messaging_product: 'whatsapp',
        to: cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone,
        type: 'interactive',
        interactive: {
          type: interactiveMessage.type,
          body: { text: interactiveMessage.body },
          action: {},
        },
      };

      if (interactiveMessage.type === 'button') {
        const btnMsg = interactiveMessage as ButtonMessage;
        if (btnMsg.buttons.length > 3) throw new Error('Maximum 3 buttons allowed');

        interactivePayload.interactive.action.buttons = btnMsg.buttons.map(btn => ({
          type: 'reply',
          reply: { id: btn.id, title: btn.title.substring(0, 20) }
        }));
        if (btnMsg.header) interactivePayload.interactive.header = btnMsg.header;
        if (btnMsg.footer) interactivePayload.interactive.footer = { text: btnMsg.footer };
      } else {
        const listMsg = interactiveMessage as ListMessage;
        interactivePayload.interactive.action.button = listMsg.buttonText.substring(0, 20);
        interactivePayload.interactive.action.sections = listMsg.sections.map(s => ({
          title: s.title.substring(0, 24),
          rows: s.rows.map(r => ({
            id: r.id,
            title: r.title.substring(0, 24),
            description: r.description?.substring(0, 72),
          }))
        }));
        if (listMsg.header) interactivePayload.interactive.header = listMsg.header;
        if (listMsg.footer) interactivePayload.interactive.footer = { text: listMsg.footer };
      }

      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsapp.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(interactivePayload),
          }
        );
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          result = { id: data.messages?.[0]?.id, ...data };
        } else {
          lastError = data.error?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Network error';
      }
    }
    // === UazAPI: Send as text with formatted buttons/list ===
    else if (provider === 'uazapi') {
      let formattedText = interactiveMessage.body + '\n';

      if (interactiveMessage.type === 'button') {
        const btnMsg = interactiveMessage as ButtonMessage;
        formattedText += '\n' + btnMsg.buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
      } else {
        const listMsg = interactiveMessage as ListMessage;
        listMsg.sections.forEach(s => {
          formattedText += `\n*${s.title}*\n`;
          formattedText += s.rows.map(r => `• ${r.title}${r.description ? ` — ${r.description}` : ''}`).join('\n');
        });
      }

      if (interactiveMessage.footer) formattedText += `\n\n_${interactiveMessage.footer}_`;

      const sendResult = await sendViaProvider(whatsapp as WhatsAppConnection, {
        to: ticket.contact.number,
        body: formattedText,
      });

      if (sendResult.success) {
        result = { id: sendResult.messageId };
      } else {
        lastError = sendResult.error || 'Falha ao enviar via UazAPI';
      }
    } else {
      lastError = 'Nenhum provider configurado';
    }

    if (result) {
      await supabase.from('messages').update({
        wid: result.id || null,
        ack: 1,
        data_json: { ...message.data_json, providerResponse: result },
      }).eq('id', message.id);

      await supabase.from('tickets').update({
        last_message: messageBodyText,
        updated_at: new Date().toISOString(),
      }).eq('id', ticketId);

      return new Response(JSON.stringify({ success: true, messageId: message.id, wid: result.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      await supabase.from('messages').update({
        ack: -1,
        data_json: { ...message.data_json, error: lastError },
      }).eq('id', message.id);

      throw new Error(lastError || 'Failed to send interactive message');
    }
  } catch (error) {
    console.error('[send-interactive] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
