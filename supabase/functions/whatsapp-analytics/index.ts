import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConversationAnalytics {
  start: string;
  end: string;
  granularity: string;
  data_points: Array<{
    start: string;
    end: string;
    sent: number;
    delivered: number;
    conversation: number;
    cost: number;
  }>;
}

interface TemplateAnalytics {
  template_id: string;
  template_name: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[whatsapp-analytics] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const body = await req.json();
    const { 
      whatsappId, 
      type = 'conversation', // 'conversation' | 'template' | 'phone_insights'
      startDate,
      endDate,
      granularity = 'DAY', // 'HALF_HOUR', 'DAY', 'MONTH'
    } = body;
    
    console.log('[whatsapp-analytics] type=', type, 'whatsappId=', whatsappId);

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User profile not found');
    }

    // Get WhatsApp connection
    let whatsappQuery = supabase
      .from('whatsapps')
      .select('*')
      .eq('company_id', profile.company_id)
      .eq('status', 'CONNECTED');

    if (whatsappId) {
      whatsappQuery = whatsappQuery.eq('id', whatsappId);
    }

    const { data: whatsapp } = await whatsappQuery.maybeSingle();

    if (!whatsapp?.access_token || !whatsapp?.waba_id) {
      throw new Error('WhatsApp Cloud API not configured');
    }

    // Default date range: last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Format dates as Unix timestamps (seconds)
    const startUnix = Math.floor(start.getTime() / 1000);
    const endUnix = Math.floor(end.getTime() / 1000);

    let result: any = {};

    if (type === 'conversation') {
      // Get conversation analytics from WABA
      const analyticsUrl = `https://graph.facebook.com/v21.0/${whatsapp.waba_id}?fields=conversation_analytics.start(${startUnix}).end(${endUnix}).granularity(${granularity}).dimensions([CONVERSATION_CATEGORY,CONVERSATION_TYPE,COUNTRY,PHONE])`;

      console.log('[whatsapp-analytics] Fetching conversation analytics');

      const response = await fetch(analyticsUrl, {
        headers: {
          'Authorization': `Bearer ${whatsapp.access_token}`,
        },
      });

      const responseText = await response.text();
      console.log('[whatsapp-analytics] Response status:', response.status);

      if (response.ok) {
        const data = JSON.parse(responseText);
        result = {
          type: 'conversation',
          waba_id: whatsapp.waba_id,
          analytics: data.conversation_analytics || data,
        };
      } else {
        console.error('[whatsapp-analytics] Error:', responseText);
        throw new Error('Failed to fetch conversation analytics');
      }
    } else if (type === 'template') {
      // Get template analytics from our database
      const { data: templateStats, error } = await supabase
        .from('template_sends')
        .select(`
          template_id,
          status,
          sent_at,
          delivered_at,
          read_at,
          message_templates(name)
        `)
        .eq('company_id', profile.company_id)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) {
        throw error;
      }

      // Aggregate template stats
      const templateMap = new Map<string, TemplateAnalytics>();
      
      for (const send of templateStats || []) {
        const templateId = send.template_id;
        const templateName = (send.message_templates as any)?.name || 'Unknown';
        
        if (!templateMap.has(templateId)) {
          templateMap.set(templateId, {
            template_id: templateId,
            template_name: templateName,
            sent: 0,
            delivered: 0,
            read: 0,
            clicked: 0,
            replied: 0,
          });
        }

        const stats = templateMap.get(templateId)!;
        stats.sent++;
        if (send.delivered_at) stats.delivered++;
        if (send.read_at) stats.read++;
      }

      result = {
        type: 'template',
        start_date: start.toISOString(),
        end_date: end.toISOString(),
        templates: Array.from(templateMap.values()),
      };
    } else if (type === 'phone_insights') {
      // Get phone number insights
      const insightsUrl = `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}?fields=verified_name,quality_rating,is_official_business_account,account_mode,status,display_phone_number,name_status,messaging_limit_tier`;

      console.log('[whatsapp-analytics] Fetching phone insights');

      const response = await fetch(insightsUrl, {
        headers: {
          'Authorization': `Bearer ${whatsapp.access_token}`,
        },
      });

      const responseText = await response.text();
      console.log('[whatsapp-analytics] Response status:', response.status);

      if (response.ok) {
        const data = JSON.parse(responseText);
        result = {
          type: 'phone_insights',
          phone_number_id: whatsapp.phone_number_id,
          insights: data,
        };

        // Update whatsapp record with latest quality rating
        if (data.quality_rating) {
          await supabase
            .from('whatsapps')
            .update({
              quality_rating: data.quality_rating,
              quality_rating_updated_at: new Date().toISOString(),
            })
            .eq('id', whatsapp.id);
        }
      } else {
        console.error('[whatsapp-analytics] Error:', responseText);
        throw new Error('Failed to fetch phone insights');
      }
    } else {
      throw new Error('Invalid analytics type');
    }

    console.log('[whatsapp-analytics] Success');

    return new Response(JSON.stringify({ 
      success: true,
      ...result,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[whatsapp-analytics] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
