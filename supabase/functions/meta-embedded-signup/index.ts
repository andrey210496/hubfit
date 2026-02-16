import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Env vars
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ENV_META_APP_ID = Deno.env.get('META_APP_ID') || Deno.env.get('FB_APP_ID') || '';
const ENV_META_APP_SECRET = Deno.env.get('META_APP_SECRET') || Deno.env.get('FB_APP_SECRET') || '';

const GLOBAL_CONFIG_COMPANY_ID = '00000000-0000-0000-0000-000000000000';
const GRAPH_VERSION = 'v21.0';

// Helpers
function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function ok(payload: Record<string, unknown> = {}) {
  return jsonResponse({ success: true, ...payload }, 200);
}

function fail(message: string, details?: unknown) {
  return jsonResponse({ success: false, error: message, details }, 200);
}

// REST API Helper
async function supabaseRest(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const opts: RequestInit = {
    method,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation', // To get data back on insert/update
      ...headers
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase REST Error (${res.status}): ${txt}`);
  }
  return res.json();
}

async function getUser(token: string) {
  const url = `${SUPABASE_URL}/auth/v1/user`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return res.json();
}

async function loadMetaConfig() {
  // Select key, value from campaign_settings where company_id=GLOBAL... and key in [...]
  // REST URL: /campaign_settings?select=key,value&company_id=eq.GLOBAL...&key=in.(...)
  const keys = ['meta_app_id', 'meta_config_id', 'meta_app_secret'];
  const query = `campaign_settings?select=key,value&company_id=eq.${GLOBAL_CONFIG_COMPANY_ID}&key=in.(${keys.join(',')})`;

  try {
    const settings = await supabaseRest('GET', query);
    const cfg: Record<string, string> = {};
    (settings || []).forEach((s: any) => cfg[s.key] = s.value || '');

    return {
      appId: cfg.meta_app_id || ENV_META_APP_ID,
      configId: cfg.meta_config_id || '',
      appSecret: ENV_META_APP_SECRET || cfg.meta_app_secret || '',
    };
  } catch (e) {
    console.error("Meta config load fail:", e);
    return { appId: ENV_META_APP_ID, configId: '', appSecret: ENV_META_APP_SECRET };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Unauthorized' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const user = await getUser(token);

    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const { action, code, connectionId } = body;

    // Get profile
    // /profiles?select=company_id&user_id=eq.ID&limit=1
    // Note: use .single() behavior via Accept header or check array
    const profiles = await supabaseRest('GET', `profiles?select=company_id&user_id=eq.${user.id}&limit=1`);
    const profile = profiles?.[0];

    if (!profile?.company_id) return fail('User profile not found');

    // === ACTIONS ===

    if (action === 'get_config') {
      const meta = await loadMetaConfig();
      if (!meta.appId) return fail('Meta App ID não configurado');
      return ok({ config: { appId: meta.appId, configId: meta.configId } });
    }

    if (action === 'exchange_token') {
      if (!code) return fail('Authorization code is required');
      const meta = await loadMetaConfig();
      if (!meta.appId || !meta.appSecret) return fail('Meta Config Missing');

      let tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${meta.appId}&client_secret=${meta.appSecret}&code=${code}`;
      let resp = await fetch(tokenUrl);
      let data = await resp.json();
      if (data.error) return fail(data.error.message);
      const shortToken = data.access_token;

      tokenUrl = `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${meta.appId}&client_secret=${meta.appSecret}&fb_exchange_token=${shortToken}`;
      resp = await fetch(tokenUrl);
      data = await resp.json();
      if (data.error) return fail(data.error.message);

      return ok({ accessToken: data.access_token, expiresIn: data.expires_in });
    }

    if (action === 'get_phone_details') {
      const { accessToken, wabaId, phoneNumberId } = body;
      if (!accessToken || !wabaId || !phoneNumberId) return fail('Missing params');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const [wabaRes, phoneRes] = await Promise.all([
          fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}?fields=id,name,owner_business_info{id,name}&access_token=${accessToken}`, { signal: controller.signal }),
          fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${accessToken}`, { signal: controller.signal })
        ]);

        const [wabaData, phoneData] = await Promise.all([wabaRes.json(), phoneRes.json()]);
        clearTimeout(timeoutId);

        if (wabaData.error) return fail(wabaData.error.message);
        if (phoneData.error) return fail(phoneData.error.message);

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
      } catch (e) {
        clearTimeout(timeoutId);
        throw e;
      }
    }

    if (action === 'complete_signup') {
      const { accessToken, wabaId, phoneNumberId, connectionName } = body;

      const phoneRes = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating&access_token=${accessToken}`
      );
      const phoneInfo = await phoneRes.json();
      if (phoneInfo.error) return fail(phoneInfo.error.message);

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
        is_default: false
      };

      let connection;
      if (connectionId) {
        // Update
        const res = await supabaseRest('PATCH', `whatsapps?id=eq.${connectionId}`, connectionData);
        connection = res[0];
      } else {
        // Insert
        const res = await supabaseRest('POST', 'whatsapps', connectionData);
        connection = res[0];
      }

      // Webhook subscribe (fire/forget)
      fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${wabaId}/subscribed_apps`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }).catch(() => { });

      return ok({ connection: { id: connection?.id } });
    }

    return fail('Invalid action');

  } catch (error) {
    console.error('[meta-error]', error);
    return jsonResponse({ success: false, error: 'Internal Error' }, 500);
  }
});
