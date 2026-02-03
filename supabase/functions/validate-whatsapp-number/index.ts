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
    console.log('[validate-whatsapp-number] Starting...');
    
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
    const { phoneNumbers } = body as { phoneNumbers: string[] };
    
    console.log('[validate-whatsapp-number] phoneNumbers=', phoneNumbers?.length);

    if (!phoneNumbers || phoneNumbers.length === 0) {
      throw new Error('Missing required field: phoneNumbers');
    }

    if (phoneNumbers.length > 100) {
      throw new Error('Maximum 100 phone numbers per request');
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User profile not found');
    }

    // Clean phone numbers
    const cleanedNumbers = phoneNumbers.map(num => {
      return num.replace(/[^0-9]/g, '');
    });

    // For NotificaMe Hub, we assume all numbers are potentially valid
    // Real validation happens when sending messages
    const results = cleanedNumbers.map(num => ({
      input: num,
      wa_id: num,
      valid: num.length >= 10, // Basic length check
    }));

    const validCount = results.filter(r => r.valid).length;
    const invalidCount = results.filter(r => !r.valid).length;

    console.log('[validate-whatsapp-number] Results: valid=', validCount, 'invalid=', invalidCount);

    return new Response(JSON.stringify({ 
      success: true,
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[validate-whatsapp-number] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
