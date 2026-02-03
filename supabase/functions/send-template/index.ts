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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User has no company');
    }

    // Check if user is super admin
    const isSuperAdmin = profile.company_id === GLOBAL_COMPANY_ID;

    const body = await req.json();
    const {
      templateId,
      contactId,
      ticketId,
      phoneNumber,
      variables = {},
      headerParams = [],
      bodyParams = [],
      buttonParams = [],
    } = body;

    console.log('[Send Template] Starting...', { templateId, contactId, ticketId, phoneNumber, isSuperAdmin });

    // Get template - super admins can access any template
    let templateQuery = supabase
      .from('message_templates')
      .select('*')
      .eq('id', templateId);
    
    if (!isSuperAdmin) {
      templateQuery = templateQuery.eq('company_id', profile.company_id);
    }

    const { data: template, error: templateError } = await templateQuery.single();

    if (templateError || !template) {
      throw new Error('Template not found');
    }

    if (template.status !== 'APPROVED') {
      throw new Error(`Template not approved. Status: ${template.status}`);
    }

    // Get WhatsApp connection - prioritize by template's whatsapp_id or find any active
    let whatsapp = null;
    
    // First try to get the WhatsApp linked to the template
    if (template.whatsapp_id) {
      const { data: templateWhatsapp } = await supabase
        .from('whatsapps')
        .select('id, instance_id, waba_id, access_token, phone_number_id, status')
        .eq('id', template.whatsapp_id)
        .eq('status', 'CONNECTED')
        .maybeSingle();
      
      if (templateWhatsapp) {
        whatsapp = templateWhatsapp;
      }
    }

    // If no specific whatsapp, find any active connection for the company
    if (!whatsapp) {
      let whatsappQuery = supabase
        .from('whatsapps')
        .select('id, instance_id, waba_id, access_token, phone_number_id, status')
        .eq('status', 'CONNECTED')
        .order('is_default', { ascending: false })
        .limit(1);

      if (!isSuperAdmin) {
        whatsappQuery = whatsappQuery.eq('company_id', profile.company_id);
      } else {
        // Super admin: get connection from template's company
        whatsappQuery = whatsappQuery.eq('company_id', template.company_id);
      }

      const { data: foundWhatsapp } = await whatsappQuery.maybeSingle();
      whatsapp = foundWhatsapp;
    }

    // Check if we have a valid connection
    const hasMetaConnection = whatsapp?.waba_id && whatsapp?.access_token;
    const hasNotificaMeConnection = whatsapp?.instance_id;

    if (!whatsapp || (!hasMetaConnection && !hasNotificaMeConnection)) {
      throw new Error('Nenhuma conexão WhatsApp ativa encontrada');
    }

    // Get phone number
    let recipientPhone = phoneNumber;
    let contact = null;

    if (contactId) {
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();
      
      if (contactData) {
        contact = contactData;
        recipientPhone = contactData.number.replace('@s.whatsapp.net', '').replace('@g.us', '');
      }
    }

    if (!recipientPhone) {
      throw new Error('Phone number is required');
    }

    // Clean phone number - remove non-digits
    recipientPhone = recipientPhone.replace(/\D/g, '');

    // Ensure Brazilian numbers have country code
    if (recipientPhone.length === 10 || recipientPhone.length === 11) {
      // Brazilian number without country code (10 or 11 digits)
      recipientPhone = '55' + recipientPhone;
    } else if (recipientPhone.length === 12 || recipientPhone.length === 13) {
      // Already has country code, validate it starts with 55 for Brazil
      if (!recipientPhone.startsWith('55')) {
        // Other country, keep as is
      }
    }

    console.log('[Send Template] Formatted phone:', recipientPhone);

    let lastError = '';
    let result: any = null;

    // Send via Meta Cloud API if available
    if (hasMetaConnection) {
      console.log('[Send Template] Sending via Meta Cloud API');

      const metaComponents: any[] = [];

      // Add header parameters
      if (headerParams.length > 0) {
        metaComponents.push({
          type: 'header',
          parameters: headerParams.map((param: any) => {
            if (param.type === 'image') {
              return { type: 'image', image: { link: param.value } };
            } else if (param.type === 'video') {
              return { type: 'video', video: { link: param.value } };
            } else if (param.type === 'document') {
              return { type: 'document', document: { link: param.value, filename: param.filename } };
            }
            return { type: 'text', text: param.value || param || '-' };
          }),
        });
      }

      // Add body parameters
      if (bodyParams.length > 0) {
        metaComponents.push({
          type: 'body',
          parameters: bodyParams.map((param: any) => {
            let textValue: string;
            if (typeof param === 'object' && param !== null) {
              textValue = String(param.value ?? param.text ?? '');
            } else {
              textValue = String(param ?? '');
            }
            return { type: 'text', text: textValue || '-' };
          }),
        });
      }

      // Add button parameters
      for (let i = 0; i < buttonParams.length; i++) {
        const buttonParam = buttonParams[i];
        if (buttonParam && buttonParam.value) {
          metaComponents.push({
            type: 'button',
            sub_type: buttonParam.type || 'url',
            index: String(i),
            parameters: [{ type: 'text', text: buttonParam.value }],
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

      console.log('[Send Template] Meta payload:', JSON.stringify(metaPayload));

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

        console.log('[Send Template] Meta API response:', response.status, JSON.stringify(data));

        if (response.ok) {
          result = { id: data.messages?.[0]?.id, ...data };
          console.log('[Send Template] Message sent successfully, ID:', result.id);
        } else {
          lastError = data.error?.message || `HTTP ${response.status}`;
          console.log('[Send Template] Meta API error:', response.status, data);
        }
      } catch (e) {
        console.log('[Send Template] Meta API error:', e);
        lastError = e instanceof Error ? e.message : 'Network error';
      }
    }
    // Fallback to NotificaMe Hub
    else if (hasNotificaMeConnection) {
      console.log('[Send Template] Sending via NotificaMe Hub');

      const globalConfig = await getGlobalConfig(supabase);
      if (!globalConfig) {
        throw new Error('NotificaMe Hub não configurado. Contate o administrador.');
      }

      const templateContent: any = {
        type: 'template',
        template: {
          name: template.name,
          language: {
            policy: 'deterministic',
            code: template.language || 'pt_BR',
          },
          components: [],
        },
      };

      // Add header parameters
      if (headerParams.length > 0) {
        templateContent.template.components.push({
          type: 'header',
          parameters: headerParams.map((param: any) => {
            if (param.type === 'image') {
              return { type: 'image', image: { link: param.value } };
            } else if (param.type === 'video') {
              return { type: 'video', video: { link: param.value } };
            } else if (param.type === 'document') {
              return { type: 'document', document: { link: param.value, filename: param.filename } };
            }
            return { type: 'text', text: param.value || param || '-' };
          }),
        });
      }

      // Add body parameters
      if (bodyParams.length > 0) {
        templateContent.template.components.push({
          type: 'body',
          parameters: bodyParams.map((param: any) => {
            let textValue: string;
            if (typeof param === 'object' && param !== null) {
              textValue = String(param.value ?? param.text ?? '');
            } else {
              textValue = String(param ?? '');
            }
            return { type: 'text', text: textValue || '-' };
          }),
        });
      }

      // Add button parameters
      for (let i = 0; i < buttonParams.length; i++) {
        const buttonParam = buttonParams[i];
        if (buttonParam && buttonParam.value) {
          templateContent.template.components.push({
            type: 'button',
            sub_type: buttonParam.type || 'url',
            index: i,
            parameters: [{ type: 'text', text: buttonParam.value }],
          });
        }
      }

      const payload = {
        from: whatsapp.instance_id,
        to: recipientPhone,
        contents: [templateContent],
      };

      console.log('[Send Template] NotificaMe payload:', JSON.stringify(payload));

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
            result = data;
            break;
          }

          lastError = data.message || data.error || `HTTP ${response.status}`;
          console.log(`[Send Template] NotificaMe endpoint ${endpoint} failed:`, response.status, data);
        } catch (e) {
          console.log(`[Send Template] NotificaMe endpoint ${endpoint} error:`, e);
          lastError = e instanceof Error ? e.message : 'Network error';
        }
      }
    }

    if (!result) {
      throw new Error(lastError || 'Falha ao enviar template');
    }

    const messageWid = result.id || result.messageId;

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

    // Create message record
    const { data: message, error: messageError } = await supabase
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
          templateId: template.id,
          templateName: template.name,
          templateLanguage: template.language,
          variables,
          headerParams,
          bodyParams,
          buttonParams,
          providerResponse: result,
        },
      })
      .select()
      .single();

    // Create template send record
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

    return new Response(JSON.stringify({
      success: true,
      messageId: messageWid,
      message,
    }), {
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
