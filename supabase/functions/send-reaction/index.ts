import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GLOBAL_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

interface NotificaMeConfig {
  apiUrl: string;
  apiKey: string;
}

async function getGlobalConfig(supabase: any): Promise<NotificaMeConfig | null> {
  const { data, error } = await supabase
    .from('campaign_settings')
    .select('key, value')
    .eq('company_id', GLOBAL_COMPANY_ID)
    .in('key', ['notificame_api_url', 'notificame_api_key']);

  if (error || !data || data.length === 0) return null;

  const settings: Record<string, string> = {};
  data.forEach((item: any) => {
    settings[item.key] = item.value || '';
  });

  if (!settings.notificame_api_url || !settings.notificame_api_key) {
    return null;
  }

  return {
    apiUrl: settings.notificame_api_url.replace(/\/$/, ''),
    apiKey: settings.notificame_api_key.trim(),
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[send-reaction] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const body = await req.json();
    const { ticketId, messageWid, emoji } = body;
    
    console.log('[send-reaction] ticketId=', ticketId, 'messageWid=', messageWid, 'emoji=', emoji);

    if (!ticketId || !messageWid || !emoji) {
      throw new Error('Missing required fields: ticketId, messageWid, or emoji');
    }

    // Get ticket info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`*, contact:contacts(*)`)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profile?.company_id !== ticket.company_id) {
      throw new Error('Access denied');
    }

    // Get global NotificaMe config
    const globalConfig = await getGlobalConfig(supabase);

    // Get WhatsApp connection for this company
    const { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, instance_id, status')
      .eq('company_id', ticket.company_id)
      .eq('status', 'CONNECTED')
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    // Build the remote JID
    const contactNumber = ticket.contact.number;
    const isGroupChat = ticket.is_group || contactNumber.includes('@g.us');
    
    let remoteJid: string;
    if (isGroupChat) {
      const groupId = contactNumber.includes('@') 
        ? contactNumber.split('@')[0] 
        : contactNumber;
      remoteJid = groupId + '@g.us';
    } else {
      const phoneNumber = contactNumber.includes('@') 
        ? contactNumber.split('@')[0] 
        : contactNumber;
      remoteJid = phoneNumber + '@s.whatsapp.net';
    }

    console.log('[send-reaction] remoteJid=', remoteJid, 'isGroup=', isGroupChat);

    let success = false;
    let providerError = null;

    // Send reaction via NotificaMe Hub
    if (globalConfig && whatsapp?.instance_id && whatsapp?.status === 'CONNECTED') {
      const cleanPhone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');
      
      const payload = {
        from: whatsapp.instance_id,
        to: cleanPhone,
        contents: [{
          type: 'reaction',
          reaction: {
            message_id: messageWid,
            emoji: emoji,
          },
        }],
      };

      console.log('[send-reaction] Sending via NotificaMe Hub:', JSON.stringify(payload));

      const endpoints = [
        `${globalConfig.apiUrl}/v1/channels/whatsapp/messages`,
        `${globalConfig.apiUrl}/channels/whatsapp/messages`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'X-Api-Token': globalConfig.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          const data = await response.json().catch(() => ({}));

          if (response.ok) {
            success = true;
            console.log('[send-reaction] Sent successfully:', data);
            break;
          }

          providerError = data.message || data.error || `HTTP ${response.status}`;
        } catch (e) {
          providerError = e instanceof Error ? e.message : 'Network error';
        }
      }
    } else {
      providerError = 'No active WhatsApp connection';
    }

    // Persist reaction row for UI display
    const { error: insertError } = await supabase.from('messages').insert({
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

    if (insertError) {
      console.error('[send-reaction] Failed to persist reaction:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        success, 
        saved: !insertError,
        warning: providerError && !success ? `Reação não enviada: ${providerError}` : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
