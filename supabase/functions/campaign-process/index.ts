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
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[campaign-process] Processing campaigns...');

    // Get campaigns that are scheduled and ready to process
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        contact_list:contact_lists(
          id,
          name,
          items:contact_list_items(
            id,
            name,
            number,
            email
          )
        )
      `)
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString())
      .limit(10);

    if (error) {
      console.error('[campaign-process] Error fetching campaigns:', error);
      throw error;
    }

    console.log(`[campaign-process] Found ${campaigns?.length || 0} campaigns to process`);

    const results = {
      processed: 0,
      failed: 0,
      totalMessages: 0,
      errors: [] as string[],
    };

    for (const campaign of campaigns || []) {
      try {
        // Update campaign status to processing
        await supabase
          .from('campaigns')
          .update({ status: 'processing' })
          .eq('id', campaign.id);

        // Get WhatsApp connection for the company
        const { data: whatsapp } = await supabase
          .from('whatsapps')
          .select('*')
          .eq('company_id', campaign.company_id)
          .eq('status', 'CONNECTED')
          .single();

        if (!whatsapp) {
          console.log(`[campaign-process] No connected WhatsApp for company ${campaign.company_id}`);
          await supabase
            .from('campaigns')
            .update({ status: 'failed' })
            .eq('id', campaign.id);
          results.errors.push(`Campaign ${campaign.id}: No connected WhatsApp`);
          results.failed++;
          continue;
        }

        // Get contacts to send to
        const contacts = campaign.contact_list?.items || [];
        
        if (contacts.length === 0) {
          console.log(`[campaign-process] No contacts in campaign ${campaign.id}`);
          await supabase
            .from('campaigns')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', campaign.id);
          results.processed++;
          continue;
        }

        // Get random message from available messages
        const messages = [
          campaign.message1,
          campaign.message2,
          campaign.message3,
          campaign.message4,
          campaign.message5,
        ].filter(Boolean);

        const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
        const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');

        // Process each contact
        for (const contact of contacts) {
          try {
            // Pick a random message
            const messageIndex = Math.floor(Math.random() * messages.length);
            const message = messages[messageIndex] || campaign.message1 || '';

            // Replace placeholders
            const finalMessage = message
              .replace(/\{nome\}/gi, contact.name || '')
              .replace(/\{name\}/gi, contact.name || '')
              .replace(/\{numero\}/gi, contact.number || '')
              .replace(/\{number\}/gi, contact.number || '');

            // Create shipping record
            await supabase
              .from('campaign_shippings')
              .insert({
                campaign_id: campaign.id,
                contact_list_item_id: contact.id,
                number: contact.number,
                message: finalMessage,
              });

            // Send via WhatsApp API if configured
            if (whatsappApiUrl && whatsappApiKey) {
              const apiBaseUrl = whatsappApiUrl.replace(/\/$/, '');
              const endpoint = campaign.media_path ? '/chat/send/document' : '/chat/send/text';
              
              const payload: Record<string, string> = {
                Phone: contact.number,
              };

              if (campaign.media_path) {
                payload.Document = campaign.media_path;
                payload.Caption = finalMessage;
                payload.FileName = campaign.media_name || 'file';
              } else {
                payload.Body = finalMessage;
              }

              await fetch(`${apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Token': whatsappApiKey,
                },
                body: JSON.stringify(payload),
              });

              // Update shipping with delivery time
              await supabase
                .from('campaign_shippings')
                .update({ delivery_at: new Date().toISOString() })
                .eq('campaign_id', campaign.id)
                .eq('number', contact.number);
            }

            results.totalMessages++;

            // Add small delay between messages to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (contactError) {
            console.error(`[campaign-process] Error sending to ${contact.number}:`, contactError);
          }
        }

        // Update campaign as completed
        await supabase
          .from('campaigns')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', campaign.id);

        results.processed++;
        console.log(`[campaign-process] Campaign ${campaign.id} completed`);

      } catch (campaignError) {
        console.error(`[campaign-process] Error processing campaign ${campaign.id}:`, campaignError);
        results.errors.push(`Campaign ${campaign.id}: ${campaignError instanceof Error ? campaignError.message : 'Unknown error'}`);
        results.failed++;

        // Mark as failed
        await supabase
          .from('campaigns')
          .update({ status: 'failed' })
          .eq('id', campaign.id);
      }
    }

    console.log('[campaign-process] Processing complete:', results);

    return new Response(JSON.stringify({ 
      success: true, 
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[campaign-process] Error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
