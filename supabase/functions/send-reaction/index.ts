// supabase/functions/send-reaction/index.ts (REFATORADO — Multi-Provider)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-reaction] Starting...');

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
    const { ticketId, messageWid, emoji } = body;

    if (!ticketId || !messageWid || !emoji) throw new Error('Missing required fields');

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

    // WhatsApp connection
    const { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, provider, instance_id, status, phone_number_id, access_token, uazapi_url, uazapi_token, uazapi_instance_id')
      .eq('company_id', ticket.company_id)
      .eq('status', 'CONNECTED')
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    // Build remoteJid
    const contactNumber = ticket.contact.number;
    const isGroupChat = ticket.is_group || contactNumber.includes('@g.us');
    const remoteJid = isGroupChat
      ? `${contactNumber.split('@')[0]}@g.us`
      : `${contactNumber.replace(/\D/g, '')}@s.whatsapp.net`;

    let success = false;
    let providerError: string | null = null;
    const provider = (whatsapp?.provider || '').toLowerCase();

    if (whatsapp?.status === 'CONNECTED') {
      // === Meta Cloud API: native reaction ===
      if ((provider === 'coex' || provider === 'cloud_api' || provider === 'meta') && whatsapp.phone_number_id && whatsapp.access_token) {
        const cleanPhone = contactNumber.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
        const recipientPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;

        try {
          const response = await fetch(
            `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/messages`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${whatsapp.access_token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientPhone,
                type: 'reaction',
                reaction: { message_id: messageWid, emoji },
              }),
            }
          );

          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            success = true;
          } else {
            providerError = data.error?.message || `HTTP ${response.status}`;
          }
        } catch (e) {
          providerError = e instanceof Error ? e.message : 'Network error';
        }
      }
      // === UazAPI: send reaction ===
      else if (provider === 'uazapi' && whatsapp.uazapi_url && whatsapp.uazapi_token) {
        const baseUrl = whatsapp.uazapi_url.replace(/\/+$/, '');
        const phone = contactNumber.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');

        try {
          const response = await fetch(`${baseUrl}/send/reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Token': whatsapp.uazapi_token },
            body: JSON.stringify({
              phone,
              msgId: messageWid,
              text: emoji,
            }),
          });

          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            success = true;
          } else {
            providerError = data.message || data.error || `HTTP ${response.status}`;
          }
        } catch (e) {
          providerError = e instanceof Error ? e.message : 'Network error';
        }
      } else {
        providerError = 'Nenhum provider configurado para reações';
      }
    } else {
      providerError = 'Nenhuma conexão WhatsApp ativa';
    }

    // Persist reaction
    await supabase.from('messages').insert({
      wid: `reaction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ticket_id: ticket.id,
      contact_id: ticket.contact_id,
      company_id: ticket.company_id,
      body: `[Reação: ${emoji}]`,
      from_me: true,
      remote_jid: remoteJid,
      ack: success ? 2 : 0,
      data_json: {
        messageType: 'reactionMessage',
        senderName: profile?.name || user.email,
        key: { id: messageWid, remoteJid },
        reactionMessage: { text: emoji },
        sent: success,
      },
    });

    return new Response(JSON.stringify({
      success,
      warning: providerError && !success ? `Reação não enviada: ${providerError}` : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[send-reaction] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
