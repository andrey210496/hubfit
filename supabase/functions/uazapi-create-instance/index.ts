// supabase/functions/uazapi-create-instance/index.ts
// Creates a new UazAPI instance via the admin API, configures webhook, and stores in DB

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const UAZAPI_BASE_URL = 'https://salesflow.uazapi.com';
const UAZAPI_ADMIN_TOKEN = 'F79PCEQOjkPMrFvYGr0PMg6QpGFXOTTJe85ALyRVUDM1xtJDAV';

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Validate auth
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Get user profile for company_id
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        if (!profile?.company_id) {
            return new Response(JSON.stringify({ error: 'User has no company' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const body = await req.json();
        const { instanceName, action } = body;

        // ============================================
        // ACTION: create — Criar nova instância
        // ============================================
        if (!action || action === 'create') {
            if (!instanceName?.trim()) {
                return new Response(JSON.stringify({ error: 'instanceName is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            console.log('[UazAPI Create] Creating instance:', instanceName);

            // 1. Create instance on UazAPI v2
            const createRes = await fetch(`${UAZAPI_BASE_URL}/instance/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'admintoken': UAZAPI_ADMIN_TOKEN
                },
                body: JSON.stringify({ name: instanceName.trim() })
            });

            if (!createRes.ok) {
                const errText = await createRes.text();
                console.error('[UazAPI Create] API error:', createRes.status, errText);
                return new Response(JSON.stringify({
                    error: 'Failed to create instance on UazAPI',
                    details: errText
                }), {
                    status: 502,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const instanceData = await createRes.json();
            console.log('[UazAPI Create] Instance created:', JSON.stringify(instanceData).substring(0, 500));

            // Extract token and instance ID from response
            const instanceToken = instanceData.token || instanceData.apikey || instanceData.key;
            const instanceId = instanceData.instanceId || instanceData.instance || instanceData.id || instanceName.trim();

            // 2. Configure webhook on the new instance
            const webhookUrl = `${supabaseUrl}/functions/v1/uazapi-webhook`;
            try {
                const webhookRes = await fetch(`${UAZAPI_BASE_URL}/webhook/set`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'token': instanceToken || UAZAPI_ADMIN_TOKEN
                    },
                    body: JSON.stringify({
                        url: webhookUrl,
                        enabled: true,
                        events: ['message', 'message.ack', 'connection', 'qrcode']
                    })
                });
                console.log('[UazAPI Create] Webhook configured:', webhookRes.status);
            } catch (whErr) {
                console.warn('[UazAPI Create] Webhook config failed (non-fatal):', whErr);
            }

            // 3. Check how many connections exist (for is_default)
            const { count } = await supabase
                .from('whatsapps')
                .select('id', { count: 'exact', head: true })
                .eq('company_id', profile.company_id);

            // 4. Save to database
            const { data: whatsapp, error: dbError } = await supabase
                .from('whatsapps')
                .insert({
                    company_id: profile.company_id,
                    name: instanceName.trim(),
                    status: 'DISCONNECTED',
                    provider: 'uazapi',
                    uazapi_url: UAZAPI_BASE_URL,
                    uazapi_token: instanceToken || UAZAPI_ADMIN_TOKEN,
                    uazapi_instance_id: instanceId,
                    is_default: (count || 0) === 0,
                })
                .select('id, name, status, provider, uazapi_instance_id')
                .single();

            if (dbError) {
                console.error('[UazAPI Create] DB error:', dbError);
                return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                connection: whatsapp,
                instanceData: {
                    instanceId,
                    token: instanceToken,
                    webhookUrl
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // ACTION: connect — Conectar instância (gerar QR)
        // ============================================
        if (action === 'connect') {
            const { connectionId } = body;
            if (!connectionId) {
                return new Response(JSON.stringify({ error: 'connectionId is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const { data: whatsapp } = await supabase
                .from('whatsapps')
                .select('id, uazapi_url, uazapi_token, uazapi_instance_id')
                .eq('id', connectionId)
                .eq('company_id', profile.company_id)
                .single();

            if (!whatsapp) {
                return new Response(JSON.stringify({ error: 'Connection not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const apiUrl = whatsapp.uazapi_url || UAZAPI_BASE_URL;
            const apiToken = whatsapp.uazapi_token || UAZAPI_ADMIN_TOKEN;
            const instanceId = whatsapp.uazapi_instance_id;

            console.log('[UazAPI Connect] Attempting connection...');
            console.log('[UazAPI Connect] URL:', apiUrl);
            console.log('[UazAPI Connect] Instance:', instanceId);
            console.log('[UazAPI Connect] Token (first 10):', apiToken?.substring(0, 10) + '...');

            // Try instance/connect with token header
            const connectUrl = `${apiUrl}/instance/connect`;
            console.log('[UazAPI Connect] Fetching:', connectUrl);

            const connectRes = await fetch(connectUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'token': apiToken
                },
                body: JSON.stringify({ instanceName: instanceId })
            });

            const connectText = await connectRes.text();
            console.log('[UazAPI Connect] Response status:', connectRes.status);
            console.log('[UazAPI Connect] Response body:', connectText.substring(0, 1000));

            let connectData: any;
            try {
                connectData = JSON.parse(connectText);
            } catch {
                connectData = { raw: connectText };
            }

            // Extract QR code from various possible response fields
            const qrCode = connectData?.qrcode
                || connectData?.qr
                || connectData?.base64
                || connectData?.data?.qrcode
                || connectData?.data?.qr
                || connectData?.data?.base64
                || connectData?.pairingCode
                || null;

            console.log('[UazAPI Connect] QR code found:', !!qrCode, qrCode ? `(length: ${qrCode.length})` : '');

            // Update status in DB
            await supabase.from('whatsapps').update({
                status: qrCode ? 'WAITING_QR' : 'CONNECTING',
                qr_code: qrCode,
                updated_at: new Date().toISOString()
            }).eq('id', whatsapp.id);

            return new Response(JSON.stringify({
                success: true,
                qrcode: qrCode,
                status: qrCode ? 'WAITING_QR' : (connectData?.status || 'connecting'),
                debug: {
                    httpStatus: connectRes.status,
                    responseKeys: connectData ? Object.keys(connectData) : [],
                    hasQr: !!qrCode
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // ACTION: status — Verificar status da instância
        // ============================================
        if (action === 'status') {
            const { connectionId } = body;

            const { data: whatsapp } = await supabase
                .from('whatsapps')
                .select('id, status, qr_code, uazapi_url, uazapi_token, uazapi_instance_id')
                .eq('id', connectionId)
                .eq('company_id', profile.company_id)
                .single();

            if (!whatsapp) {
                return new Response(JSON.stringify({ error: 'Connection not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Also check live status from UazAPI
            const apiUrl = whatsapp.uazapi_url || UAZAPI_BASE_URL;
            const apiToken = whatsapp.uazapi_token || UAZAPI_ADMIN_TOKEN;
            try {
                const statusRes = await fetch(`${apiUrl}/instance/status`, {
                    method: 'GET',
                    headers: { 'token': apiToken }
                });
                const statusData = await statusRes.json();
                console.log('[UazAPI Status] Live status:', JSON.stringify(statusData).substring(0, 300));

                const liveStatus = statusData?.status || statusData?.state;
                if (liveStatus === 'connected' || liveStatus === 'CONNECTED') {
                    await supabase.from('whatsapps').update({
                        status: 'CONNECTED',
                        qr_code: null,
                        updated_at: new Date().toISOString()
                    }).eq('id', whatsapp.id);

                    return new Response(JSON.stringify({
                        success: true,
                        status: 'CONNECTED',
                        qrcode: null
                    }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }

                // Check for updated QR code
                const liveQr = statusData?.qrcode || statusData?.qr || statusData?.base64 || null;
                if (liveQr) {
                    await supabase.from('whatsapps').update({
                        qr_code: liveQr,
                        updated_at: new Date().toISOString()
                    }).eq('id', whatsapp.id);
                }

                return new Response(JSON.stringify({
                    success: true,
                    status: whatsapp.status,
                    qrcode: liveQr || whatsapp.qr_code
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            } catch (e) {
                console.warn('[UazAPI Status] Live check failed:', e);
            }

            return new Response(JSON.stringify({
                success: true,
                status: whatsapp.status,
                qrcode: whatsapp.qr_code
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // ============================================
        // ACTION: delete — Deletar instância do UazAPI
        // ============================================
        if (action === 'delete') {
            const { connectionId } = body;
            if (!connectionId) {
                return new Response(JSON.stringify({ error: 'connectionId is required' }), {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const { data: whatsapp } = await supabase
                .from('whatsapps')
                .select('id, uazapi_url, uazapi_token, uazapi_instance_id, provider')
                .eq('id', connectionId)
                .eq('company_id', profile.company_id)
                .single();

            if (!whatsapp) {
                return new Response(JSON.stringify({ error: 'Connection not found' }), {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Delete from UazAPI if it's a UazAPI connection
            if (whatsapp.provider === 'uazapi') {
                const apiUrl = whatsapp.uazapi_url || UAZAPI_BASE_URL;
                const apiToken = whatsapp.uazapi_token || UAZAPI_ADMIN_TOKEN;
                try {
                    const deleteRes = await fetch(`${apiUrl}/instance/delete`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'admintoken': UAZAPI_ADMIN_TOKEN,
                            'token': apiToken
                        },
                        body: JSON.stringify({ instanceName: whatsapp.uazapi_instance_id })
                    });
                    console.log('[UazAPI Delete] API response:', deleteRes.status);
                } catch (e) {
                    console.warn('[UazAPI Delete] API delete failed (non-fatal):', e);
                }
            }

            // Delete from database
            const { error: dbError } = await supabase
                .from('whatsapps')
                .delete()
                .eq('id', connectionId)
                .eq('company_id', profile.company_id);

            if (dbError) {
                return new Response(JSON.stringify({ error: 'Failed to delete' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[UazAPI Create] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
