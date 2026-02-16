import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { connectionId } = await req.json();

        if (!connectionId) {
            throw new Error('connectionId is required');
        }

        // Fetch connection details
        const { data: connection, error: dbError } = await supabase
            .from('whatsapps')
            .select('*')
            .eq('id', connectionId)
            .single();

        if (dbError || !connection) {
            throw new Error('Connection not found');
        }

        const apiUrl = connection.uazapi_url || 'https://salesflow.uazapi.com';
        const apiInstanceId = connection.uazapi_instance_id;
        const apiToken = connection.uazapi_token;
        const adminToken = Deno.env.get('UAZAPI_ADMIN_TOKEN') || 'F79PCEQOjkPMrFvYGr0PMg6QpGFXOTTJe85ALyRVUDM1xtJDAV';

        if (!apiInstanceId || !apiToken) {
            throw new Error('Missing UazAPI credentials (instanceId or token)');
        }

        console.log('[Check Status] Checking:', apiUrl, apiInstanceId);

        // Call instance/connect to get status
        // We use the same endpoint as create, because it returns the status/QR
        const response = await fetch(`${apiUrl}/instance/connect`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'admintoken': adminToken,
                'token': apiToken
            },
            body: JSON.stringify({ instanceName: apiInstanceId })
        });

        const data = await response.json();
        console.log('[Check Status] Response:', JSON.stringify(data));

        let newStatus = connection.status;
        let isConnected = false;

        // Analyze response (Evolution API v1/v2 / Baileys style)
        if (data.instance?.status === 'open' || data.instance?.status === 'connected' || data.connected === true) {
            newStatus = 'CONNECTED';
            isConnected = true;
        } else if (data.instance?.status === 'connecting') {
            newStatus = 'CONNECTING';
        } else if (data.instance?.status === 'close') {
            newStatus = 'DISCONNECTED';
        }

        // Update DB if changed
        if (newStatus !== connection.status) {
            await supabase
                .from('whatsapps')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', connectionId);
        }

        return new Response(JSON.stringify({
            success: true,
            status: newStatus,
            connected: isConnected,
            raw: data
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('[Check Status] Error:', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
        });
    }
});
