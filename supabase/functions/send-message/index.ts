import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidUrl(str: string | null | undefined): boolean {
  if (!str) return true; // Optional field
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

function sanitizeString(str: string | null | undefined, maxLength: number = 10000): string {
  if (!str) return '';
  return String(str).slice(0, maxLength);
}

interface SendMessageBody {
  ticketId: string;
  body?: string;
  mediaUrl?: string;
  originalMediaUrl?: string;
  providerMediaUrl?: string;
  mediaType?: string;
  mimeType?: string;
  fileName?: string;
  quotedMsgId?: string;
}

const GLOBAL_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

interface NotificaMeConfig {
  apiUrl: string;
  apiKey: string;
}

async function getGlobalNotificaMeConfig(supabase: any): Promise<NotificaMeConfig | null> {
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

function validateRequestBody(body: unknown): { valid: true; data: SendMessageBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  // Required field
  if (!b.ticketId || typeof b.ticketId !== 'string' || !isValidUUID(b.ticketId)) {
    return { valid: false, error: 'ticketId must be a valid UUID' };
  }

  // Optional string fields
  if (b.body !== undefined && typeof b.body !== 'string') {
    return { valid: false, error: 'body must be a string' };
  }

  if (b.mediaUrl !== undefined && (typeof b.mediaUrl !== 'string' || !isValidUrl(b.mediaUrl))) {
    return { valid: false, error: 'mediaUrl must be a valid URL' };
  }

  if (b.quotedMsgId !== undefined && b.quotedMsgId !== null && typeof b.quotedMsgId !== 'string') {
    return { valid: false, error: 'quotedMsgId must be a string or null' };
  }

  return {
    valid: true,
    data: {
      ticketId: b.ticketId as string,
      body: sanitizeString(b.body as string | undefined, 10000),
      mediaUrl: b.mediaUrl as string | undefined,
      originalMediaUrl: b.originalMediaUrl as string | undefined,
      providerMediaUrl: b.providerMediaUrl as string | undefined,
      mediaType: sanitizeString(b.mediaType as string | undefined, 50),
      mimeType: sanitizeString(b.mimeType as string | undefined, 100),
      fileName: sanitizeString(b.fileName as string | undefined, 255),
      quotedMsgId: b.quotedMsgId as string | undefined,
    }
  };
}

async function sendToNotificaMe(
  config: NotificaMeConfig,
  channelId: string,
  params: {
    to: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: string;
    quotedMsgId?: string;
    isGroup?: boolean;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Normalize the destination number
    const phoneNumber = params.to.replace('@s.whatsapp.net', '').replace('@g.us', '');

    // Build the contents array based on message type
    const contents: any[] = [];

    if (params.mediaUrl) {
      // Media message
      contents.push({
        type: 'file',
        fileUrl: params.mediaUrl,
        fileMimeType: params.mediaType || 'application/octet-stream',
        fileCaption: params.body || '',
      });
    } else if (params.body) {
      // Text message
      contents.push({
        type: 'text',
        text: params.body,
      });
    }

    const payload = {
      from: channelId,
      to: phoneNumber,
      contents: contents,
    };

    console.log('Sending to NotificaMe Hub:', JSON.stringify(payload));

    // Normalize base URL - remove trailing slash and /v1 if present
    const baseUrl = config.apiUrl.replace(/\/+$/, '').replace(/\/v1\/?$/, '');
    
    const endpoints = [
      `${baseUrl}/v1/channels/whatsapp/messages`,
      `${baseUrl}/channels/whatsapp/messages`,
    ];

    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-Api-Token': config.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          console.log('Message sent via NotificaMe Hub:', data);
          return { success: true, messageId: data.id || data.messageId };
        }

        console.error('NotificaMe Hub send failed:', endpoint, response.status, data);
        lastError = data.message || data.error || `HTTP ${response.status}`;
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    return { success: false, error: lastError || 'Falha ao enviar via NotificaMe Hub' };
  } catch (error) {
    console.error('NotificaMe Hub send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function normalizePhoneForMeta(to: string): string {
  const digits = String(to).replace(/\D/g, '');
  // Heuristic: if user number is BR local (10/11 digits), prefix 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

async function sendToMetaCloud(
  creds: { accessToken: string; phoneNumberId: string },
  params: {
    to: string;
    body?: string;
    mediaUrl?: string;
    mediaType?: string;
    fileName?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: any }> {
  try {
    const recipientPhone = normalizePhoneForMeta(params.to);

    const mediaUrl = params.mediaUrl;
    const mediaType = (params.mediaType || '').toLowerCase();

    const payload: any = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
    };

    if (mediaUrl) {
      // Media message (requires a publicly reachable URL)
      if (mediaType === 'image') {
        payload.type = 'image';
        payload.image = { link: mediaUrl, ...(params.body ? { caption: params.body } : {}) };
      } else if (mediaType === 'video') {
        payload.type = 'video';
        payload.video = { link: mediaUrl, ...(params.body ? { caption: params.body } : {}) };
      } else if (mediaType === 'audio') {
        payload.type = 'audio';
        payload.audio = { link: mediaUrl };
      } else {
        payload.type = 'document';
        payload.document = {
          link: mediaUrl,
          ...(params.fileName ? { filename: params.fileName } : {}),
          ...(params.body ? { caption: params.body } : {}),
        };
      }
    } else {
      // Text message
      payload.type = 'text';
      payload.text = {
        body: params.body?.length ? params.body : "\u200b",
        preview_url: false,
      };
    }

    console.log('send-message: Meta payload:', JSON.stringify(payload));

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${creds.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    console.log('send-message: Meta API response:', response.status, JSON.stringify(data));

    if (response.ok) {
      return { success: true, messageId: data.messages?.[0]?.id };
    }

    return {
      success: false,
      error: {
        provider: 'meta',
        status: response.status,
        ...(data?.error ? { metaError: data.error } : { message: `HTTP ${response.status}` }),
      },
    };
  } catch (error) {
    console.error('send-message: Meta API error:', error);
    return {
      success: false,
      error: { provider: 'meta', message: error instanceof Error ? error.message : 'Network error' },
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('send-message: Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if this is an internal service role call (from other edge functions)
    const isServiceRoleCall = token === supabaseKey;
    
    let user = null;
    if (!isServiceRoleCall) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      user = authData?.user;

      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // For service role calls, we trust the caller (internal edge functions)
    console.log('send-message: Auth type:', isServiceRoleCall ? 'service_role' : 'user');

    // Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validation = validateRequestBody(rawBody);
    if (!validation.valid) {
      console.error('send-message: Validation failed:', validation.error);
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const {
      ticketId,
      body: messageBody,
      mediaUrl,
      originalMediaUrl,
      providerMediaUrl,
      mediaType,
      mimeType,
      fileName,
      quotedMsgId,
    } = validation.data;
    
    // Check for @todos command to mention everyone in a group
    const mentionAllCommand = /@todos\b/i;
    const shouldMentionAll = mentionAllCommand.test(messageBody || '');
    const cleanedBody = (messageBody || '').replace(mentionAllCommand, '').trim();
    
    console.log('send-message: ticketId=', ticketId, 'messageBody=', messageBody?.substring(0, 100), 'mediaType=', mediaType);

    // Get ticket info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        contact:contacts(*)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('send-message: Ticket not found', ticketError);
      throw new Error('Ticket not found');
    }

    console.log('send-message: Ticket found, contact=', ticket.contact?.name);

    // Skip user profile check for service role calls (internal edge functions)
    let profile: any = null;
    if (!isServiceRoleCall && user) {
      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      profile = profileData;

      // Check if user belongs to the same company
      if (profile?.company_id !== ticket.company_id) {
        throw new Error('Access denied');
      }
    }

    // Use cleaned body (without @todos) for storage and sending
    const finalMessageBody = shouldMentionAll
      ? (cleanedBody || "\u200b")
      : (messageBody || "");

    // Determine if this is a group chat
    const isGroupChat = ticket.is_group || ticket.contact?.number?.includes('@g.us');
    const contactNumber = ticket.contact.number;
    
    // Build the correct remote_jid
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

    console.log('send-message: isGroup=', isGroupChat, 'contactNumber=', contactNumber, 'remoteJid=', remoteJid);

    // Get the WhatsApp connection for this ticket
    let { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, provider, instance_id, status, phone_number_id, access_token')
      .eq('id', ticket.whatsapp_id)
      .single();

    // If the ticket's whatsapp_id doesn't exist or is disconnected, try to find an active connection for the company
    if (!whatsapp || whatsapp.status !== 'CONNECTED') {
      console.log('send-message: Ticket WhatsApp not found or disconnected, looking for active connection...');
      const { data: activeWhatsapp } = await supabase
        .from('whatsapps')
        .select('id, provider, instance_id, status, phone_number_id, access_token')
        .eq('company_id', ticket.company_id)
        .eq('status', 'CONNECTED')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (activeWhatsapp) {
        whatsapp = activeWhatsapp;
        console.log('send-message: Using active connection:', whatsapp.id);

        // Update the ticket to use this connection for future messages
        await supabase
          .from('tickets')
          .update({ whatsapp_id: whatsapp.id })
          .eq('id', ticketId);
      }
    }

    console.log('send-message: WhatsApp connection=', whatsapp?.id, 'instance_id=', whatsapp?.instance_id, 'status=', whatsapp?.status);

    let messageWid: string | undefined;
    let ackStatus = 0; // Pending
    let providerError: any = null;

    // Send via NotificaMe Hub (global API key in header; channel id in payload)
    if (whatsapp?.status === 'CONNECTED' && whatsapp?.instance_id) {
      console.log('send-message: Sending via NotificaMe Hub...');

      const globalConfig = await getGlobalNotificaMeConfig(supabase);
      if (!globalConfig) {
        providerError = { provider: 'notificame', message: 'NotificaMe Hub não configurado. Contate o administrador.' };
        ackStatus = -1;
      } else {

        const sendResult = await sendToNotificaMe(globalConfig, whatsapp.instance_id, {
          to: remoteJid,
          body: finalMessageBody,
          mediaUrl: mediaUrl || providerMediaUrl,
          mediaType: mimeType || mediaType,
          quotedMsgId: quotedMsgId,
          isGroup: isGroupChat,
        });

        if (sendResult.success) {
          messageWid = sendResult.messageId;
          ackStatus = 1; // Sent
          console.log('send-message: Sent via NotificaMe Hub, messageId=', messageWid);
        } else {
          console.error('send-message: NotificaMe Hub failed:', sendResult.error);
          providerError = { provider: 'notificame', message: sendResult.error };
          ackStatus = -1; // Failed
        }
      }
    } else if (whatsapp?.status === 'CONNECTED' && whatsapp?.phone_number_id && whatsapp?.access_token) {
      console.log('send-message: Sending via Meta Cloud API...');

      if (isGroupChat) {
        providerError = { provider: 'meta', message: 'Envio para grupos não é suportado pela API oficial.' };
        ackStatus = -1;
      } else {
        const sendResult = await sendToMetaCloud(
          { accessToken: whatsapp.access_token, phoneNumberId: whatsapp.phone_number_id },
          {
            to: remoteJid,
            body: finalMessageBody,
            mediaUrl: mediaUrl || providerMediaUrl,
            mediaType: mediaType,
            fileName: fileName,
          }
        );

        if (sendResult.success) {
          messageWid = sendResult.messageId;
          ackStatus = 1;
          console.log('send-message: Sent via Meta Cloud API, messageId=', messageWid);
        } else {
          providerError = sendResult.error || { provider: 'meta', message: 'Falha ao enviar via API oficial.' };
          ackStatus = -1;
          console.error('send-message: Meta Cloud API failed:', providerError);
        }
      }
    } else {
      console.log('send-message: WhatsApp not connected');
      if (!whatsapp) {
        providerError = { message: 'Nenhuma conexão WhatsApp ativa encontrada para esta empresa.' };
      } else if (whatsapp.status !== 'CONNECTED') {
        providerError = { message: 'WhatsApp desconectado.' };
      } else {
        providerError = { message: 'Conexão sem credenciais de envio (token do canal / API oficial).' };
      }
      ackStatus = -1;
    }

    // Create message in database
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        contact_id: ticket.contact_id,
        company_id: ticket.company_id,
        body: finalMessageBody,
        from_me: true,
        media_url: mediaUrl || null,
        media_type: mediaType || 'text',
        quoted_msg_id: quotedMsgId || null,
        remote_jid: remoteJid,
        wid: messageWid || null,
        ack: ackStatus,
        data_json: {
          sentFromSystem: true,
          ...(providerError ? { providerError } : {}),
          ...(originalMediaUrl ? { originalMediaUrl } : {}),
          ...(providerMediaUrl ? { providerMediaUrl } : {}),
          ...(mimeType ? { mimeType } : {}),
        },
      })
      .select()
      .single();

    if (messageError) {
      console.error('send-message: Failed to create message', messageError);
      throw new Error('Failed to create message');
    }

    console.log('send-message: Message created in DB, id=', message.id);

    // Update ticket
    await supabase
      .from('tickets')
      .update({
        last_message: finalMessageBody,
        updated_at: new Date().toISOString(),
        user_id: profile?.user_id,
      })
      .eq('id', ticketId);

    // Update contact last interaction
    await supabase
      .from('contacts')
      .update({
        last_interaction_at: new Date().toISOString(),
      })
      .eq('id', ticket.contact_id);

    return new Response(JSON.stringify({ 
      success: ackStatus >= 0, 
      message,
      error: providerError?.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-message: Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
