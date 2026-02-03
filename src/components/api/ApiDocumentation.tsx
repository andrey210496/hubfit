import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Zap, Shield, Clock, AlertTriangle, CheckCircle2, BookOpen, Code2, Send, Users, MessageSquare, Ticket, Tag, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/external-api`;

interface EndpointDoc {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  permissions: string[];
  params?: Record<string, string>;
  body?: Record<string, string>;
  example?: string;
  responseExample?: string;
  curlExample?: string;
}

const contactEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/contacts',
    description: 'Lista todos os contatos com paginação',
    permissions: ['contacts:read'],
    params: {
      limit: 'Número máximo de resultados (padrão: 50, máx: 100)',
      offset: 'Pular N resultados (paginação)',
      search: 'Buscar por nome ou número',
    },
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-do-contato",
      "name": "João Silva",
      "number": "5511999999999",
      "email": "joao@email.com",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/contacts?limit=50&offset=0" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'GET',
    path: '/contacts/:id',
    description: 'Busca um contato específico pelo ID',
    permissions: ['contacts:read'],
    responseExample: `{
  "success": true,
  "data": {
    "id": "uuid-do-contato",
    "name": "João Silva",
    "number": "5511999999999",
    "email": "joao@email.com",
    "notes": "Cliente VIP",
    "tags": ["vip", "recorrente"],
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-20T14:00:00Z"
  }
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/contacts/CONTACT_ID" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'POST',
    path: '/contacts',
    description: 'Cria um novo contato',
    permissions: ['contacts:write'],
    body: {
      name: 'string (obrigatório)',
      number: 'string (obrigatório) - formato: 5511999999999',
      email: 'string (opcional)',
      notes: 'string (opcional)',
    },
    example: `{
  "name": "João Silva",
  "number": "5511999999999",
  "email": "joao@email.com"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "novo-uuid-gerado",
    "name": "João Silva",
    "number": "5511999999999",
    "email": "joao@email.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}`,
    curlExample: `curl -X POST "${API_BASE_URL}/contacts" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva",
    "number": "5511999999999",
    "email": "joao@email.com"
  }'`,
  },
  {
    method: 'PUT',
    path: '/contacts/:id',
    description: 'Atualiza um contato existente',
    permissions: ['contacts:write'],
    body: {
      name: 'string (opcional)',
      number: 'string (opcional)',
      email: 'string (opcional)',
      notes: 'string (opcional)',
    },
    example: `{
  "name": "João Silva Atualizado",
  "email": "joao.novo@email.com"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "uuid-do-contato",
    "name": "João Silva Atualizado",
    "email": "joao.novo@email.com",
    "updated_at": "2024-01-20T14:00:00Z"
  }
}`,
    curlExample: `curl -X PUT "${API_BASE_URL}/contacts/CONTACT_ID" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "João Silva Atualizado",
    "email": "joao.novo@email.com"
  }'`,
  },
  {
    method: 'DELETE',
    path: '/contacts/:id',
    description: 'Remove um contato',
    permissions: ['contacts:write'],
    responseExample: `{
  "success": true,
  "message": "Contato removido com sucesso"
}`,
    curlExample: `curl -X DELETE "${API_BASE_URL}/contacts/CONTACT_ID" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
];

const ticketEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/tickets',
    description: 'Lista todos os tickets com filtros',
    permissions: ['tickets:read'],
    params: {
      status: 'Filtrar por status: open, pending, closed',
      queue_id: 'Filtrar por fila',
      user_id: 'Filtrar por atendente',
      limit: 'Número máximo de resultados (padrão: 50, máx: 100)',
      offset: 'Pular N resultados (paginação)',
    },
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-do-ticket",
      "status": "open",
      "contact": {
        "id": "uuid-contato",
        "name": "João Silva",
        "number": "5511999999999"
      },
      "queue": {
        "id": "uuid-fila",
        "name": "Suporte"
      },
      "user": null,
      "last_message": "Olá, preciso de ajuda",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 50,
    "offset": 0
  }
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/tickets?status=open&limit=50" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'GET',
    path: '/tickets/:id',
    description: 'Busca um ticket específico com mensagens',
    permissions: ['tickets:read'],
    params: {
      include_messages: 'true para incluir histórico de mensagens',
    },
    responseExample: `{
  "success": true,
  "data": {
    "id": "uuid-do-ticket",
    "status": "open",
    "contact": {
      "id": "uuid-contato",
      "name": "João Silva",
      "number": "5511999999999"
    },
    "messages": [
      {
        "id": "uuid-msg",
        "body": "Olá, preciso de ajuda",
        "from_me": false,
        "created_at": "2024-01-15T10:30:00Z"
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  }
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/tickets/TICKET_ID?include_messages=true" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'POST',
    path: '/tickets',
    description: 'Cria um novo ticket',
    permissions: ['tickets:write'],
    body: {
      contact_id: 'string (obrigatório)',
      queue_id: 'string (opcional) - fila de atendimento',
      user_id: 'string (opcional) - atendente responsável',
      status: 'open ou pending (padrão: open)',
    },
    example: `{
  "contact_id": "uuid-do-contato",
  "queue_id": "uuid-da-fila",
  "status": "open"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "novo-uuid-ticket",
    "status": "open",
    "contact_id": "uuid-do-contato",
    "queue_id": "uuid-da-fila",
    "created_at": "2024-01-15T10:30:00Z"
  }
}`,
    curlExample: `curl -X POST "${API_BASE_URL}/tickets" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contact_id": "uuid-do-contato",
    "queue_id": "uuid-da-fila",
    "status": "open"
  }'`,
  },
  {
    method: 'PUT',
    path: '/tickets/:id',
    description: 'Atualiza um ticket (status, fila, atendente)',
    permissions: ['tickets:write'],
    body: {
      status: 'open, pending ou closed',
      queue_id: 'string - transferir para outra fila',
      user_id: 'string - atribuir/transferir atendente',
    },
    example: `{
  "status": "closed",
  "user_id": "uuid-do-atendente"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "id": "uuid-do-ticket",
    "status": "closed",
    "user_id": "uuid-do-atendente",
    "updated_at": "2024-01-20T14:00:00Z"
  }
}`,
    curlExample: `curl -X PUT "${API_BASE_URL}/tickets/TICKET_ID" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "status": "closed",
    "user_id": "uuid-do-atendente"
  }'`,
  },
];

const messageEndpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/messages/send',
    description: 'Envia uma mensagem de texto ou mídia',
    permissions: ['messages:write'],
    body: {
      number: 'string (obrigatório se não tiver ticket_id) - formato: 5511999999999',
      ticket_id: 'string (obrigatório se não tiver number)',
      message: 'string (obrigatório)',
      media_url: 'string (URL de imagem/vídeo/documento, opcional)',
      media_type: 'image, video, audio, document (obrigatório se media_url)',
      whatsapp_id: 'string (ID da conexão, opcional - usa padrão se não informado)',
    },
    example: `{
  "number": "5511999999999",
  "message": "Olá! Esta é uma mensagem automática.",
  "whatsapp_id": "uuid-da-conexao"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "message_id": "uuid-da-mensagem",
    "wid": "3EB0ABC123456789",
    "status": "sent",
    "ticket_id": "uuid-do-ticket"
  }
}`,
    curlExample: `curl -X POST "${API_BASE_URL}/messages/send" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "message": "Olá! Esta é uma mensagem automática.",
    "whatsapp_id": "uuid-da-conexao"
  }'`,
  },
  {
    method: 'POST',
    path: '/messages/send-media',
    description: 'Envia mídia (imagem, vídeo, documento)',
    permissions: ['messages:write'],
    body: {
      number: 'string (obrigatório)',
      media_url: 'string (obrigatório) - URL pública da mídia',
      media_type: 'image, video, audio, document (obrigatório)',
      caption: 'string (opcional) - legenda da mídia',
      filename: 'string (opcional) - nome do arquivo para documentos',
    },
    example: `{
  "number": "5511999999999",
  "media_url": "https://exemplo.com/imagem.jpg",
  "media_type": "image",
  "caption": "Confira esta imagem!"
}`,
    responseExample: `{
  "success": true,
  "data": {
    "message_id": "uuid-da-mensagem",
    "wid": "3EB0ABC123456789",
    "status": "sent",
    "media_type": "image"
  }
}`,
    curlExample: `curl -X POST "${API_BASE_URL}/messages/send-media" \\
  -H "x-api-key: SEU_TOKEN_AQUI" \\
  -H "Content-Type: application/json" \\
  -d '{
    "number": "5511999999999",
    "media_url": "https://exemplo.com/imagem.jpg",
    "media_type": "image",
    "caption": "Confira esta imagem!"
  }'`,
  },
  {
    method: 'GET',
    path: '/messages',
    description: 'Lista mensagens de um ticket',
    permissions: ['messages:read'],
    params: {
      ticket_id: 'string (obrigatório)',
      limit: 'Número máximo de resultados (padrão: 50, máx: 100)',
      offset: 'Pular N resultados (paginação)',
    },
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-da-mensagem",
      "body": "Olá, preciso de ajuda",
      "from_me": false,
      "ack": 3,
      "media_type": null,
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": "uuid-da-mensagem-2",
      "body": "Claro! Como posso ajudar?",
      "from_me": true,
      "ack": 2,
      "created_at": "2024-01-15T10:31:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0
  }
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/messages?ticket_id=TICKET_ID&limit=50" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
];

const otherEndpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/queues',
    description: 'Lista todas as filas de atendimento',
    permissions: ['queues:read'],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-da-fila",
      "name": "Suporte",
      "color": "#4CAF50",
      "is_active": true
    },
    {
      "id": "uuid-da-fila-2",
      "name": "Vendas",
      "color": "#2196F3",
      "is_active": true
    }
  ]
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/queues" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'GET',
    path: '/tags',
    description: 'Lista todas as tags disponíveis',
    permissions: ['tags:read'],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-da-tag",
      "name": "VIP",
      "color": "#FF9800"
    },
    {
      "id": "uuid-da-tag-2",
      "name": "Urgente",
      "color": "#F44336"
    }
  ]
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/tags" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'GET',
    path: '/whatsapps',
    description: 'Lista conexões WhatsApp ativas',
    permissions: ['whatsapps:read'],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-da-conexao",
      "name": "WhatsApp Principal",
      "number": "5511999999999",
      "status": "CONNECTED",
      "is_default": true
    }
  ]
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/whatsapps" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
  {
    method: 'GET',
    path: '/users',
    description: 'Lista usuários/atendentes',
    permissions: ['users:read'],
    responseExample: `{
  "success": true,
  "data": [
    {
      "id": "uuid-do-usuario",
      "name": "Maria Silva",
      "email": "maria@empresa.com",
      "profile": "admin",
      "online": true
    }
  ]
}`,
    curlExample: `curl -X GET "${API_BASE_URL}/users" \\
  -H "x-api-key: SEU_TOKEN_AQUI"`,
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  POST: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  PUT: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
};

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: label ? `${label} copiado para a área de transferência` : 'Copiado para a área de transferência',
    });
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

