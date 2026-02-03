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
    console.log('[send-interactive] Starting...');
    
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
    const { ticketId, interactiveMessage } = body as { 
      ticketId: string; 
      interactiveMessage: ButtonMessage | ListMessage;
    };
    
    console.log('[send-interactive] ticketId=', ticketId, 'type=', interactiveMessage?.type);

    if (!ticketId || !interactiveMessage) {
      throw new Error('Missing required fields: ticketId or interactiveMessage');
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
    if (!globalConfig) {
      throw new Error('WhatsApp não configurado. Contate o administrador.');
    }

    // Get WhatsApp connection with channel token
    const { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, instance_id, status')
      .eq('company_id', ticket.company_id)
      .eq('status', 'CONNECTED')
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    if (!whatsapp?.instance_id) {
      throw new Error('Nenhuma conexão WhatsApp ativa encontrada');
    }

    const cleanPhone = ticket.contact.number.replace('@s.whatsapp.net', '').replace('@g.us', '').replace(/\D/g, '');

    // Build interactive content for NotificaMe
    const interactiveContent: any = {
      type: 'interactive',
      interactive: {
        type: interactiveMessage.type,
        body: { text: interactiveMessage.body },
        action: {},
      },
    };

    if (interactiveMessage.type === 'button') {
      const buttonMsg = interactiveMessage as ButtonMessage;
      
      if (buttonMsg.buttons.length > 3) {
        throw new Error('Maximum 3 buttons allowed');
      }

      interactiveContent.interactive.action.buttons = buttonMsg.buttons.map(btn => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title.substring(0, 20),
        }
      }));

      if (buttonMsg.header) {
        interactiveContent.interactive.header = buttonMsg.header;
      }
      if (buttonMsg.footer) {
        interactiveContent.interactive.footer = { text: buttonMsg.footer };
      }
    } else if (interactiveMessage.type === 'list') {
      const listMsg = interactiveMessage as ListMessage;

      interactiveContent.interactive.action.button = listMsg.buttonText.substring(0, 20);
      interactiveContent.interactive.action.sections = listMsg.sections.map(section => ({
        title: section.title.substring(0, 24),
        rows: section.rows.map(row => ({
          id: row.id,
          title: row.title.substring(0, 24),
          description: row.description?.substring(0, 72),
        }))
      }));

      if (listMsg.header) {
        interactiveContent.interactive.header = listMsg.header;
      }
      if (listMsg.footer) {
        interactiveContent.interactive.footer = { text: listMsg.footer };
      }
    } else {
      throw new Error('Invalid interactive message type');
    }

    // Create message body for storage
    const messageBodyText = interactiveMessage.type === 'button' 
      ? `[Botões] ${interactiveMessage.body}`
      : `[Lista] ${interactiveMessage.body}`;

    // Create message record first
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

    if (messageError) {
      console.error('[send-interactive] Failed to create message:', messageError);
      throw new Error('Failed to create message');
    }

    // Send via NotificaMe Hub
    const payload = {
      from: whatsapp.instance_id,
      to: cleanPhone,
      contents: [interactiveContent],
    };

    console.log('[send-interactive] Payload:', JSON.stringify(payload).substring(0, 500));

    const endpoints = [
      `${globalConfig.apiUrl}/v1/channels/whatsapp/messages`,
      `${globalConfig.apiUrl}/channels/whatsapp/messages`,
    ];

    let lastError = '';
    let result: any = null;

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
          result = data;
          break;
        }

        lastError = data.message || data.error || `HTTP ${response.status}`;
        console.log(`[send-interactive] Endpoint ${endpoint} failed:`, response.status, data);
      } catch (e) {
        console.log(`[send-interactive] Endpoint ${endpoint} error:`, e);
        lastError = e instanceof Error ? e.message : 'Network error';
      }
    }

    if (result) {
      const messageWid = result.id || result.messageId;

      await supabase.from('messages').update({
        wid: messageWid,
        ack: 1,
        data_json: { ...message.data_json, providerResponse: result },
      }).eq('id', message.id);

      // Update ticket
      await supabase.from('tickets').update({
        last_message: messageBodyText,
        updated_at: new Date().toISOString(),
      }).eq('id', ticketId);

      return new Response(JSON.stringify({ 
        success: true, 
        messageId: message.id,
        wid: messageWid,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.error('[send-interactive] All endpoints failed:', lastError);

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
