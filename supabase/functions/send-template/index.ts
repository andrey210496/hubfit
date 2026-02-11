// supabase/functions/send-template/index.ts (REFATORADO — Multi-Provider)
// Templates WhatsApp: Meta Cloud API (nativo) + UazAPI (via text fallback)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { sendMessage as sendViaProvider, type WhatsAppConnection } from "../_shared/providers.ts";

const GLOBAL_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) throw new Error('User has no company');

    const isSuperAdmin = profile.company_id === GLOBAL_COMPANY_ID;

    const body = await req.json();
    const {
      templateId, contactId, ticketId, phoneNumber,
      variables = {}, headerParams = [], bodyParams = [], buttonParams = [],
    } = body;

    console.log('[Send Template] Starting...', { templateId, contactId, ticketId });

    // Get template
    let templateQuery = supabase.from('message_templates').select('*').eq('id', templateId);
    if (!isSuperAdmin) templateQuery = templateQuery.eq('company_id', profile.company_id);

    const { data: template, error: templateError } = await templateQuery.single();
    if (templateError || !template) throw new Error('Template not found');
    if (template.status !== 'APPROVED') throw new Error(`Template not approved: ${template.status}`);

    // Get WhatsApp connection (with UazAPI fields)
    let whatsapp = null;

    if (template.whatsapp_id) {
      const { data: w } = await supabase
        .from('whatsapps')
        .select('id, company_id, provider, instance_id, waba_id, access_token, phone_number_id, status, uazapi_url, uazapi_token, uazapi_instance_id')
        .eq('id', template.whatsapp_id)
        .eq('status', 'CONNECTED')
        .maybeSingle();
      if (w) whatsapp = w;
    }

    if (!whatsapp) {
      let q = supabase
        .from('whatsapps')
        .select('id, company_id, provider, instance_id, waba_id, access_token, phone_number_id, status, uazapi_url, uazapi_token, uazapi_instance_id')
        .eq('status', 'CONNECTED')
        .order('is_default', { ascending: false })
        .limit(1);

      q = q.eq('company_id', isSuperAdmin ? template.company_id : profile.company_id);
      const { data: w } = await q.maybeSingle();
      whatsapp = w;
    }

    if (!whatsapp) throw new Error('Nenhuma conexão WhatsApp ativa');

    // Get recipient phone
    let recipientPhone = phoneNumber;
    let contact = null;

    if (contactId) {
      const { data: c } = await supabase.from('contacts').select('*').eq('id', contactId).single();
      if (c) {
        contact = c;
        recipientPhone = c.number.replace('@s.whatsapp.net', '').replace('@g.us', '');
      }
    }
    if (!recipientPhone) throw new Error('Phone number is required');

    recipientPhone = recipientPhone.replace(/\D/g, '');
    if (recipientPhone.length === 10 || recipientPhone.length === 11) {
      recipientPhone = '55' + recipientPhone;
    }

    // Build message body from template
    const templateComponents = template.components as any[];
    const bodyComponent = templateComponents?.find((c: any) => c.type === 'BODY');
    let messageBody = `[Template: ${template.name}]`;
    if (bodyComponent?.text) {
      let text = bodyComponent.text;
      bodyParams.forEach((param: any, index: number) => {
        const value = typeof param === 'object' ? param.value || param.text : param;
        text = text.replace(`{{${index + 1}}}`, value || '-');
      });
      messageBody = text;
    }

    // === SEND ===
    let result: any = null;
    let lastError = '';
    const provider = (whatsapp.provider || '').toLowerCase();
    const hasMetaConnection = whatsapp.waba_id && whatsapp.access_token;

    // Meta Cloud API: native template support
    if (hasMetaConnection && (provider === 'coex' || provider === 'cloud_api' || provider === 'meta' || provider === '')) {
      const metaComponents: any[] = [];

      if (headerParams.length > 0) {
        metaComponents.push({
          type: 'header',
          parameters: headerParams.map((p: any) => {
            if (p.type === 'image') return { type: 'image', image: { link: p.value } };
            if (p.type === 'video') return { type: 'video', video: { link: p.value } };
            if (p.type === 'document') return { type: 'document', document: { link: p.value, filename: p.filename } };
            return { type: 'text', text: p.value || p || '-' };
          }),
        });
      }

      if (bodyParams.length > 0) {
        metaComponents.push({
          type: 'body',
          parameters: bodyParams.map((p: any) => ({
            type: 'text',
            text: String(typeof p === 'object' ? (p.value ?? p.text ?? '') : (p ?? '')) || '-'
          })),
        });
      }

      for (let i = 0; i < buttonParams.length; i++) {
        if (buttonParams[i]?.value) {
          metaComponents.push({
            type: 'button',
            sub_type: buttonParams[i].type || 'url',
            index: String(i),
            parameters: [{ type: 'text', text: buttonParams[i].value }],
          });
        }
      }

      const metaPayload = {
        messaging_product: 'whatsapp',
        to: recipientPhone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language || 'pt_BR' },
          components: metaComponents.length > 0 ? metaComponents : undefined,
        },
      };

      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${whatsapp.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaPayload),
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
    // UazAPI: send template as text (fallback)
    else if (provider === 'uazapi') {
      const sendResult = await sendViaProvider(whatsapp as WhatsAppConnection, {
        to: recipientPhone,
        body: messageBody,
      });

      if (sendResult.success) {
        result = { id: sendResult.messageId };
      } else {
        lastError = sendResult.error || 'Falha ao enviar via UazAPI';
      }
    } else {
      lastError = 'Nenhum provider configurado para envio de template';
    }

    if (!result) throw new Error(lastError || 'Falha ao enviar template');

    const messageWid = result.id || result.messageId;

    // Save message
    const { data: message } = await supabase
      .from('messages')
      .insert({
        ticket_id: ticketId,
        contact_id: contactId,
        company_id: profile.company_id,
        wid: messageWid,
        body: messageBody,
        from_me: true,
        ack: 1,
        media_type: 'template',
        data_json: {
          templateId: template.id, templateName: template.name,
          templateLanguage: template.language,
          variables, headerParams, bodyParams, buttonParams,
          providerResponse: result,
        },
      })
      .select()
      .single();

    // Template send record
    await supabase.from('template_sends').insert({
      company_id: profile.company_id,
      template_id: template.id,
      contact_id: contactId,
      ticket_id: ticketId,
      message_id: message?.id,
      variables: { headerParams, bodyParams, buttonParams },
      status: 'sent',
      sent_at: new Date().toISOString(),
    });

    // Update ticket
    if (ticketId) {
      await supabase.from('tickets').update({
        last_message: messageBody,
        updated_at: new Date().toISOString(),
      }).eq('id', ticketId);
    }

    return new Response(JSON.stringify({ success: true, messageId: messageWid, message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Send Template] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
