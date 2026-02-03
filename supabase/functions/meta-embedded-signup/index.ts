import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Meta App credentials
// Prefer Lovable Cloud secrets (META_*). Keep FB_* for backward compatibility.
const ENV_META_APP_ID = Deno.env.get('META_APP_ID') || Deno.env.get('FB_APP_ID') || '';
const ENV_META_APP_SECRET = Deno.env.get('META_APP_SECRET') || Deno.env.get('FB_APP_SECRET') || '';

const GLOBAL_CONFIG_COMPANY_ID = '00000000-0000-0000-0000-000000000000';
const GRAPH_VERSION = 'v21.0';

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(payload: Record<string, unknown> = {}) {
  return jsonResponse({ success: true, ...payload }, 200);
}

// For user-fixable errors, we keep 200 and return { success:false }
// so the web app doesn't surface the generic "non-2xx" Functions error.
function fail(message: string, details?: unknown) {
  return jsonResponse({ success: false, error: message, details }, 200);
}

async function loadMetaConfig(supabase: any) {
  const { data: settings, error } = await supabase
    .from('campaign_settings')
    .select('key, value')
    .eq('company_id', GLOBAL_CONFIG_COMPANY_ID)
    .in('key', ['meta_app_id', 'meta_config_id', 'meta_app_secret']);

  if (error) throw error;

  const cfg: Record<string, string> = {};
  const settingsArr = (settings ?? []) as Array<{ key: string; value: string | null }>;
  settingsArr.forEach((s) => {
    cfg[s.key] = s.value || '';
  });

  return {
    appId: cfg.meta_app_id || ENV_META_APP_ID,
    configId: cfg.meta_config_id || '',
    // Prefer secret from Lovable Cloud secrets; allow legacy DB setting if present.
    appSecret: ENV_META_APP_SECRET || cfg.meta_app_secret || '',
  };
}

interface EmbeddedSignupResponse {
  access_token: string;
  data_access_expiration_time: number;
  expires_in: number;
}

interface WABAInfo {
  id: string;
  name: string;
  currency: string;
  timezone_id: string;
  message_template_namespace: string;
}

interface PhoneNumberInfo {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[meta-embedded-signup] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const { action, code, connectionId } = body;
    
