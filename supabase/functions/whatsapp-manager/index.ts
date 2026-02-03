import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GLOBAL_COMPANY_ID = '00000000-0000-0000-0000-000000000000';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
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

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User has no company');
    }

    const isSuperAdmin = profile.company_id === GLOBAL_COMPANY_ID;

    const body = await req.json();
    const { action, contactId, phoneNumber, whatsappId, name } = body;

    console.log('WhatsApp Manager - Action:', action, {
      whatsappId,
      name,
      companyId: profile.company_id,
    });

    // Get active WhatsApp connection
    let whatsapp = null;

    if (whatsappId) {
      const { data } = await supabase
        .from('whatsapps')
        .select('id, waba_id, access_token, phone_number_id, instance_id, status')
        .eq('id', whatsappId)
        .eq('status', 'CONNECTED')
        .maybeSingle();
      whatsapp = data;
    }

    if (!whatsapp) {
      // Find any active connection
      let query = supabase
        .from('whatsapps')
        .select('id, waba_id, access_token, phone_number_id, instance_id, status, company_id')
        .eq('status', 'CONNECTED')
        .order('is_default', { ascending: false })
        .limit(1);

      if (!isSuperAdmin) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data } = await query.maybeSingle();
      whatsapp = data;
    }

    const hasMetaConnection = whatsapp?.waba_id && whatsapp?.access_token;
    const hasNotificaMeConnection = whatsapp?.instance_id;

    if (!whatsapp || (!hasMetaConnection && !hasNotificaMeConnection)) {
      throw new Error('Nenhuma conexão ativa encontrada');
    }

    // Handle different actions
    switch (action) {
      case 'updateContactProfilePic': {
        if (!contactId) {
          throw new Error('contactId is required');
        }

        const profilePicUrl = null;

        if (hasMetaConnection && phoneNumber) {
          // Clean phone number
          let cleanPhone = phoneNumber.replace(/\D/g, '');
          if (cleanPhone.length === 10 || cleanPhone.length === 11) {
            cleanPhone = '55' + cleanPhone;
          }

          try {
            // Get profile pic from Meta API
            const response = await fetch(
              `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/contacts`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${whatsapp.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  blocking: 'wait',
                  contacts: [`+${cleanPhone}`],
                }),
              }
            );

            const data = await response.json();
            
            if (response.ok && data.contacts?.[0]?.wa_id) {
              // Contact exists on WhatsApp, try to get profile picture
              // Note: Meta Cloud API doesn't directly expose profile pictures
              // The profile picture would need to be retrieved through other means
              console.log('Contact verified on WhatsApp:', data.contacts[0].wa_id);
            }
          } catch (error) {
            console.log('Failed to get profile from Meta API:', error);
          }
        }

        // Update contact if we got a profile pic
        if (profilePicUrl) {
          await supabase
            .from('contacts')
            .update({ profile_pic_url: profilePicUrl, updated_at: new Date().toISOString() })
            .eq('id', contactId);
        }

        return new Response(JSON.stringify({
          success: true,
          profilePicUrl,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'getConnectionStatus': {
        return new Response(JSON.stringify({
          success: true,
          connected: true,
          whatsappId: whatsapp.id,
          provider: hasMetaConnection ? 'meta' : 'notificame',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      case 'validateNumber': {
        if (!phoneNumber) {
          throw new Error('phoneNumber is required');
        }

        let cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length === 10 || cleanPhone.length === 11) {
          cleanPhone = '55' + cleanPhone;
        }

        let isValid = false;
        let waId = null;

        if (hasMetaConnection) {
          try {
            const response = await fetch(
              `https://graph.facebook.com/v21.0/${whatsapp.phone_number_id}/contacts`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${whatsapp.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  blocking: 'wait',
                  contacts: [`+${cleanPhone}`],
                }),
              }
            );

            const data = await response.json();
            
            if (response.ok && data.contacts?.[0]?.status === 'valid') {
              isValid = true;
              waId = data.contacts[0].wa_id;
            }
          } catch (error) {
            console.log('Failed to validate number:', error);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          isValid,
          waId,
          phoneNumber: cleanPhone,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('WhatsApp Manager Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
