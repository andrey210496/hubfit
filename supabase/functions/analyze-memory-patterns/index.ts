import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, count, percentage, sampleMessages, topKeywords } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `Você é um analista especializado em atendimento ao cliente para academias e boxes de CrossFit.
Analise os dados de conversas e forneça uma sugestão prática e acionável em português brasileiro.
Seja direto e objetivo. Máximo 2-3 frases.`;

    const userPrompt = `Categoria: ${category}
Total de menções: ${count} (${percentage.toFixed(1)}% do total)
Palavras-chave mais frequentes: ${topKeywords.map((k: any) => k.word).join(', ')}
Exemplos de mensagens: ${sampleMessages.slice(0, 2).join(' | ')}

Qual ação você sugere para melhorar o atendimento nesta categoria?`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          suggestion: 'Limite de requisições atingido. Tente novamente em alguns minutos.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          suggestion: 'Créditos de IA esgotados. Adicione mais créditos para continuar.' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || 'Não foi possível gerar sugestão.';

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-memory-patterns:', error);
    return new Response(JSON.stringify({ 
      suggestion: 'Erro ao analisar padrões. Tente novamente.',
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
