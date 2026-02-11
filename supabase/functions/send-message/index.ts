// supabase/functions/send-message/index.ts (REFATORADO — Multi-Provider)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMessage as sendViaProvider, type WhatsAppConnection } from "../_shared/providers.ts";

// Input validation helpers
function isValidUUID(str: string | null | undefined): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidUrl(str: string | null | undefined): boolean {
  if (!str) return true;
  try { new URL(str); return true; } catch { return false; }
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

function validateRequestBody(body: unknown): { valid: true; data: SendMessageBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be an object' };
  }

  const b = body as Record<string, unknown>;

  if (!b.ticketId || typeof b.ticketId !== 'string' || !isValidUUID(b.ticketId)) {
    return { valid: false, error: 'ticketId must be a valid UUID' };
  }

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('send-message: Starting...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const isServiceRoleCall = token === supabaseKey;

    let user = null;
    if (!isServiceRoleCall) {
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      user = authData?.user;
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Parse body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validation = validateRequestBody(rawBody);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { ticketId, body: messageBody, mediaUrl, originalMediaUrl, providerMediaUrl, mediaType, mimeType, fileName, quotedMsgId } = validation.data;

    // Ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*, contact:contacts(*)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) throw new Error('Ticket not found');

    // Permission check
    let profile: any = null;
    if (!isServiceRoleCall && user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
      profile = p;
      if (profile?.company_id !== ticket.company_id) throw new Error('Access denied');
    }

    // WhatsApp connection (with UazAPI fields)
    let { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, company_id, provider, instance_id, status, phone_number_id, access_token, uazapi_url, uazapi_token, uazapi_instance_id')
      .eq('id', ticket.whatsapp_id)
      .single();

    // Fallback: active connection for company
    if (!whatsapp || whatsapp.status !== 'CONNECTED') {
      const { data: active } = await supabase
        .from('whatsapps')
        .select('id, company_id, provider, instance_id, status, phone_number_id, access_token, uazapi_url, uazapi_token, uazapi_instance_id')
        .eq('company_id', ticket.company_id)
        .eq('status', 'CONNECTED')
        .order('is_default', { ascending: false })
        .limit(1)
        .single();

      if (active) {
        whatsapp = active;
        await supabase.from('tickets').update({ whatsapp_id: whatsapp.id }).eq('id', ticketId);
      }
    }

    // Build remoteJid
    const contactNumber = ticket.contact.number;
    const isGroupChat = ticket.is_group || contactNumber?.includes('@g.us');
    const remoteJid = isGroupChat
      ? `${contactNumber.split('@')[0]}@g.us`
      : `${contactNumber.replace(/\D/g, '')}@s.whatsapp.net`;

    // ============================================
    // ENVIAR VIA PROVIDER (UazAPI ou COEX)
    // ============================================
    let messageWid: string | undefined;
    let ackStatus = 0;
    let providerError: any = null;

    if (whatsapp?.status === 'CONNECTED') {
      const result = await sendViaProvider(whatsapp as WhatsAppConnection, {
        to: remoteJid,
        body: messageBody,
        mediaUrl: mediaUrl || providerMediaUrl,
        mediaType,
        mimeType,
        fileName,
        quotedMsgId,
        isGroup: isGroupChat
      });

      if (result.success) {
        messageWid = result.messageId;
        ackStatus = 1;
      } else {
        providerError = { provider: result.provider, message: result.error };
        ackStatus = -1;
      }
    } else {
      providerError = { message: 'Nenhuma conexão WhatsApp ativa' };
      ackStatus = -1;
    }

    // Save message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        contact_id: ticket.contact_id,
        company_id: ticket.company_id,
        body: messageBody || '',
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

    if (messageError) throw new Error('Failed to create message');

    // Update ticket and contact
    await supabase.from('tickets').update({
      last_message: messageBody,
      updated_at: new Date().toISOString(),
      user_id: profile?.user_id,
    }).eq('id', ticketId);

    await supabase.from('contacts').update({
      last_interaction_at: new Date().toISOString(),
    }).eq('id', ticket.contact_id);

    return new Response(JSON.stringify({
      success: ackStatus >= 0,
      message,
      error: providerError?.message,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('send-message Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
