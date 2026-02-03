import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
  buttons?: Array<{
    type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
    text: string;
    url?: string;
    phone_number?: string;
  }>;
}

interface CreateTemplateRequest {
  whatsappId: string;
  name: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  components: TemplateComponent[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's company
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error('User profile not found');
    }

    const body: CreateTemplateRequest = await req.json();
    const { whatsappId, name, language, category, components } = body;

    console.log('[Create Template] Starting...', { whatsappId, name, language, category });

    // Validate template name (lowercase, alphanumeric, underscores only)
    const nameRegex = /^[a-z][a-z0-9_]*$/;
    if (!nameRegex.test(name)) {
      throw new Error('Nome do template deve conter apenas letras minúsculas, números e underscores, começando com letra');
    }

    if (name.length < 1 || name.length > 512) {
      throw new Error('Nome do template deve ter entre 1 e 512 caracteres');
    }

    // Get global NotificaMe config
    const globalConfig = await getGlobalConfig(supabase);
    if (!globalConfig) {
      throw new Error('WhatsApp não configurado. Contate o administrador.');
    }

    // Get WhatsApp connection
    const { data: whatsapp, error: waError } = await supabase
      .from('whatsapps')
      .select('id, instance_id, company_id')
      .eq('id', whatsappId)
      .eq('company_id', profile.company_id)
      .single();

    if (waError || !whatsapp) {
      throw new Error('WhatsApp connection not found');
    }

    if (!whatsapp.instance_id) {
      throw new Error('Token do canal não vinculado');
    }

    // Build template payload
    const templatePayload = {
      name,
      language,
      category,
      components: components.map(comp => {
        const component: any = { type: comp.type };

        if (comp.type === 'HEADER') {
          component.format = comp.format || 'TEXT';
          if (comp.text) {
            component.text = comp.text;
          }
          if (comp.example?.header_text) {
            component.example = { header_text: comp.example.header_text };
          }
        } else if (comp.type === 'BODY') {
          component.text = comp.text;
          if (comp.example?.body_text) {
            component.example = { body_text: comp.example.body_text };
          }
        } else if (comp.type === 'FOOTER') {
          component.text = comp.text;
        } else if (comp.type === 'BUTTONS') {
          component.buttons = comp.buttons;
        }

        return component;
      }),
    };

    console.log('[Create Template] Payload:', JSON.stringify(templatePayload));

    // Call NotificaMe Hub API to create template
    const endpoints = [
      `${globalConfig.apiUrl}/v1/templates/${whatsapp.instance_id}`,
      `${globalConfig.apiUrl}/templates/${whatsapp.instance_id}`,
    ];

    let result: any = null;
    let lastError = '';

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'X-Api-Token': globalConfig.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(templatePayload),
        });

        const data = await response.json().catch(() => ({}));
        console.log('[Create Template] Response:', response.status, JSON.stringify(data));

        if (response.ok) {
          result = data;
          break;
        }

        lastError = data.error?.message || data.message || 'Failed to create template';
      } catch (e) {
        lastError = e instanceof Error ? e.message : 'Network error';
      }
    }

    if (!result) {
      throw new Error(lastError);
    }

    // Save template to database with PENDING status
    const { data: savedTemplate, error: saveError } = await supabase
      .from('message_templates')
      .insert({
        template_id: result.id || name,
        name,
        language,
        category,
        status: result.status || 'PENDING',
        components,
        company_id: profile.company_id,
        whatsapp_id: whatsappId,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (saveError) {
      console.error('[Create Template] Save error:', saveError);
      return new Response(JSON.stringify({
        success: true,
        template_id: result.id,
        status: result.status,
        warning: 'Template criado, mas falha ao salvar localmente. Sincronize os templates.',
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Create Template] Success:', savedTemplate.id);

    return new Response(JSON.stringify({
      success: true,
      template_id: result.id,
      status: result.status,
      local_id: savedTemplate.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[Create Template] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