function EndpointCard({ endpoint }: { endpoint: EndpointDoc }) {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Texto copiado para a área de transferência',
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Badge variant="outline" className={methodColors[endpoint.method]}>
          {endpoint.method}
        </Badge>
        <code className="text-sm font-mono">{endpoint.path}</code>
      </div>
      
      <p className="text-sm text-muted-foreground">{endpoint.description}</p>
      
      <div className="flex gap-2 flex-wrap">
        {endpoint.permissions.map((perm) => (
          <Badge key={perm} variant="secondary" className="text-xs">
            {perm}
          </Badge>
        ))}
      </div>

      <Accordion type="single" collapsible className="w-full">
        {endpoint.params && (
          <AccordionItem value="params">
            <AccordionTrigger className="text-sm">Parâmetros de Query</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted rounded p-3 space-y-1">
                {Object.entries(endpoint.params).map(([key, desc]) => (
                  <div key={key} className="text-sm">
                    <code className="text-primary">{key}</code>
                    <span className="text-muted-foreground"> - {desc}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {endpoint.body && (
          <AccordionItem value="body">
            <AccordionTrigger className="text-sm">Corpo da Requisição</AccordionTrigger>
            <AccordionContent>
              <div className="bg-muted rounded p-3 space-y-1">
                {Object.entries(endpoint.body).map(([key, desc]) => (
                  <div key={key} className="text-sm">
                    <code className="text-primary">{key}</code>
                    <span className="text-muted-foreground"> - {desc}</span>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {endpoint.example && (
          <AccordionItem value="example">
            <AccordionTrigger className="text-sm">Payload de Exemplo</AccordionTrigger>
            <AccordionContent>
              <div className="relative">
                <pre className="bg-muted p-3 rounded text-sm overflow-x-auto pr-12">
                  {endpoint.example}
                </pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={endpoint.example} label="Payload" />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {endpoint.responseExample && (
          <AccordionItem value="response">
            <AccordionTrigger className="text-sm">Exemplo de Resposta</AccordionTrigger>
            <AccordionContent>
              <div className="relative">
                <pre className="bg-emerald-950 text-emerald-100 p-3 rounded text-sm overflow-x-auto pr-12">
                  {endpoint.responseExample}
                </pre>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => copyToClipboard(endpoint.responseExample!)}
                    className="bg-emerald-800 hover:bg-emerald-700"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {endpoint.curlExample && (
          <AccordionItem value="curl">
            <AccordionTrigger className="text-sm">cURL</AccordionTrigger>
            <AccordionContent>
              <div className="relative">
                <pre className="bg-zinc-900 text-zinc-100 p-3 rounded text-sm overflow-x-auto pr-12">
                  {endpoint.curlExample}
                </pre>
                <div className="absolute top-2 right-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => copyToClipboard(endpoint.curlExample!)}
                    className="bg-zinc-700 hover:bg-zinc-600"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );
}

export function ApiDocumentation() {
  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Quick Start Guide */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Início Rápido
            </CardTitle>
            <CardDescription>
              Comece a usar a API em 3 passos simples
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
                <div>
                  <h4 className="font-medium">Crie um Token</h4>
                  <p className="text-sm text-muted-foreground">Na aba "Tokens", clique em "Novo Token" e selecione as permissões necessárias</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
                <div>
                  <h4 className="font-medium">Copie a URL Base</h4>
                  <p className="text-sm text-muted-foreground">Use a URL base abaixo em todas as suas requisições</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
                <div>
                  <h4 className="font-medium">Faça sua primeira chamada</h4>
                  <p className="text-sm text-muted-foreground">Use os exemplos cURL desta documentação para testar</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Autenticação
            </CardTitle>
            <CardDescription>
              Como autenticar suas requisições à API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Todas as requisições devem incluir seu token de API no header <code className="bg-muted px-1 rounded">x-api-key</code> ou como Bearer token no header <code className="bg-muted px-1 rounded">Authorization</code>.
            </p>
            
            <div className="space-y-2">
              <p className="text-sm font-medium">URL Base:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                  {API_BASE_URL}
                </code>
                <CopyButton text={API_BASE_URL} label="URL Base" />
              </div>
            </div>

            <Tabs defaultValue="curl">
              <TabsList>
                <TabsTrigger value="curl">cURL</TabsTrigger>
                <TabsTrigger value="js">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
                <TabsTrigger value="php">PHP</TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto pr-12">
{`curl -X GET "${API_BASE_URL}/contacts" \\
  -H "x-api-key: seu_token_aqui"`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text={`curl -X GET "${API_BASE_URL}/contacts" \\\n  -H "x-api-key: seu_token_aqui"`}
                      label="cURL"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="js" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto pr-12">
{`const response = await fetch("${API_BASE_URL}/contacts", {
  headers: {
    "x-api-key": "seu_token_aqui"
  }
});
const data = await response.json();`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text={`const response = await fetch("${API_BASE_URL}/contacts", {\n  headers: {\n    "x-api-key": "seu_token_aqui"\n  }\n});\nconst data = await response.json();`}
                      label="JavaScript"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="python" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto pr-12">
{`import requests

response = requests.get(
    "${API_BASE_URL}/contacts",
    headers={"x-api-key": "seu_token_aqui"}
)
data = response.json()`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text={`import requests\n\nresponse = requests.get(\n    "${API_BASE_URL}/contacts",\n    headers={"x-api-key": "seu_token_aqui"}\n)\ndata = response.json()`}
                      label="Python"
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="php" className="mt-4">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded text-sm overflow-x-auto pr-12">
{`<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${API_BASE_URL}/contacts");
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "x-api-key: seu_token_aqui"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);`}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton 
                      text={`<?php\n$ch = curl_init();\ncurl_setopt($ch, CURLOPT_URL, "${API_BASE_URL}/contacts");\ncurl_setopt($ch, CURLOPT_HTTPHEADER, [\n    "x-api-key: seu_token_aqui"\n]);\ncurl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\n$data = json_decode($response, true);\ncurl_close($ch);`}
                      label="PHP"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Rate Limiting */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Rate Limiting
            </CardTitle>
            <CardDescription>
              Limites de requisições por período
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Padrão</Badge>
                </div>
                <p className="text-2xl font-bold">100</p>
                <p className="text-sm text-muted-foreground">requisições por minuto</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline">Envio de Mensagens</Badge>
                </div>
                <p className="text-2xl font-bold">30</p>
                <p className="text-sm text-muted-foreground">mensagens por minuto</p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-500">Headers de Rate Limit</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Todas as respostas incluem os headers <code className="bg-muted px-1 rounded">X-RateLimit-Limit</code>, 
                    <code className="bg-muted px-1 rounded mx-1">X-RateLimit-Remaining</code> e 
                    <code className="bg-muted px-1 rounded ml-1">X-RateLimit-Reset</code> para monitorar seu uso.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints by Category */}
        <Tabs defaultValue="contacts" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              Tickets
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="others" className="gap-2">
              <Code2 className="h-4 w-4" />
              Outros
            </TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="mt-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Endpoints de Contatos</h3>
            </div>
            {contactEndpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>

          <TabsContent value="tickets" className="mt-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Endpoints de Tickets</h3>
            </div>
            {ticketEndpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>

          <TabsContent value="messages" className="mt-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Endpoints de Mensagens</h3>
            </div>
            {messageEndpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>

          <TabsContent value="others" className="mt-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Code2 className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Outros Endpoints</h3>
            </div>
            {otherEndpoints.map((endpoint, index) => (
              <EndpointCard key={index} endpoint={endpoint} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Error Codes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Códigos de Erro
            </CardTitle>
            <CardDescription>
              Respostas de erro comuns da API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-red-500/10 text-red-500 shrink-0">401</Badge>
                <div>
                  <p className="font-medium">Unauthorized</p>
                  <p className="text-sm text-muted-foreground">Token inválido, expirado ou não fornecido</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Token inválido ou expirado"}`}</pre>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 shrink-0">403</Badge>
                <div>
                  <p className="font-medium">Forbidden</p>
                  <p className="text-sm text-muted-foreground">Token não possui permissão para esta operação</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Permissão insuficiente: contacts:write"}`}</pre>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-gray-500/10 text-gray-500 shrink-0">404</Badge>
                <div>
                  <p className="font-medium">Not Found</p>
                  <p className="text-sm text-muted-foreground">Recurso não encontrado</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Contato não encontrado"}`}</pre>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-orange-500/10 text-orange-500 shrink-0">400</Badge>
                <div>
                  <p className="font-medium">Bad Request</p>
                  <p className="text-sm text-muted-foreground">Dados inválidos ou faltando campos obrigatórios</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Campo 'number' é obrigatório"}`}</pre>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-500 shrink-0">429</Badge>
                <div>
                  <p className="font-medium">Too Many Requests</p>
                  <p className="text-sm text-muted-foreground">Limite de requisições excedido</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Rate limit exceeded. Retry after 60 seconds"}`}</pre>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-lg border">
                <Badge variant="outline" className="bg-red-500/10 text-red-500 shrink-0">500</Badge>
                <div>
                  <p className="font-medium">Internal Server Error</p>
                  <p className="text-sm text-muted-foreground">Erro interno do servidor</p>
                  <pre className="mt-2 bg-muted p-2 rounded text-xs">{`{"error": "Erro interno. Tente novamente mais tarde"}`}</pre>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Response Format */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Formato de Resposta
            </CardTitle>
            <CardDescription>
              Estrutura padrão das respostas da API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Resposta de Sucesso:</p>
              <pre className="bg-emerald-950 text-emerald-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "success": true,
  "data": { ... },           // Dados retornados
  "pagination": {            // Apenas em listagens
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}`}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Resposta de Erro:</p>
              <pre className="bg-red-950 text-red-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "success": false,
  "error": "Mensagem de erro descritiva",
  "code": "ERROR_CODE"       // Código de erro (opcional)
}`}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Best Practices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Boas Práticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm"><strong>Use paginação:</strong> Sempre use os parâmetros <code className="bg-muted px-1 rounded">limit</code> e <code className="bg-muted px-1 rounded">offset</code> para grandes volumes de dados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm"><strong>Trate erros:</strong> Sempre verifique o campo <code className="bg-muted px-1 rounded">success</code> antes de processar os dados</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm"><strong>Monitore rate limits:</strong> Verifique os headers de rate limit para evitar bloqueios</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm"><strong>Use tokens específicos:</strong> Crie tokens com permissões mínimas necessárias para cada integração</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span className="text-sm"><strong>Formato de número:</strong> Use sempre o formato internacional sem caracteres especiais (ex: 5511999999999)</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
