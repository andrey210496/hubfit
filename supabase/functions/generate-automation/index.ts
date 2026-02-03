import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `Você é um especialista em criar automações para WhatsApp Business, similar ao n8n mas focado em atendimento. 
Sua tarefa é analisar o prompt do usuário e criar uma automação completa com gatilho e passos.

GATILHOS DISPONÍVEIS:
- message_received: Quando qualquer mensagem é recebida
- keyword_match: Quando uma palavra-chave específica é detectada na mensagem
- new_contact: Quando um novo contato entra em contato pela primeira vez
- ticket_opened: Quando um novo ticket/atendimento é aberto
- ticket_closed: Quando um ticket é fechado
- schedule: Execução em horário agendado (cron)
- webhook: Quando um webhook externo é chamado

AÇÕES DISPONÍVEIS (use quantas precisar para criar o fluxo ideal):

📨 MENSAGENS:
- send_message: Enviar mensagem de texto (config: { message: string })
- send_media: Enviar mídia (config: { media_url: string, caption?: string })

👥 ATENDIMENTO:
- assign_queue: Atribuir à fila (config: { queue_id: string, queue_name: string })
- assign_user: Atribuir a usuário (config: { user_id: string, user_name: string })
- add_tag: Adicionar tag ao contato (config: { tag_id: string, tag_name: string })
- remove_tag: Remover tag do contato (config: { tag_id: string, tag_name: string })
- close_ticket: Fechar o ticket atual (config: {})
- transfer_ticket: Transferir ticket (config: { queue_id?: string, user_id?: string })

🔗 INTEGRAÇÕES:
- call_webhook: Chamar webhook externo (config: { url: string, method: 'GET'|'POST'|'PUT', headers?: object, body?: string })
- http_request: Requisição HTTP genérica (config: { url: string, method: string, headers?: object, body?: string, save_response_as?: string })
- google_sheets: Operações no Google Sheets (config: { operation: 'read'|'append'|'update', spreadsheet_id: string, range: string, values?: array })

📧 COMUNICAÇÃO EXTERNA:
- send_email: Enviar email (config: { to: string, subject: string, body: string, html?: boolean })
- send_sms: Enviar SMS (config: { to: string, message: string })

🤖 IA E AUTOMAÇÃO:
- ai_response: Gerar resposta com IA (config: { system_prompt: string, max_tokens?: number, model?: string })
- run_javascript: Executar código JavaScript (config: { code: string, input_vars?: string[], output_var?: string })

⏱️ CONTROLE DE FLUXO:
- delay: Aguardar antes da próxima ação (config: { seconds: number })
- wait_response: Aguardar resposta do cliente (config: { timeout_seconds: number, timeout_action?: string })
- condition: Condição para ramificação (config: { field: string, operator: string, value: string })
- split: Dividir em múltiplos caminhos (config: { branches: [{ name: string, condition?: object }] })
- loop: Iterar sobre lista (config: { list_variable: string, item_variable: string })

📝 DADOS:
- update_contact: Atualizar dados do contato (config: { fields: { name?: string, email?: string, custom_fields?: object } })
- set_variable: Definir variável para uso posterior (config: { name: string, value: string, type?: 'string'|'number'|'boolean'|'json' })
- internal_note: Adicionar nota interna ao ticket (config: { note: string })

VARIÁVEIS DISPONÍVEIS (use em qualquer texto):
- {{contact.name}} ou {{contato.nome}} - Nome do contato
- {{contact.phone}} ou {{contato.telefone}} - Número do contato
- {{contact.email}} - Email do contato
- {{company.name}} ou {{empresa.nome}} - Nome da empresa
- {{ticket.id}} - ID do ticket
- {{ticket.queue}} - Fila atual
- {{message.text}} ou {{mensagem.texto}} - Texto da mensagem recebida
- {{message.media_url}} - URL da mídia (se houver)
- {{current_date}} - Data atual
- {{current_time}} - Hora atual
- {{var.NOME_VARIAVEL}} - Variável customizada definida com set_variable

EXPRESSÕES (para condições):
- Operadores: equals, not_equals, contains, not_contains, starts_with, ends_with, greater_than, less_than, is_empty, is_not_empty
- Campos: message, contact_name, contact_number, contact_email, ticket_status, queue_name, tag_names, custom_field.NOME

Responda SEMPRE em formato JSON com a seguinte estrutura:
{
  "name": "Nome descritivo da automação",
  "description": "Descrição do que a automação faz",
  "trigger_type": "tipo_do_gatilho",
  "trigger_config": { configurações específicas do gatilho },
  "steps": [
    {
      "action_type": "tipo_da_acao",
      "action_config": { configurações da ação },
      "order_num": 0
    }
  ]
}

Exemplo de trigger_config para keyword_match: { "keywords": ["olá", "oi", "bom dia"], "match_type": "any" }
Exemplo de trigger_config para schedule: { "cron": "0 9 * * *", "description": "Todo dia às 9h" }

Seja criativo e prático. Crie fluxos completos que realmente resolvam o problema descrito.
Use variáveis para personalizar mensagens. Combine múltiplas ações para criar fluxos poderosos.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Prompt é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'API de IA não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating automation for prompt:', prompt);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-5',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'Créditos insuficientes. Adicione créditos ao workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar automação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resposta vazia da IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('AI response:', content);

    // Parse JSON from the response (handle markdown code blocks)
    let jsonContent = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    try {
      const automation = JSON.parse(jsonContent);
      
      // Validate required fields
      if (!automation.name || !automation.trigger_type || !automation.steps) {
        throw new Error('Estrutura inválida');
      }

      return new Response(
        JSON.stringify({ success: true, automation }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, jsonContent);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao processar resposta da IA. Tente reformular o prompt.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in generate-automation:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
