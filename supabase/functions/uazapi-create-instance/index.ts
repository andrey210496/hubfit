// supabase/functions/uazapi-create-instance/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const UAZAPI_BASE_URL = 'https://salesflow.uazapi.com';
const UAZAPI_ADMIN_TOKEN = 'F79PCEQOjkPMrFvYGr0PMg6QpGFXOTTJe85ALyRVUDM1xtJDAV';

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

        const { data: profile } = await supabase.from('profiles').select('company_id').eq('user_id', user.id).single();
        if (!profile?.company_id) return new Response(JSON.stringify({ error: 'No Company' }), { status: 400, headers: corsHeaders });

        const body = await req.json();
        const { instanceName, systemName, action } = body;

        // CREATE
        if (!action || action === 'create') {
            if (!instanceName?.trim()) return new Response(JSON.stringify({ error: 'instanceName required' }), { status: 400, headers: corsHeaders });

            // USE PUBLIC URL for external webhooks
            const publicSupabaseUrl = 'https://supabase.metodogestorpro.com';
            // Use 'url' query param for uazapi-webhook checks if needed, but standard is just the path
            const webhookUrl = `${publicSupabaseUrl}/functions/v1/uazapi-webhook`;

            console.log('[Create] Init:', instanceName, 'Webhook:', webhookUrl);

            // 1. Create Instance
            // Add timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000);

            const createRes = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_ADMIN_TOKEN },
                body: JSON.stringify({
                    name: instanceName.trim(),
                    systemName: systemName?.trim() || 'Multiatendimento',
                    webhook: {
                        url: webhookUrl,
                        enabled: true,
                        events: ['message', 'message.ack', 'connection', 'qrcode']
                    },
                    events: ['message', 'message.ack', 'connection', 'qrcode']
                }),
                signal: controller.signal
            });
            clearTimeout(id);

            if (!createRes.ok) {
                const txt = await createRes.text();
                return new Response(JSON.stringify({ error: 'Provider Error', details: txt }), { status: 502, headers: corsHeaders });
            }

            const instanceData = await createRes.json();
            const instanceToken = instanceData.token || instanceData.apikey || instanceData.key || instanceData.hash;
            // FORCE instanceId to be the name we sent, as the API might return full object or garbage
            const instanceId = instanceName.trim();

            // 2. Webhook (Fire and forget or with short timeout) - Backup attempt
            try {
                const ab = new AbortController();
                const tid = setTimeout(() => ab.abort(), 3000); // 3s timeout for webhook
                await fetch(`${UAZAPI_BASE_URL}/webhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'token': instanceToken || UAZAPI_ADMIN_TOKEN },
                    body: JSON.stringify({ url: webhookUrl, enabled: true, events: ['message', 'message.ack', 'connection', 'qrcode'] }),
                    signal: ab.signal
                });
                clearTimeout(tid);
            } catch (e) {
                clearTimeout(tid);
                console.log('[Create] Webhook config skipped/failed:', e);
            }

            // 3. Save to DB
            const { count } = await supabase.from('whatsapps').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id);

            const { data: whatsapp, error: dbError } = await supabase.from('whatsapps').insert({
                company_id: profile.company_id,
                name: instanceName.trim(),
                status: 'DISCONNECTED',
                provider: 'uazapi',
                uazapi_url: UAZAPI_BASE_URL,
                uazapi_token: instanceToken || UAZAPI_ADMIN_TOKEN,
                uazapi_instance_id: instanceId,
                is_default: (count || 0) === 0,
            }).select().single();

            if (dbError) throw dbError;

            return new Response(JSON.stringify({ success: true, connection: whatsapp }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // CONNECT
        if (action === 'connect') {
            const { connectionId } = body;
            const { data: whatsapp } = await supabase.from('whatsapps').select('*').eq('id', connectionId).single();
            if (!whatsapp) return new Response("Not Found", { status: 404 });

            const apiUrl = whatsapp.uazapi_url || UAZAPI_BASE_URL;
            const apiToken = whatsapp.uazapi_token || UAZAPI_ADMIN_TOKEN;

            // USE PUBLIC URL for external webhooks
            const publicSupabaseUrl = 'https://supabase.metodogestorpro.com';
            const webhookUrl = `${publicSupabaseUrl}/functions/v1/uazapi-webhook`;

            const payload = {
                instanceName: whatsapp.uazapi_instance_id,
                token: apiToken,
                qrcode: true,
                webhook: webhookUrl,
                events: ['connection', 'qrcode', 'message', 'message.ack']
            };

            console.log('[Create] Registering Webhook:', webhookUrl);

            // Restore connect to get QR Code
            const res = await fetch(`${apiUrl}/instance/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_ADMIN_TOKEN, 'token': apiToken },
                body: JSON.stringify({ instanceName: whatsapp.uazapi_instance_id })
            });

            try {
                // Try to set webhook separately (Best effort)
                fetch(`${apiUrl}/webhook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_ADMIN_TOKEN, 'token': apiToken },
                    body: JSON.stringify({
                        url: webhookUrl,
                        instanceName: whatsapp.uazapi_instance_id,
                        enabled: true
                    })
                }).then(async r => {
                    const txt = await r.text();
                    console.log('[Webhook Set] Response:', r.status, txt);
                }).catch(e => console.log('[Webhook Set] Failed (network):', e));
            } catch (e) { }

            // Parse response safely
            const txt = await res.text();
            let data;
            try { data = JSON.parse(txt); } catch { data = { raw: txt }; }

            console.log('[Connect] Provider Response:', JSON.stringify(data));

            const qrCode = data?.instance?.qrcode || data?.qrcode || data?.qr || data?.base64 || data?.pairingCode || null;

            await supabase.from('whatsapps').update({
                status: qrCode ? 'WAITING_QR' : 'CONNECTING',
                qr_code: qrCode,
                updated_at: new Date().toISOString()
            }).eq('id', whatsapp.id);

            return new Response(JSON.stringify({ success: true, qrcode: qrCode, status: 'connecting' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // DELETE
        if (action === 'delete') {
            const { connectionId } = body;
            const { data: whatsapp } = await supabase.from('whatsapps').select('*').eq('id', connectionId).single();
            if (whatsapp && (whatsapp.provider === 'uazapi' || whatsapp.provider === 'salesflow')) {
                const apiUrl = whatsapp.uazapi_url || UAZAPI_BASE_URL;
                const apiToken = whatsapp.uazapi_token || UAZAPI_ADMIN_TOKEN;
                // Fire and forget delete
                // Await delete to ensure it processes
                // Changed to POST because DELETE returned 405 Method Not Allowed
                await fetch(`${apiUrl}/instance/delete?instanceName=${whatsapp.uazapi_instance_id}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'admintoken': UAZAPI_ADMIN_TOKEN, 'token': apiToken },
                    body: JSON.stringify({ instanceName: whatsapp.uazapi_instance_id })
                }).then(res => res.text()).then(txt => console.log('[Delete] Provider response:', txt)).catch(console.error);
            }
            await supabase.from('whatsapps').delete().eq('id', connectionId);
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response('Unknown Action', { status: 400 });

    } catch (error) {
        console.error('[Error]', error);
        return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
});