    console.log('[meta-embedded-signup] action=', action);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return fail('User profile not found');
    }

    if (action === 'get_config') {
      // Return Meta App config for frontend
      const meta = await loadMetaConfig(supabase);
      if (!meta.appId) return fail('Meta App ID não configurado');
      return ok({
        config: {
          appId: meta.appId,
          configId: meta.configId,
        },
      });
    }

    if (action === 'exchange_token') {
      // Exchange short-lived token for long-lived token
      if (!code) {
        return fail('Authorization code is required');
      }

      console.log('[meta-embedded-signup] Exchanging token...');

      const meta = await loadMetaConfig(supabase);

      if (!meta.appId) return fail('Meta App ID não configurado');
      if (!meta.appSecret) return fail('Meta App Secret não configurado');

      // Exchange code for access token
      const tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${meta.appId}&client_secret=${meta.appSecret}&code=${code}`;
      
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        console.error('[meta-embedded-signup] Token exchange error:', tokenData.error);
        return fail(tokenData.error.message || 'Token exchange failed', tokenData.error);
      }

      const shortLivedToken = tokenData.access_token;

      // Exchange for long-lived token
      const longLivedUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${meta.appId}&client_secret=${meta.appSecret}&fb_exchange_token=${shortLivedToken}`;
      
      const longLivedResponse = await fetch(longLivedUrl);
      const longLivedData = await longLivedResponse.json();

      if (longLivedData.error) {
        console.error('[meta-embedded-signup] Long-lived token error:', longLivedData.error);
        return fail(longLivedData.error.message || 'Long-lived token exchange failed', longLivedData.error);
      }

      const accessToken = longLivedData.access_token;

      console.log('[meta-embedded-signup] Token exchanged successfully');

      return ok({
        accessToken,
        expiresIn: longLivedData.expires_in,
      });
    }

    if (action === 'complete_signup') {
      // Complete the signup process with WABA and phone info
      const { accessToken, wabaId, phoneNumberId, connectionName } = body;

      if (!accessToken || !wabaId || !phoneNumberId) {
        return fail('Missing required fields: accessToken, wabaId, phoneNumberId');
      }

      console.log('[meta-embedded-signup] Completing signup for WABA:', wabaId);

      // Fetch WABA info
      const wabaResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}?fields=id,name,currency,timezone_id,message_template_namespace`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const wabaInfo: WABAInfo = await wabaResponse.json();

      if (wabaInfo.id) {
        console.log('[meta-embedded-signup] WABA info:', wabaInfo.name);
      }

      // Fetch phone number info
      const phoneResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      const phoneInfo: PhoneNumberInfo = await phoneResponse.json();

      if (phoneInfo.id) {
        console.log('[meta-embedded-signup] Phone:', phoneInfo.display_phone_number);
      }

      // Create or update WhatsApp connection
      // Note: The whatsapps table uses phone_number_id (not phone_number)
      // The display_phone_number is stored in the connection name for reference
      const connectionData = {
        company_id: profile.company_id,
        name: connectionName || phoneInfo.verified_name || `WhatsApp ${phoneInfo.display_phone_number}`,
        status: 'CONNECTED',
        provider: 'cloud_api',
        waba_id: wabaId,
        phone_number_id: phoneNumberId,
        access_token: accessToken,
        quality_rating: phoneInfo.quality_rating,
        quality_rating_updated_at: new Date().toISOString(),
      };

      let connection;
      if (connectionId) {
        // Update existing connection
        const { data, error } = await supabase
          .from('whatsapps')
          .update(connectionData)
          .eq('id', connectionId)
          .eq('company_id', profile.company_id)
          .select()
          .single();

        if (error) throw error;
        connection = data;
      } else {
        // Create new connection
        const { data, error } = await supabase
          .from('whatsapps')
          .insert({
            ...connectionData,
            is_default: false,
          })
          .select()
          .single();

        if (error) throw error;
        connection = data;
      }

      // Subscribe webhook for this WABA (optional - depends on Meta config)
      try {
        const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;
        await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/subscribed_apps`,
          {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
          }
        );
        console.log('[meta-embedded-signup] Webhook subscribed');
      } catch (webhookError) {
        console.warn('[meta-embedded-signup] Webhook subscription warning:', webhookError);
      }

      console.log('[meta-embedded-signup] Signup completed successfully');

      return ok({
        connection: {
          id: connection.id,
          name: connection.name,
          phoneNumber: phoneInfo.display_phone_number,
          qualityRating: phoneInfo.quality_rating,
        },
      });
    }

    if (action === 'get_waba_info') {
      // Get WABA and phone numbers from access token
      const { accessToken } = body;

      if (!accessToken) {
        return fail('Access token is required');
      }

      console.log('[meta-embedded-signup] Fetching WABA info...');

      // Get business info
      const debugResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${accessToken}&access_token=${accessToken}`
      );
      const debugData = await debugResponse.json();

      // Get WABAs from businesses the user has access to.
      // NOTE: Some setups expose WABAs as "owned"; agencies/partners may see them as "client".
      const wabasResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}},client_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name,quality_rating}}&access_token=${accessToken}`
      );
      const wabasData = await wabasResponse.json();

      if (wabasData?.error) {
        console.error('[meta-embedded-signup] get_waba_info Graph error:', wabasData.error);
        return fail(wabasData.error.message || 'Falha ao carregar contas WhatsApp Business', wabasData.error);
      }

      const wabas: any[] = [];

      const pushWabasFromField = (
        business: any,
        fieldName: 'owned_whatsapp_business_accounts' | 'client_whatsapp_business_accounts'
      ) => {
        const container = business?.[fieldName];
        const list = container?.data;
        if (!Array.isArray(list) || list.length === 0) return;

        for (const waba of list) {
          wabas.push({
            wabaId: waba.id,
            wabaName: waba.name,
            businessId: business.id,
            businessName: business.name,
            phoneNumbers: waba.phone_numbers?.data || [],
            relationship: fieldName === 'owned_whatsapp_business_accounts' ? 'owned' : 'client',
          });
        }
      };
      
      if (wabasData.data) {
        for (const business of wabasData.data) {
          pushWabasFromField(business, 'owned_whatsapp_business_accounts');
          pushWabasFromField(business, 'client_whatsapp_business_accounts');
        }
      }

      console.log('[meta-embedded-signup] get_waba_info result', {
        businesses: Array.isArray(wabasData?.data) ? wabasData.data.length : 0,
        wabas: wabas.length,
      });

      return ok({
        wabas,
        tokenInfo: debugData.data,
      });
    }

    if (action === 'get_phone_details') {
      // Get phone number details when we have session info from Embedded Signup
      const { accessToken, wabaId, phoneNumberId } = body;

      if (!accessToken || !wabaId || !phoneNumberId) {
        return fail('accessToken, wabaId, and phoneNumberId are required');
      }

      console.log('[meta-embedded-signup] Getting phone details for:', { wabaId, phoneNumberId });

      // Get WABA info
      const wabaResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}?fields=id,name,owner_business_info{id,name}&access_token=${accessToken}`
      );
      const wabaData = await wabaResponse.json();

      if (wabaData.error) {
        console.error('[meta-embedded-signup] WABA fetch error:', wabaData.error);
        return fail(wabaData.error.message || 'Failed to fetch WABA info');
      }

      // Get phone number info
      const phoneResponse = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${accessToken}`
      );
      const phoneData = await phoneResponse.json();

      if (phoneData.error) {
        console.error('[meta-embedded-signup] Phone fetch error:', phoneData.error);
        return fail(phoneData.error.message || 'Failed to fetch phone info');
      }

      console.log('[meta-embedded-signup] Phone details:', phoneData);

      return ok({
        wabaId: wabaData.id,
        wabaName: wabaData.name || 'WhatsApp Business',
        businessId: wabaData.owner_business_info?.id || '',
        businessName: wabaData.owner_business_info?.name || '',
        phoneNumberId: phoneData.id,
        displayPhoneNumber: phoneData.display_phone_number,
        verifiedName: phoneData.verified_name,
        qualityRating: phoneData.quality_rating,
      });
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('[meta-embedded-signup] Error:', error);
    return jsonResponse(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
});
