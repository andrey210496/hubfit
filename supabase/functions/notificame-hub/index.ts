import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NOTIFICAME_BASE_URL = 'https://api.notificame.com.br/v1';

// Verify channel token by attempting a "safe" send request.
// NotificaMe environments sometimes differ in whether the base URL already includes `/v1`,
// so we try both variants.
async function verifyChannelToken(
  channelToken: string
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(channelToken || '')) {
      return { success: false, error: 'Token do canal inválido (formato inválido)' };
    }

    console.log('Verifying channel token (send-probe)...');
    console.log('Token:', channelToken);

    const baseNoV1 = NOTIFICAME_BASE_URL.replace(/\/v1\/?$/, '');

    const endpoints = [
      `${NOTIFICAME_BASE_URL}/channels/whatsapp/messages`,
      `${baseNoV1}/channels/whatsapp/messages`,
    ];

    const probeBody = {
      from: channelToken,
      to: '0',
      contents: [{ type: 'text', text: 'validation_test' }],
    };

    let lastStatus: number | null = null;
    let lastText = '';

    for (const endpoint of endpoints) {
      try {
        const resp = await fetch(endpoint, {
          method: 'POST',
          headers: {
            // In this project, we authenticate NotificaMe calls with the channel token.
            'X-Api-Token': channelToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(probeBody),
        });

        lastStatus = resp.status;
        lastText = await resp.text();

        console.log('Probe endpoint:', endpoint);
        console.log('Probe status:', resp.status);
        console.log('Probe response:', lastText);

        // 400 commonly means auth OK but request invalid (expected for our probe).
        if (resp.status === 400) {
          return { success: true };
        }

        if (resp.ok) {
          return { success: true };
        }

        // Definitive auth failures
        if (resp.status === 401 || resp.status === 403) {
          return { success: false, error: 'Token do canal inválido' };
        }

        // Other statuses (404/422/500) are inconclusive here; try next endpoint.
      } catch (e) {
        console.log('Probe error for endpoint:', endpoint, e);
      }
    }

    // If we reached here, we couldn't conclusively validate, but the token format is correct.
    // We allow the connection and rely on actual send operations to confirm.
    return {
      success: true,
      warning: `Não foi possível validar o token automaticamente (último status: ${lastStatus ?? 'n/a'}).`,
    };
  } catch (error) {
    console.error('Channel verification error:', error);
    // Do not hard-block the connection due to transient validation issues.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(channelToken || '')) {
      return {
        success: true,
        warning: 'Falha na validação automática (erro interno), mas token tem formato válido.',
      };
    }
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Connect a channel (verify token and save)
async function connectChannel(
  supabase: any,
  connectionId: string,
  channelToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the channel token first
    const verification = await verifyChannelToken(channelToken);
    
    if (!verification.success) {
      return verification;
    }

    // Update connection with channel token
    const { error } = await supabase
      .from('whatsapps')
      .update({
        instance_id: channelToken,
        token: channelToken, // Also store in token field for message sending
        status: 'CONNECTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error updating connection:', error);
      return { success: false, error: 'Erro ao salvar conexão' };
    }

    // Configure webhook for this channel
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const webhookUrl = `${supabaseUrl}/functions/v1/notificame-webhook`;

    try {
      await fetch(`${NOTIFICAME_BASE_URL}/subscriptions/`, {
        method: 'POST',
        headers: {
          'X-Api-Token': channelToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          criteria: {
            channel: channelToken,
          },
          webhook: {
            url: webhookUrl,
          },
        }),
      });
      console.log('Webhook configured for channel:', channelToken);
    } catch (webhookError) {
      console.warn('Failed to configure webhook (non-critical):', webhookError);
    }

    return { success: true };
  } catch (error) {
    console.error('Connect channel error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Disconnect a channel
async function disconnectChannel(
  supabase: any,
  connectionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('whatsapps')
      .update({
        status: 'DISCONNECTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (error) {
      console.error('Error disconnecting:', error);
      return { success: false, error: 'Erro ao desconectar' };
    }

    return { success: true };
  } catch (error) {
    console.error('Disconnect error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Send text message
async function sendTextMessage(
  channelToken: string,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('Sending text message via NotificaMe Hub');

    const response = await fetch(`${NOTIFICAME_BASE_URL}/channels/whatsapp/messages`, {
      method: 'POST',
      headers: {
        'X-Api-Token': channelToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: to.replace(/\D/g, ''),
        contents: [
          {
            type: 'text',
            text: text,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Send message failed:', response.status, data);
      return { success: false, error: data.message || data.error || `HTTP ${response.status}` };
    }

    console.log('Message sent:', data);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Send message error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Send media message
async function sendMediaMessage(
  channelToken: string,
  to: string,
  mediaUrl: string,
  mediaType: string,
  caption?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('Sending media message via NotificaMe Hub');

    let fileMimeType = 'document';
    if (mediaType.includes('image')) fileMimeType = 'image';
    else if (mediaType.includes('video')) fileMimeType = 'video';
    else if (mediaType.includes('audio')) fileMimeType = 'audio';

    const content: any = {
      type: 'file',
      fileMimeType: fileMimeType,
      fileUrl: mediaUrl,
    };

    if (caption) {
      content.fileCaption = caption;
    }

    if (fileMimeType === 'audio') {
      content.voice = true;
    }

    const response = await fetch(`${NOTIFICAME_BASE_URL}/channels/whatsapp/messages`, {
      method: 'POST',
      headers: {
        'X-Api-Token': channelToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: to.replace(/\D/g, ''),
        contents: [content],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Send media failed:', response.status, data);
      return { success: false, error: data.message || data.error || `HTTP ${response.status}` };
    }

    console.log('Media sent:', data);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Send media error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Send template message
async function sendTemplateMessage(
  channelToken: string,
  to: string,
  templateName: string,
  parameters?: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('Sending template message via NotificaMe Hub');

    const templateContent: any = {
      type: 'template',
      template: {
        name: templateName,
        language: {
          policy: 'deterministic',
          code: 'pt_BR',
        },
      },
    };

    if (parameters && parameters.length > 0) {
      templateContent.template.components = [
        {
          type: 'body',
          parameters: parameters.map((param) => ({
            type: 'text',
            text: param,
          })),
        },
      ];
    }

    const response = await fetch(`${NOTIFICAME_BASE_URL}/channels/whatsapp/messages`, {
      method: 'POST',
      headers: {
        'X-Api-Token': channelToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: to.replace(/\D/g, ''),
        contents: [templateContent],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Send template failed:', response.status, data);
      return { success: false, error: data.message || data.error || `HTTP ${response.status}` };
    }

    console.log('Template sent:', data);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Send template error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Send interactive message
async function sendInteractiveMessage(
  channelToken: string,
  to: string,
  type: 'button' | 'list',
  body: string,
  buttons?: Array<{ id: string; title: string }>,
  sections?: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log('Sending interactive message via NotificaMe Hub');

    const interactiveContent: any = {
      type: 'interactive',
      interactive: {
        type: type,
        body: {
          text: body,
        },
        action: {},
      },
    };

    if (type === 'button' && buttons) {
      interactiveContent.interactive.action.buttons = buttons.map((btn) => ({
        type: 'reply',
        reply: {
          id: btn.id,
          title: btn.title,
        },
      }));
    }

    if (type === 'list' && sections) {
      interactiveContent.interactive.action.button = 'Ver opções';
      interactiveContent.interactive.action.sections = sections;
    }

    const response = await fetch(`${NOTIFICAME_BASE_URL}/channels/whatsapp/messages`, {
      method: 'POST',
      headers: {
        'X-Api-Token': channelToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: channelToken,
        to: to.replace(/\D/g, ''),
        contents: [interactiveContent],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Send interactive failed:', response.status, data);
      return { success: false, error: data.message || data.error || `HTTP ${response.status}` };
    }

    console.log('Interactive sent:', data);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('Send interactive error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// List templates
async function listTemplates(
  channelToken: string
): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  try {
    const response = await fetch(`${NOTIFICAME_BASE_URL}/templates/${channelToken}`, {
      method: 'GET',
      headers: {
        'X-Api-Token': channelToken,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || `HTTP ${response.status}` };
    }

    return { success: true, templates: data.data || [] };
  } catch (error) {
    console.error('List templates error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

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
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user profile and company
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: 'Empresa não encontrada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { action, ...params } = body;

    console.log('notificame-hub action:', action);

    let result: any = { success: false, error: 'Ação não reconhecida' };

    switch (action) {
      case 'test_connection':
        // Test global API connection by fetching config and checking the API is reachable
        try {
          const { data: globalConfig } = await supabase
            .from('campaign_settings')
            .select('key, value')
            .eq('company_id', '00000000-0000-0000-0000-000000000000')
            .in('key', ['notificame_api_url', 'notificame_api_key']);

          const settings: Record<string, string> = {};
          globalConfig?.forEach((item: any) => {
            settings[item.key] = item.value || '';
          });

          const apiUrl = settings.notificame_api_url;
          const apiKey = settings.notificame_api_key;

          if (!apiUrl || !apiKey) {
            result = { success: false, error: 'URL ou API Key não configuradas' };
            break;
          }

          // Try to reach the API with a simple GET request
          const testUrl = apiUrl.replace(/\/+$/, '') + '/status';
          console.log('Testing connection to:', testUrl);
          
          const testResp = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'X-Api-Token': apiKey,
              'Content-Type': 'application/json',
            },
          });

          console.log('Test connection status:', testResp.status);

          // Even 404 can mean the API is reachable but endpoint doesn't exist
          // 401/403 means auth failed
          if (testResp.status === 401 || testResp.status === 403) {
            result = { success: false, error: 'API Key inválida' };
          } else if (testResp.ok || testResp.status === 404 || testResp.status === 400) {
            result = { success: true };
          } else {
            const text = await testResp.text();
            result = { success: false, error: `Erro na API: ${testResp.status} - ${text}` };
          }
        } catch (e) {
          console.error('Test connection error:', e);
          result = { success: false, error: e instanceof Error ? e.message : 'Erro ao conectar' };
        }
        break;

      case 'verify_token':
        // Verify a channel token directly
        if (!params.channelToken) {
          result = { success: false, error: 'Token do canal não fornecido' };
        } else {
          result = await verifyChannelToken(params.channelToken);
        }
        break;

      case 'connect_channel':
        // Get connection
        const { data: connection } = await supabase
          .from('whatsapps')
          .select('*')
          .eq('id', params.connectionId)
          .eq('company_id', profile.company_id)
          .single();

        if (!connection) {
          result = { success: false, error: 'Conexão não encontrada' };
        } else if (!params.channelToken) {
          result = { success: false, error: 'Token do canal não fornecido' };
        } else {
          result = await connectChannel(supabase, params.connectionId, params.channelToken);
        }
        break;

      case 'disconnect_channel':
        result = await disconnectChannel(supabase, params.connectionId);
        break;

      case 'send_text':
        if (!params.channelToken || !params.to || !params.text) {
          result = { success: false, error: 'Parâmetros incompletos' };
        } else {
          result = await sendTextMessage(params.channelToken, params.to, params.text);
        }
        break;

      case 'send_media':
        if (!params.channelToken || !params.to || !params.mediaUrl) {
          result = { success: false, error: 'Parâmetros incompletos' };
        } else {
          result = await sendMediaMessage(
            params.channelToken,
            params.to,
            params.mediaUrl,
            params.mediaType || 'document',
            params.caption
          );
        }
        break;

      case 'send_template':
        if (!params.channelToken || !params.to || !params.templateName) {
          result = { success: false, error: 'Parâmetros incompletos' };
        } else {
          result = await sendTemplateMessage(
            params.channelToken,
            params.to,
            params.templateName,
            params.parameters
          );
        }
        break;

      case 'send_interactive':
        if (!params.channelToken || !params.to || !params.interactiveType || !params.body) {
          result = { success: false, error: 'Parâmetros incompletos' };
        } else {
          result = await sendInteractiveMessage(
            params.channelToken,
            params.to,
            params.interactiveType,
            params.body,
            params.buttons,
            params.sections
          );
        }
        break;

      case 'list_templates':
        if (!params.channelToken) {
          result = { success: false, error: 'Token do canal não fornecido' };
        } else {
          result = await listTemplates(params.channelToken);
        }
        break;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('NotificaMe Hub error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
