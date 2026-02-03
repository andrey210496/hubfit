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

    // ==========================================
    // AUTHENTICATION & AUTHORIZATION
    // ==========================================
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Get user's company_id from profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.company_id) {
      return new Response(JSON.stringify({ error: 'User profile not found' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userCompanyId = profile.company_id;

    const body = await req.json();
    const { ticketId, message, action } = body;

    console.log('Chatbot process:', action, ticketId, 'by user:', userId);

    // Get ticket with all relations
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        contact:contacts(*),
        queue:queues(*),
        whatsapp:whatsapps(*)
      `)
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    // Verify ticket belongs to user's company
    if (ticket.company_id !== userCompanyId) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    switch (action) {
      case 'process_message': {
        return await processIncomingMessage(supabase, ticket, message, corsHeaders);
      }

      case 'send_greeting': {
        // Send queue greeting message
        if (ticket.queue?.greeting_message) {
          await sendMessage(supabase, ticket, ticket.queue.greeting_message);
        }
        break;
      }

      case 'send_menu': {
        // Get queue options
        const { data: options } = await supabase
          .from('queue_options')
          .select('*')
          .eq('queue_id', ticket.queue_id)
          .is('parent_id', null)
          .order('order_num');

        if (options && options.length > 0) {
          let menuText = 'Escolha uma opção:\n\n';
          options.forEach((opt: any, index: number) => {
            menuText += `${opt.option || index + 1} - ${opt.title}\n`;
          });
          await sendMessage(supabase, ticket, menuText);
        }
        break;
      }

      case 'transfer_to_queue': {
        const { queueId } = body;
        
        // Get queue
        const { data: queue } = await supabase
          .from('queues')
          .select('*')
          .eq('id', queueId)
          .single();

        if (queue) {
          // Update ticket
          await supabase
            .from('tickets')
            .update({ 
              queue_id: queueId,
              chatbot: false,
              status: 'pending',
            })
            .eq('id', ticketId);

          // Update tracking
          await supabase
            .from('ticket_tracking')
            .update({ queue_at: new Date().toISOString() })
            .eq('ticket_id', ticketId);

          // Send transfer message
          if (queue.greeting_message) {
            await sendMessage(supabase, ticket, queue.greeting_message);
          }
        }
        break;
      }

      case 'transfer_to_user': {
        const { userId } = body;

        await supabase
          .from('tickets')
          .update({ 
            user_id: userId,
            chatbot: false,
            status: 'open',
          })
          .eq('id', ticketId);

        // Update tracking
        await supabase
          .from('ticket_tracking')
          .update({ started_at: new Date().toISOString() })
          .eq('ticket_id', ticketId);

        break;
      }

      case 'close_ticket': {
        await supabase
          .from('tickets')
          .update({ 
            status: 'closed',
            chatbot: false,
          })
          .eq('id', ticketId);

        // Update tracking
        await supabase
          .from('ticket_tracking')
          .update({ finished_at: new Date().toISOString() })
          .eq('ticket_id', ticketId);

        // Send farewell message if configured
        if (ticket.whatsapp?.farewellMessage) {
          await sendMessage(supabase, ticket, ticket.whatsapp.farewellMessage);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Chatbot process error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});

async function processIncomingMessage(supabase: any, ticket: any, message: string, corsHeaders: Record<string, string>) {
  // Check if chatbot is enabled for this ticket
  if (!ticket.chatbot) {
    return new Response(JSON.stringify({ success: true, processed: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get current queue options
  const { data: options } = await supabase
    .from('queue_options')
    .select('*')
    .eq('queue_id', ticket.queue_id)
    .order('order_num');

  if (!options || options.length === 0) {
    // No chatbot options configured, transfer to human
    await supabase
      .from('tickets')
      .update({ chatbot: false, status: 'pending' })
      .eq('id', ticket.id);

    return new Response(JSON.stringify({ success: true, transferred: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find matching option
  const normalizedMessage = message.toLowerCase().trim();
  const selectedOption = options.find((opt: any) => {
    const optionNumber = opt.option?.toString().toLowerCase();
    const optionTitle = opt.title?.toLowerCase();
    return optionNumber === normalizedMessage || 
           optionTitle?.includes(normalizedMessage) ||
           normalizedMessage.includes(optionTitle);
  });

  if (selectedOption) {
    // Send option response
    if (selectedOption.message) {
      await sendMessage(supabase, ticket, selectedOption.message);
    }

    // Check for child options
    const { data: childOptions } = await supabase
      .from('queue_options')
      .select('*')
      .eq('parent_id', selectedOption.id)
      .order('order_num');

    if (childOptions && childOptions.length > 0) {
      // Show sub-menu
      let menuText = '\n';
      childOptions.forEach((opt: any) => {
        menuText += `${opt.option} - ${opt.title}\n`;
      });
      await sendMessage(supabase, ticket, menuText);
    } else {
      // No more options, check if should transfer
      // This would depend on your business logic
      await supabase
        .from('tickets')
        .update({ 
          amount_used_bot_queues: ticket.amount_used_bot_queues + 1,
        })
        .eq('id', ticket.id);
    }

    return new Response(JSON.stringify({ success: true, optionSelected: selectedOption.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // No matching option found
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('company_id', ticket.company_id)
    .eq('key', 'chatBotNotFoundMessage')
    .single();

  const notFoundMessage = settings?.value || 'Desculpe, não entendi. Por favor, escolha uma opção válida.';
  await sendMessage(supabase, ticket, notFoundMessage);

  return new Response(JSON.stringify({ success: true, notUnderstood: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendMessage(supabase: any, ticket: any, text: string) {
  // Save message to database
  await supabase.from('messages').insert({
    ticket_id: ticket.id,
    contact_id: ticket.contact_id,
    company_id: ticket.company_id,
    body: text,
    from_me: true,
    remote_jid: `${ticket.contact.number}@s.whatsapp.net`,
  });

  // Send via WhatsApp API
  const whatsappApiUrl = Deno.env.get('WHATSAPP_API_URL');
  const whatsappApiKey = Deno.env.get('WHATSAPP_API_KEY');

  if (whatsappApiUrl && whatsappApiKey && ticket.whatsapp) {
    try {
      const apiBaseUrl = whatsappApiUrl.replace(/\/$/, '');
      await fetch(`${apiBaseUrl}/chat/send/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': whatsappApiKey,
        },
        body: JSON.stringify({
          Phone: ticket.contact.number,
          Body: text,
        }),
      });
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    }
  }
}
