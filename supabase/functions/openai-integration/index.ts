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

    // SECURITY: Require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error('User not associated with a company');
    }

    const body = await req.json();
    const { ticketId, message, promptId } = body;

    console.log('OpenAI integration:', ticketId, promptId);

    // SECURITY: Verify ticket belongs to user's company
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('company_id')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.company_id !== profile.company_id) {
      throw new Error('Access denied');
    }

    // Get prompt configuration
    const { data: prompt, error: promptError } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (promptError || !prompt) {
      throw new Error('Prompt not found');
    }

    // SECURITY: Verify prompt belongs to user's company
    if (prompt.company_id !== profile.company_id) {
      throw new Error('Access denied to prompt');
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('body, from_me')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(prompt.max_messages || 10);

    // Build conversation for OpenAI
    const conversationHistory = (messages || []).reverse().map((msg: any) => ({
      role: msg.from_me ? 'assistant' : 'user',
      content: msg.body,
    }));

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: message,
    });

    // Use Lovable AI Gateway or custom API key
    let apiUrl = 'https://ai.gateway.lovable.dev/v1/chat/completions';
    let apiKey = Deno.env.get('LOVABLE_API_KEY');
    let model = 'google/gemini-2.5-flash';

    // If prompt has custom API key, use OpenAI directly
    if (prompt.api_key) {
      apiUrl = 'https://api.openai.com/v1/chat/completions';
      apiKey = prompt.api_key;
      model = 'gpt-4o-mini';
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: prompt.prompt,
          },
          ...conversationHistory,
        ],
        temperature: prompt.temperature || 0.7,
        max_tokens: prompt.max_tokens || 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${error}`);
    }

    const result = await response.json();
    const aiResponse = result.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('OpenAI integration error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
