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

    // Get user profile and company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User has no company');
    }

    // Check if user is super admin (linked to global company)
    const isSuperAdmin = profile.company_id === GLOBAL_COMPANY_ID;

    const body = await req.json();
    const { whatsappId } = body;

    console.log('[Sync Templates] Request for whatsappId:', whatsappId, 'company_id:', profile.company_id);

    // Get global NotificaMe config (optional, only needed for NotificaMe connections)
    const globalConfig = await getGlobalConfig(supabase);

    // Get WhatsApp connection - try with company filter first
    const { data: whatsapp, error: whatsappError } = await supabase
      .from('whatsapps')
      .select('*')
      .eq('id', whatsappId)
      .maybeSingle();

    console.log('[Sync Templates] WhatsApp query result:', whatsapp ? 'found' : 'not found', whatsappError);

    if (whatsappError || !whatsapp) {
      throw new Error('WhatsApp connection not found');
    }

    // Verify user has access to this connection (super admins can access all)
    if (!isSuperAdmin && whatsapp.company_id !== profile.company_id) {
      throw new Error('Access denied to this WhatsApp connection');
    }

    let templates: any[] = [];
    let fetchError = '';

    // Check if it's a Meta Cloud API connection
    if (whatsapp.waba_id && whatsapp.access_token) {
      console.log('[Sync Templates] Fetching templates from Meta Cloud API for WABA:', whatsapp.waba_id);
      
      try {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${whatsapp.waba_id}/message_templates`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${whatsapp.access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = await response.json().catch(() => ({}));

        if (response.ok) {
          templates = data.data || [];
        } else {
          fetchError = data.error?.message || `HTTP ${response.status}`;
        }
      } catch (e) {
        fetchError = e instanceof Error ? e.message : 'Network error';
      }
    } 
    // Fallback to NotificaMe Hub
    else if (whatsapp.instance_id) {
      if (!globalConfig) {
        throw new Error('NotificaMe Hub não configurado. Contate o administrador.');
      }

      console.log('[Sync Templates] Fetching templates from NotificaMe Hub for channel:', whatsapp.instance_id);

      const endpoints = [
        `${globalConfig.apiUrl}/v1/templates/${whatsapp.instance_id}`,
        `${globalConfig.apiUrl}/templates/${whatsapp.instance_id}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'X-Api-Token': globalConfig.apiKey,
              'Content-Type': 'application/json',
            },
          });

          const data = await response.json().catch(() => ({}));

          if (response.ok) {
            templates = data.data || data.templates || data || [];
            if (Array.isArray(templates)) {
              break;
            }
          }

          fetchError = data.message || data.error || `HTTP ${response.status}`;
        } catch (e) {
          fetchError = e instanceof Error ? e.message : 'Network error';
        }
      }
    } else {
      throw new Error('Conexão não configurada. Configure o WABA ID e Access Token ou o Token do Canal.');
    }

    console.log(`[Sync Templates] Found ${templates.length} templates`);

    // Sync templates to database
    let synced = 0;
    let errors = 0;

    for (const template of templates) {
      try {
        const templateData = {
          company_id: profile.company_id,
          whatsapp_id: whatsapp.id,
          template_id: template.id || template.name,
          name: template.name,
          language: template.language || 'pt_BR',
          category: template.category || 'UTILITY',
          status: template.status || 'APPROVED',
          components: template.components || [],
          quality_score: template.quality_score || null,
          rejected_reason: template.rejected_reason || null,
          last_synced_at: new Date().toISOString(),
        };

        const { error: upsertError } = await supabase
          .from('message_templates')
          .upsert(templateData, {
            onConflict: 'company_id,template_id,language',
          });

        if (upsertError) {
          console.error('[Sync Templates] Upsert error:', upsertError);
          errors++;
        } else {
          synced++;
        }
      } catch (e) {
        console.error('[Sync Templates] Error processing template:', e);
        errors++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      synced,
      errors,
      total: templates.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Sync Templates] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
