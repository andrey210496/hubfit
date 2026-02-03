import { Copy, Check, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState } from 'react';

interface WebhookEndpointsProps {
  companyId: string;
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label || 'Texto'} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

function EndpointCard({ 
  name, 
  description, 
  method, 
  url, 
  headers, 
  bodyExample, 
  responseExample,
  curlExample,
  notes 
}: {
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: { key: string; value: string; description?: string }[];
  bodyExample?: object;
  responseExample?: object;
  curlExample: string;
  notes?: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  const methodColors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-yellow-500',
    DELETE: 'bg-red-500',
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={`${methodColors[method]} text-white`}>{method}</Badge>
                <CardTitle className="text-base">{name}</CardTitle>
              </div>
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </div>
            <CardDescription className="text-left">{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* URL */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">URL</label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                  {url}
                </code>
                <CopyButton text={url} label="URL" />
              </div>
            </div>

            {/* Headers */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Headers</label>
              <div className="mt-1 space-y-2">
                {headers.map((header) => (
                  <div key={header.key} className="flex items-start gap-2 text-sm">
                    <code className="bg-muted px-2 py-1 rounded font-medium">{header.key}</code>
                    <span className="text-muted-foreground py-1">:</span>
                    <div className="flex-1">
                      <code className="text-primary">{header.value}</code>
                      {header.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{header.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Body Example */}
            {bodyExample && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Body (JSON)</label>
                <div className="mt-1 relative">
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto max-h-64">
                    {JSON.stringify(bodyExample, null, 2)}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={JSON.stringify(bodyExample, null, 2)} label="Body" />
                  </div>
                </div>
              </div>
            )}

            {/* Response Example */}
            {responseExample && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Resposta</label>
                <div className="mt-1 relative">
                  <pre className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 rounded text-sm overflow-auto max-h-48">
                    {JSON.stringify(responseExample, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Notes */}
            {notes && notes.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Observações:</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc list-inside space-y-1">
                  {notes.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* cURL */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">cURL</label>
              <div className="mt-1 relative">
                <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-sm overflow-auto whitespace-pre-wrap">
                  {curlExample}
                </pre>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(curlExample);
                      toast.success('cURL copiado!');
                    }}
                    className="bg-zinc-700 hover:bg-zinc-600"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function WebhookEndpoints({ companyId }: WebhookEndpointsProps) {
  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const notificameBaseUrl = 'https://api.notificame.com.br/v1';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Documentação de APIs</h2>
          <p className="text-sm text-muted-foreground">
            Endpoints disponíveis para integração com o sistema
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="https://app.notificame.com.br/docs/#/api" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Docs NotificaMe
          </a>
        </Button>
      </div>

      <Tabs defaultValue="notificame" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notificame">NotificaMe Hub</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="internal">API Interna</TabsTrigger>
        </TabsList>

        {/* NotificaMe Hub API */}
        <TabsContent value="notificame" className="space-y-4 mt-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Autenticação NotificaMe Hub</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
              Todas as requisições devem incluir o header <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">X-Api-Token</code> com o Token do Canal.
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Base URL: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{notificameBaseUrl}</code>
            </p>
          </div>

          <h3 className="font-medium text-lg mt-6">Envio de Mensagens</h3>
          
          <EndpointCard
            name="Enviar Mensagem de Texto"
            description="Envia uma mensagem de texto simples via WhatsApp"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}', description: 'Token do canal obtido no NotificaMe Hub' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "text",
                  text: "Olá! Como posso ajudar?"
                }
              ]
            }}
            responseExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: "{\"type\":\"text\",\"text\":\"Olá! Como posso ajudar?\"}",
              id: "{{id_da_mensagem}}",
              direction: "OUT"
            }}
            notes={[
              'Mensagens de texto só podem ser enviadas dentro da janela de 24h (após última resposta do destinatário)',
              'Para iniciar conversa fora da janela, use Templates'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "text",
        "text": "Olá! Como posso ajudar?"
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Imagem"
            description="Envia uma imagem via WhatsApp"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "file",
                  fileMimeType: "image",
                  fileUrl: "https://exemplo.com/imagem.jpg",
                  fileCaption: "Legenda da imagem (opcional)"
                }
              ]
            }}
            notes={[
              'fileMimeType: image, video, audio, document, sticker',
              'fileUrl deve ser uma URL pública acessível'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "file",
        "fileMimeType": "image",
        "fileUrl": "https://exemplo.com/imagem.jpg",
        "fileCaption": "Legenda da imagem"
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Áudio"
            description="Envia um áudio ou mensagem de voz via WhatsApp"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "file",
                  fileMimeType: "audio",
                  fileUrl: "https://exemplo.com/audio.mp3",
                  voice: true
                }
              ]
            }}
            notes={[
              'voice: true = aparece como mensagem de voz (gravação)',
              'voice: false = aparece como arquivo de áudio'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "file",
        "fileMimeType": "audio",
        "fileUrl": "https://exemplo.com/audio.mp3",
        "voice": true
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Documento"
            description="Envia um documento (PDF, DOC, etc) via WhatsApp"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "file",
                  fileMimeType: "document",
                  fileUrl: "https://exemplo.com/documento.pdf",
                  fileName: "Contrato.pdf"
                }
              ]
            }}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "file",
        "fileMimeType": "document",
        "fileUrl": "https://exemplo.com/documento.pdf",
        "fileName": "Contrato.pdf"
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Template (HSM)"
            description="Envia um template aprovado pela Meta para iniciar conversas"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "template",
                  template: {
                    name: "nome_do_template",
                    language: {
                      policy: "deterministic",
                      code: "pt_BR"
                    },
                    components: [
                      {
                        type: "body",
                        parameters: [
                          { type: "text", text: "João" },
                          { type: "text", text: "12345" }
                        ]
                      }
                    ]
                  }
                }
              ]
            }}
            notes={[
              'Templates precisam ser aprovados pela Meta antes do uso',
              'Use para iniciar conversas fora da janela de 24h',
              'Os parâmetros substituem {{1}}, {{2}}, etc no template'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "template",
        "template": {
          "name": "nome_do_template",
          "language": {
            "policy": "deterministic",
            "code": "pt_BR"
          },
          "components": [
            {
              "type": "body",
              "parameters": [
                { "type": "text", "text": "João" }
              ]
            }
          ]
        }
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Botões Interativos"
            description="Envia mensagem com botões clicáveis (máx 3 botões)"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "interactive",
                  interactive: {
                    type: "button",
                    body: {
                      text: "Olá! Como posso ajudar?"
                    },
                    action: {
                      buttons: [
                        { type: "reply", reply: { id: "sim", title: "Sim" } },
                        { type: "reply", reply: { id: "nao", title: "Não" } },
                        { type: "reply", reply: { id: "duvidas", title: "Tenho dúvidas" } }
                      ]
                    }
                  }
                }
              ]
            }}
            notes={[
              'Máximo de 3 botões por mensagem',
              'Título do botão: máximo 20 caracteres',
              'Só funciona dentro da janela de 24h'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "interactive",
        "interactive": {
          "type": "button",
          "body": { "text": "Olá! Como posso ajudar?" },
          "action": {
            "buttons": [
              { "type": "reply", "reply": { "id": "sim", "title": "Sim" } },
              { "type": "reply", "reply": { "id": "nao", "title": "Não" } }
            ]
          }
        }
      }
    ]
  }'`}
          />

          <EndpointCard
            name="Enviar Lista Interativa"
            description="Envia mensagem com menu de lista (até 10 itens por seção)"
            method="POST"
            url={`${notificameBaseUrl}/channels/whatsapp/messages`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              from: "{{token_do_canal}}",
              to: "5511999999999",
              contents: [
                {
                  type: "interactive",
                  interactive: {
                    type: "list",
                    body: {
                      text: "Escolha uma opção do menu:"
                    },
                    action: {
                      button: "Ver opções",
                      sections: [
                        {
                          title: "Atendimento",
                          rows: [
                            { id: "falar_atendente", title: "Falar com atendente", description: "Conectar com nossa equipe" },
                            { id: "horarios", title: "Horários", description: "Ver horários de funcionamento" }
                          ]
                        },
                        {
                          title: "Serviços",
                          rows: [
                            { id: "precos", title: "Tabela de preços" },
                            { id: "agendamento", title: "Agendar horário" }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }}
            notes={[
              'Máximo de 10 seções',
              'Máximo de 10 itens por seção',
              'Título do item: máximo 24 caracteres',
              'Descrição do item: máximo 72 caracteres'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/channels/whatsapp/messages" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "SEU_TOKEN_DO_CANAL",
    "to": "5511999999999",
    "contents": [
      {
        "type": "interactive",
        "interactive": {
          "type": "list",
          "body": { "text": "Escolha uma opção:" },
          "action": {
            "button": "Ver opções",
            "sections": [
              {
                "title": "Menu",
                "rows": [
                  { "id": "1", "title": "Opção 1", "description": "Descrição" }
                ]
              }
            ]
          }
        }
      }
    ]
  }'`}
          />

          <h3 className="font-medium text-lg mt-6">Configuração de Webhook</h3>

          <EndpointCard
            name="Configurar Webhook"
            description="Define a URL onde o NotificaMe enviará os eventos do canal"
            method="POST"
            url={`${notificameBaseUrl}/subscriptions/`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              criteria: {
                channel: "{{token_do_canal}}"
              },
              webhook: {
                url: `${baseUrl}/functions/v1/notificame-webhook`
              }
            }}
            notes={[
              'O webhook é configurado automaticamente ao vincular o token no sistema',
              'Você pode configurar até 2 URLs diferentes'
            ]}
            curlExample={`curl -X POST "${notificameBaseUrl}/subscriptions/" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL" \\
  -H "Content-Type: application/json" \\
  -d '{
    "criteria": {
      "channel": "SEU_TOKEN_DO_CANAL"
    },
    "webhook": {
      "url": "${baseUrl}/functions/v1/notificame-webhook"
    }
  }'`}
          />

          <h3 className="font-medium text-lg mt-6">Templates</h3>

          <EndpointCard
            name="Listar Templates"
            description="Lista todos os templates disponíveis para o canal"
            method="GET"
            url={`${notificameBaseUrl}/templates/{{token_do_canal}}`}
            headers={[
              { key: 'X-Api-Token', value: '{{token_do_canal}}' },
            ]}
            responseExample={{
              data: [
                {
                  id: "123",
                  name: "hello_world",
                  status: "APPROVED",
                  category: "MARKETING",
                  language: "pt_BR"
                }
              ]
            }}
            curlExample={`curl -X GET "${notificameBaseUrl}/templates/SEU_TOKEN_DO_CANAL" \\
  -H "X-Api-Token: SEU_TOKEN_DO_CANAL"`}
          />
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="font-medium text-green-800 dark:text-green-200 mb-2">Webhook do Sistema</h3>
            <p className="text-sm text-green-700 dark:text-green-300 mb-3">
              Configure esta URL no painel do NotificaMe Hub para receber mensagens:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-green-100 dark:bg-green-900 px-3 py-2 rounded text-sm break-all">
                {baseUrl}/functions/v1/notificame-webhook
              </code>
              <CopyButton text={`${baseUrl}/functions/v1/notificame-webhook`} label="URL" />
            </div>
          </div>

          <h3 className="font-medium text-lg mt-6">Eventos Recebidos</h3>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Mensagem Recebida (direction: IN)</CardTitle>
              <CardDescription>Evento enviado quando uma mensagem é recebida no WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto">
{JSON.stringify({
  id: "msg_abc123",
  channel: "token_do_canal",
  from: "5511999999999",
  to: "5511888888888",
  direction: "IN",
  type: "text",
  contents: [
    { type: "text", text: "Olá, preciso de ajuda!" }
  ],
  timestamp: "2024-01-15T10:30:00Z"
}, null, 2)}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status de Mensagem</CardTitle>
              <CardDescription>Evento enviado quando o status de uma mensagem muda</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto">
{JSON.stringify({
  id: "msg_abc123",
  status: "delivered",
  timestamp: "2024-01-15T10:30:05Z"
}, null, 2)}
              </pre>
              <div className="mt-3 space-y-1 text-sm">
                <p><code className="bg-muted px-1 rounded">sent</code> - Mensagem enviada</p>
                <p><code className="bg-muted px-1 rounded">delivered</code> - Mensagem entregue</p>
                <p><code className="bg-muted px-1 rounded">read</code> - Mensagem lida</p>
                <p><code className="bg-muted px-1 rounded">failed</code> - Falha no envio</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resposta de Botão/Lista</CardTitle>
              <CardDescription>Evento quando usuário clica em botão ou seleciona item da lista</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-3 rounded text-sm overflow-auto">
{JSON.stringify({
  id: "msg_xyz789",
  channel: "token_do_canal",
  from: "5511999999999",
  direction: "IN",
  contents: [
    {
      type: "interactive",
      interactive: {
        button_reply: {
          id: "sim",
          title: "Sim"
        }
      }
    }
  ]
}, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Internal API */}
        <TabsContent value="internal" className="space-y-4 mt-4">
          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
            <h3 className="font-medium text-purple-800 dark:text-purple-200 mb-2">API Interna do Sistema</h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              Use o token de API da sua conta para autenticar. Obtenha o token em Configurações → API.
            </p>
          </div>

          <EndpointCard
            name="Enviar Mensagem"
            description="Envia uma mensagem via API interna do sistema"
            method="POST"
            url={`${baseUrl}/functions/v1/external-api/messages/send`}
            headers={[
              { key: 'x-api-key', value: 'SEU_TOKEN_API', description: 'Token gerado em Configurações → API' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              number: "5511999999999",
              message: "Olá! Esta é uma mensagem de teste.",
              whatsapp_id: "uuid-da-conexao (opcional)"
            }}
            responseExample={{
              success: true,
              messageId: "msg_123"
            }}
            curlExample={`curl -X POST "${baseUrl}/functions/v1/external-api/messages/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SEU_TOKEN_API" \\
  -d '{
    "number": "5511999999999",
    "message": "Olá! Esta é uma mensagem de teste."
  }'`}
          />

          <EndpointCard
            name="Criar Contato"
            description="Cria um novo contato no sistema"
            method="POST"
            url={`${baseUrl}/functions/v1/external-api/contacts`}
            headers={[
              { key: 'x-api-key', value: 'SEU_TOKEN_API' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              name: "João Silva",
              number: "5511999999999",
              email: "joao@email.com"
            }}
            responseExample={{
              success: true,
              contact: {
                id: "uuid",
                name: "João Silva",
                number: "5511999999999"
              }
            }}
            curlExample={`curl -X POST "${baseUrl}/functions/v1/external-api/contacts" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SEU_TOKEN_API" \\
  -d '{
    "name": "João Silva",
    "number": "5511999999999",
    "email": "joao@email.com"
  }'`}
          />

          <EndpointCard
            name="Criar Ticket"
            description="Cria um novo ticket de atendimento"
            method="POST"
            url={`${baseUrl}/functions/v1/external-api/tickets`}
            headers={[
              { key: 'x-api-key', value: 'SEU_TOKEN_API' },
              { key: 'Content-Type', value: 'application/json' },
            ]}
            bodyExample={{
              contact_id: "uuid-do-contato",
              queue_id: "uuid-da-fila (opcional)",
              status: "open"
            }}
            responseExample={{
              success: true,
              ticket: {
                id: "uuid",
                status: "open"
              }
            }}
            curlExample={`curl -X POST "${baseUrl}/functions/v1/external-api/tickets" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: SEU_TOKEN_API" \\
  -d '{
    "contact_id": "uuid-do-contato",
    "status": "open"
  }'`}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
