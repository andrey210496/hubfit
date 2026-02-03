import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration with origin validation
const getAllowedOrigins = () => {
  const frontendUrl = Deno.env.get('FRONTEND_URL');
  const origins = [
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  if (frontendUrl) origins.push(frontendUrl);
  return origins;
};

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = allowedOrigins.some(allowed => origin.startsWith(allowed));
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing scheduled messages...');

    // Get pending schedules that are due
    const { data: schedules, error } = await supabase
      .from('schedules')
      .select(`
        *,
        contact:contacts(*),
        user:profiles(*)
      `)
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .limit(50);

    if (error) {
      throw error;
    }

    console.log(`Found ${schedules?.length || 0} schedules to process`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const schedule of schedules || []) {
      try {
        // Get WhatsApp connection for the company
        const { data: whatsapp } = await supabase
          .from('whatsapps')
          .select('*')
          .eq('company_id', schedule.company_id)
          .eq('status', 'CONNECTED')
          .single();

        if (!whatsapp) {
          console.log(`No connected WhatsApp for company ${schedule.company_id}`);
          results.errors.push(`Schedule ${schedule.id}: No connected WhatsApp`);
          results.failed++;
          continue;
        }

        // Send message via WhatsApp API
        const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
        const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');

        if (whatsappApiUrl && whatsappApiKey) {
          const apiBaseUrl = whatsappApiUrl.replace(/\/$/, '');
          
          // WuzAPI format
          const endpoint = schedule.media_path ? '/chat/send/document' : '/chat/send/text';
          const payload: any = {
            Phone: schedule.contact.number,
          };

          // Check if has media
          if (schedule.media_path) {
            payload.Document = schedule.media_path;
            payload.Caption = schedule.body;
            payload.FileName = 'file';
          } else {
            payload.Body = schedule.body;
          }
          
          await fetch(`${apiBaseUrl}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Token': whatsappApiKey,
            },
            body: JSON.stringify(payload),
          });
        }

        // Update schedule status
        await supabase
          .from('schedules')
          .update({ 
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        results.processed++;
        console.log(`Schedule ${schedule.id} sent successfully`);

      } catch (scheduleError) {
        console.error(`Error processing schedule ${schedule.id}:`, scheduleError);
        results.errors.push(`Schedule ${schedule.id}: ${scheduleError instanceof Error ? scheduleError.message : 'Unknown error'}`);
        results.failed++;

        // Mark as failed
        await supabase
          .from('schedules')
          .update({ status: 'failed' })
          .eq('id', schedule.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      ...results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Schedule process error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

function getMediaType(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const videoExts = ['mp4', 'avi', 'mov', 'mkv'];
  const audioExts = ['mp3', 'ogg', 'wav', 'aac'];
  const documentExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

  if (imageExts.includes(ext || '')) return 'image';
  if (videoExts.includes(ext || '')) return 'video';
  if (audioExts.includes(ext || '')) return 'audio';
  if (documentExts.includes(ext || '')) return 'document';
  return 'document';
}
