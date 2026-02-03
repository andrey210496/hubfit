import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversionPayload {
  tagId: string;
  contactId: string;
  ticketId?: string;
  companyId: string;
  eventName?: string;
}

// Hash data for Meta (required for user data matching)
async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: ConversionPayload = await req.json();
    const { tagId, contactId, ticketId, companyId, eventName = 'Lead' } = payload;

    console.log(`[Meta Conversions] Processing event for tag: ${tagId}, contact: ${contactId}`);

    // Fetch tag with Meta Pixel configuration
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name, meta_pixel_id, meta_access_token')
      .eq('id', tagId)
      .single();

    if (tagError || !tag) {
      console.log('[Meta Conversions] Tag not found or error:', tagError);
      return new Response(JSON.stringify({ success: false, error: 'Tag not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if tag has Meta Pixel configured
    if (!tag.meta_pixel_id || !tag.meta_access_token) {
      console.log('[Meta Conversions] Tag does not have Meta Pixel configured');
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'No Meta Pixel configured for this tag' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch contact data for user matching
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, name, number, email')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      console.error('[Meta Conversions] Contact not found:', contactError);
      return new Response(JSON.stringify({ success: false, error: 'Contact not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare user data for Meta (hashed for privacy)
    const userData: Record<string, string> = {};
    
    if (contact.number) {
      const cleanPhone = contact.number.replace(/\D/g, '');
      userData.ph = await hashData(cleanPhone);
    }
    
    if (contact.email) {
      userData.em = await hashData(contact.email);
    }
    
    if (contact.name) {
      const nameParts = contact.name.split(' ');
      if (nameParts.length > 0) {
        userData.fn = await hashData(nameParts[0]);
      }
      if (nameParts.length > 1) {
        userData.ln = await hashData(nameParts[nameParts.length - 1]);
      }
    }

    // Build event data for Meta Conversions API
    const eventTime = Math.floor(Date.now() / 1000);
    const eventData = {
      data: [
        {
          event_name: eventName,
          event_time: eventTime,
          action_source: 'chat',
          user_data: userData,
          custom_data: {
            tag_name: tag.name,
            contact_id: contactId,
            ticket_id: ticketId || null,
            company_id: companyId,
          },
        },
      ],
    };

    console.log(`[Meta Conversions] Sending event to Pixel: ${tag.meta_pixel_id}`);

    // Send to Meta Conversions API
    const metaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${tag.meta_pixel_id}/events?access_token=${tag.meta_access_token}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    const metaResult = await metaResponse.json();
    
    if (!metaResponse.ok) {
      console.error('[Meta Conversions] Meta API error:', metaResult);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Meta API error',
        details: metaResult 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Meta Conversions] Event sent successfully:', metaResult);

    // Log the conversion event
    await supabase.from('automation_logs').insert({
      automation_id: tagId,
      company_id: companyId,
      contact_id: contactId,
      ticket_id: ticketId || null,
      status: 'completed',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      execution_data: {
        type: 'meta_conversion',
        pixel_id: tag.meta_pixel_id,
        event_name: eventName,
        events_received: metaResult.events_received,
      },
    });

    return new Response(JSON.stringify({ 
      success: true, 
      events_received: metaResult.events_received,
      fbtrace_id: metaResult.fbtrace_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Meta Conversions] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
