import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
    const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');
    
    if (!whatsappApiUrl || !whatsappApiKey) {
      return new Response(JSON.stringify({ error: 'WhatsApp API not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiBaseUrl = whatsappApiUrl.replace(/\/$/, '');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all group contacts
    const { data: groups, error: groupsError } = await supabase
      .from('contacts')
      .select('id, number, name, company_id')
      .eq('is_group', true);

    if (groupsError) {
      console.error('Error fetching groups:', groupsError);
      return new Response(JSON.stringify({ error: 'Failed to fetch groups' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[SyncGroups] Found ${groups?.length || 0} groups to sync`);

    const results: { id: string; number: string; oldName: string; newName: string | null; status: string }[] = [];

    // Get WhatsApp connection token
    const { data: whatsapp } = await supabase
      .from('whatsapps')
      .select('id, token, instance_id')
      .eq('status', 'CONNECTED')
      .limit(1)
      .maybeSingle();

    const token = whatsapp?.token || whatsappApiKey;

    for (const group of groups || []) {
      try {
        // Format JID for API call
        let groupJid = group.number;
        if (!groupJid.includes('@')) {
          groupJid = `${groupJid}@g.us`;
        }

        console.log(`[SyncGroups] Fetching info for group: ${groupJid}`);

        // Try multiple endpoints that WuzAPI might support
        const endpoints = [
          { url: `${apiBaseUrl}/chat/group/info`, method: 'POST', body: JSON.stringify({ Id: groupJid }) },
          { url: `${apiBaseUrl}/group/info`, method: 'POST', body: JSON.stringify({ Id: groupJid }) },
          { url: `${apiBaseUrl}/group/${encodeURIComponent(groupJid)}`, method: 'GET', body: null },
        ];

        let groupInfo = null;
        
        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint.url, {
              method: endpoint.method,
              headers: {
                'Content-Type': 'application/json',
                'token': token,
              },
              body: endpoint.body,
            });

            if (response.ok) {
              groupInfo = await response.json();
              console.log(`[SyncGroups] Group info from ${endpoint.url}:`, JSON.stringify(groupInfo).substring(0, 300));
              break;
            } else {
              console.log(`[SyncGroups] Endpoint ${endpoint.url} returned ${response.status}`);
            }
          } catch (endpointErr) {
            console.log(`[SyncGroups] Endpoint ${endpoint.url} failed:`, endpointErr);
          }
        }

        if (groupInfo) {
          const groupName = groupInfo?.Subject || groupInfo?.Name || groupInfo?.name || groupInfo?.subject;
          
          if (groupName && groupName !== group.name) {
            // Update contact name
            const { error: updateError } = await supabase
              .from('contacts')
              .update({ name: groupName, updated_at: new Date().toISOString() })
              .eq('id', group.id);

            if (updateError) {
              console.error(`[SyncGroups] Error updating group ${group.id}:`, updateError);
              results.push({
                id: group.id,
                number: group.number,
                oldName: group.name,
                newName: null,
                status: 'error',
              });
            } else {
              console.log(`[SyncGroups] Updated group name: ${group.name} -> ${groupName}`);
              results.push({
                id: group.id,
                number: group.number,
                oldName: group.name,
                newName: groupName,
                status: 'updated',
              });
            }
          } else {
            results.push({
              id: group.id,
              number: group.number,
              oldName: group.name,
              newName: groupName || group.name,
              status: groupName ? 'unchanged' : 'no_name_found',
            });
          }
        } else {
          console.log(`[SyncGroups] No group info found for ${groupJid}`);
          results.push({
            id: group.id,
            number: group.number,
            oldName: group.name,
            newName: null,
            status: 'api_not_available',
          });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`[SyncGroups] Error processing group ${group.id}:`, err);
        results.push({
          id: group.id,
          number: group.number,
          oldName: group.name,
          newName: null,
          status: 'exception',
        });
      }
    }

    const updated = results.filter(r => r.status === 'updated').length;
    const unchanged = results.filter(r => r.status === 'unchanged').length;
    const errors = results.filter(r => r.status !== 'updated' && r.status !== 'unchanged').length;

    console.log(`[SyncGroups] Completed: ${updated} updated, ${unchanged} unchanged, ${errors} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: { total: results.length, updated, unchanged, errors },
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('[SyncGroups] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
