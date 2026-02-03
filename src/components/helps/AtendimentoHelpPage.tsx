import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  HelpCircle, 
  MessageCircle,
  Users,
  Calendar,
  Zap,
  Webhook,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Rocket,
  Bot,
  LayoutGrid
} from "lucide-react";

interface HelpCategory {
  id: string;
  title: string;
  icon: any;
  description: string;
  articles: HelpArticle[];
}

interface HelpArticle {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

const helpCategories: HelpCategory[] = [
  {
    id: "whatsapp",
    title: "Conexão WhatsApp",
    icon: MessageCircle,
    description: "Conectar e gerenciar WhatsApp",
    articles: [
      {
        id: "conectar-whatsapp",
        title: "Como conectar o WhatsApp?",
        content: `Para conectar seu WhatsApp:

1. Acesse **Conexão** no menu lateral
2. Clique em **"Nova Conexão"**
3. Dê um nome para a conexão (ex: "Recepção")
4. Escaneie o **QR Code** com o WhatsApp do celular:
   - Abra o WhatsApp no celular
   - Vá em Configurações → Dispositivos Conectados
   - Clique em "Conectar Dispositivo"
   - Escaneie o QR Code

A conexão será estabelecida e você poderá receber mensagens pelo sistema.

**Dica**: Use um número de WhatsApp exclusivo para o atendimento.`,
        tags: ["whatsapp", "qrcode", "conectar"]
      },
      {
        id: "conexao-caiu",
        title: "A conexão do WhatsApp caiu, o que fazer?",
        content: `Se a conexão cair:

1. Verifique se o celular está conectado à internet
2. Acesse **Conexão** no sistema
3. Clique no botão de **Reconectar**
4. Se necessário, escaneie o QR Code novamente

**Causas comuns de desconexão:**
- Celular ficou sem internet
- WhatsApp foi deslogado do celular
- Muitos dispositivos conectados (limite de 4)
- Celular desligado por muito tempo`,
        tags: ["desconectou", "offline", "reconectar"]
      },
      {
        id: "multiplas-conexoes",
        title: "Posso ter múltiplas conexões?",
        content: `Sim! Você pode ter várias conexões de WhatsApp, útil para:

- Separar atendimento por setor (Vendas, Suporte)
- Ter números diferentes para cada filial
- Backup de atendimento

Cada conexão pode ter suas próprias filas e atendentes configurados.

**Importante**: Verifique seu plano para saber quantas conexões estão disponíveis.`,
        tags: ["múltiplas", "conexões", "números"]
      }
    ]
  },
  {
    id: "tickets",
    title: "Atendimentos",
    icon: MessageCircle,
    description: "Gerenciamento de conversas",
    articles: [
      {
        id: "atender-ticket",
        title: "Como iniciar um atendimento?",
        content: `Quando uma mensagem chega:

1. Ela aparece na fila **"Aguardando"**
2. Clique no ticket para visualizar
3. Clique em **"Aceitar"** para iniciar o atendimento
4. O ticket passa para a fila **"Atendendo"**

Você pode enviar mensagens de texto, áudio, imagens e documentos.

**Atalhos úteis:**
- Digite "/" para acessar mensagens rápidas
- Arraste arquivos para enviar
- Use Ctrl+Enter para enviar`,
        tags: ["atender", "ticket", "aceitar"]
      },
      {
        id: "transferir-ticket",
        title: "Como transferir um atendimento?",
        content: `Para transferir um ticket:

1. Abra o ticket em atendimento
2. Clique no menu de opções (três pontos)
3. Selecione **"Transferir"**
4. Escolha:
   - **Para outro atendente**: selecione o usuário
   - **Para outra fila**: selecione a fila

O atendimento será transferido e aparecerá para o novo responsável.

**Dica**: Adicione uma nota interna antes de transferir para contextualizar.`,
        tags: ["transferir", "passar", "atendimento"]
      },
      {
        id: "finalizar-ticket",
        title: "Como finalizar um atendimento?",
        content: `Para encerrar um atendimento:

1. Clique em **"Resolver"** no ticket
2. Opcionalmente, adicione uma observação
3. Confirme o encerramento

O ticket irá para o histórico e poderá ser consultado posteriormente.

**Importante**: Tickets finalizados podem ser reabertos se o cliente enviar nova mensagem.`,
        tags: ["finalizar", "resolver", "encerrar"]
      }
    ]
  },
  {
    id: "contatos",
    title: "Contatos",
    icon: Users,
    description: "Gestão de contatos e CRM",
    articles: [
      {
        id: "criar-contato",
        title: "Como criar um contato manualmente?",
        content: `Para cadastrar um contato:

1. Acesse **Contatos** no menu
2. Clique em **"+ Novo Contato"**
3. Preencha:
   - Nome
   - Número do WhatsApp (com DDD e código do país)
   - Email (opcional)
   - Tags para categorização
4. Salve

Você também pode iniciar uma conversa diretamente pelo contato cadastrado.`,
        tags: ["contato", "cadastrar", "criar"]
      },
      {
        id: "tags-contatos",
        title: "Como usar tags nos contatos?",
        content: `Tags ajudam a organizar e filtrar contatos:

**Criar tags:**
1. Acesse **Tags** no menu
2. Clique em **"+ Nova Tag"**
3. Defina nome e cor

**Aplicar tags:**
1. Abra o contato ou ticket
2. Clique em **"Adicionar Tag"**
3. Selecione as tags desejadas

**Filtrar por tags:**
- Na lista de contatos, use o filtro de tags
- Nas campanhas, segmente por tags`,
        tags: ["tags", "etiquetas", "organizar"]
      },
      {
        id: "importar-contatos",
        title: "Como importar contatos em massa?",
        content: `Para importar contatos via planilha:

1. Acesse **Contatos**
2. Clique em **"Importar"**
3. Baixe o modelo de planilha
4. Preencha com seus contatos
5. Faça upload do arquivo
6. Mapeie as colunas
7. Confirme a importação

**Formato do número:**
- Use formato internacional: 5511999999999
- Inclua código do país (55 para Brasil)`,
        tags: ["importar", "planilha", "excel"]
      }
    ]
  },
  {
    id: "filas",
    title: "Filas",
    icon: LayoutGrid,
    description: "Organização de atendimentos",
    articles: [
      {
        id: "criar-fila",
        title: "Como criar uma fila de atendimento?",
        content: `Filas organizam os atendimentos por setor:

1. Acesse **Filas** no menu
2. Clique em **"+ Nova Fila"**
3. Configure:
   - Nome (ex: "Vendas", "Suporte")
   - Cor de identificação
   - Mensagem de saudação
   - Atendentes responsáveis
4. Salve

Quando o cliente escolher essa opção no menu, será direcionado para a fila.`,
        tags: ["fila", "setor", "departamento"]
      },
      {
        id: "menu-opcoes",
        title: "Como criar um menu de opções para o cliente?",
        content: `O menu de opções direciona o cliente:

1. Acesse a **Conexão** do WhatsApp
2. Configure a **Mensagem de Boas-vindas**
3. Liste as opções numeradas:
   "1 - Vendas
   2 - Suporte
   3 - Financeiro"
4. Associe cada número a uma fila

Quando o cliente digitar "1", será direcionado automaticamente para Vendas.`,
        tags: ["menu", "opções", "chatbot"]
      }
    ]
  },
  {
    id: "campanhas",
    title: "Campanhas",
    icon: Zap,
    description: "Envio em massa",
    articles: [
      {
        id: "criar-campanha",
        title: "Como criar uma campanha de mensagens?",
        content: `Para enviar mensagens em massa:

1. Acesse **Campanhas** no menu
2. Clique em **"+ Nova Campanha"**
3. Configure:
   - Nome da campanha
   - Conexão WhatsApp
   - Lista de contatos ou tags
   - Mensagem (até 5 variações)
   - Mídia (opcional)
4. Agende ou envie imediatamente

**Boas práticas:**
- Use variações de mensagem para evitar bloqueios
- Limite a 500 mensagens por dia
- Envie apenas para quem autorizou`,
        tags: ["campanha", "massa", "broadcast"]
      },
      {
        id: "templates-campanha",
        title: "O que são templates de mensagem?",
        content: `Templates são mensagens pré-aprovadas pelo WhatsApp para:

- Enviar após 24h sem resposta do cliente
- Iniciar conversas (primeira mensagem)
- Campanhas de marketing

**Criar template:**
1. Acesse **Templates**
2. Clique em **"+ Novo Template"**
3. Configure categoria, idioma e conteúdo
4. Envie para aprovação da Meta

A aprovação pode levar de minutos a dias.`,
        tags: ["template", "HSM", "aprovação"]
      }
    ]
  },
  {
    id: "automacoes",
    title: "Automações",
    icon: Bot,
    description: "Fluxos automáticos",
    articles: [
      {
        id: "mensagem-ausencia",
        title: "Como configurar mensagem de ausência?",
        content: `Para responder automaticamente fora do horário:

1. Acesse **Configurações** → **Empresa**
2. Configure os **Horários de Atendimento**
3. Ative a **Mensagem de Ausência**
4. Escreva a mensagem automática

A mensagem será enviada quando o cliente escrever fora do horário configurado.`,
        tags: ["ausência", "automático", "fora horário"]
      },
      {
        id: "agendamentos",
        title: "Como agendar envio de mensagens?",
        content: `Para agendar mensagens:

1. Acesse **Agendamentos**
2. Clique em **"+ Novo Agendamento"**
3. Configure:
   - Contato destinatário
   - Data e hora do envio
   - Mensagem
4. Salve

O sistema enviará automaticamente no horário programado.

**Uso comum:** Lembretes, follow-ups, felicitações.`,
        tags: ["agendar", "programar", "lembrete"]
      }
    ]
  },
  {
    id: "api",
    title: "Integrações",
    icon: Webhook,
    description: "API e webhooks",
    articles: [
      {
        id: "usar-api",
        title: "Como integrar com outros sistemas?",
        content: `O sistema oferece uma API completa:

1. Acesse **Configurações** → **API Externa**
2. Gere um **Token de acesso**
3. Use a documentação para integrar

**Endpoints disponíveis:**
- Enviar mensagens
- Criar contatos
- Consultar tickets
- Receber webhooks

Consulte a documentação completa na aba "Endpoints".`,
        tags: ["api", "integração", "webhook"]
      },
      {
        id: "webhooks",
        title: "O que são webhooks?",
        content: `Webhooks notificam seu sistema sobre eventos:

- Nova mensagem recebida
- Ticket criado/finalizado
- Contato atualizado

**Configurar:**
1. Acesse **Endpoints** → **Webhooks**
2. Copie a URL do sistema
3. Configure no sistema externo

Você receberá uma chamada HTTP sempre que o evento ocorrer.`,
        tags: ["webhook", "notificação", "evento"]
      }
    ]
  }
];

const quickStartSteps = [
  {
    step: 1,
    title: "Conecte seu WhatsApp",
    description: "Escaneie o QR Code para iniciar",
    path: "/integrations/whatsapp"
  },
  {
    step: 2,
    title: "Crie as filas de atendimento",
    description: "Organize por setores (Vendas, Suporte...)",
    path: "/queues"
  },
  {
    step: 3,
    title: "Adicione usuários",
    description: "Cadastre a equipe de atendimento",
    path: "/users"
  },
  {
    step: 4,
    title: "Configure mensagens rápidas",
    description: "Crie respostas prontas para agilizar",
    path: "/quick-messages"
  },
  {
    step: 5,
    title: "Comece a atender!",
    description: "Acesse os tickets e inicie os atendimentos",
    path: "/tickets"
  }
];

const faqs = [
  {
    question: "Quantos atendentes podem usar o sistema?",
    answer: "O número de atendentes depende do seu plano. Cada atendente precisa de um usuário cadastrado e pode ser associado a uma ou mais filas de atendimento."
  },
  {
    question: "O sistema funciona no celular?",
    answer: "Sim! O sistema é responsivo e funciona em qualquer navegador. Porém, para a conexão do WhatsApp, você precisa de um celular com o WhatsApp ativo."
  },
  {
    question: "Posso enviar mensagens para quem nunca me mandou mensagem?",
    answer: "Sim, usando Templates aprovados pela Meta. Mensagens normais só podem ser enviadas dentro da janela de 24h após a última mensagem do cliente."
  },
  {
    question: "Como evitar bloqueios do WhatsApp?",
    answer: "Use variações de mensagem em campanhas, respeite os limites de envio, não faça spam, e sempre tenha autorização do contato para receber mensagens."
  },
  {
    question: "Perco as conversas se desconectar o WhatsApp?",
    answer: "Não! Todo o histórico fica salvo no sistema. Ao reconectar, você continua de onde parou. As mensagens recebidas durante a desconexão também serão sincronizadas."
  },
  {
    question: "Posso usar o WhatsApp no celular enquanto conectado ao sistema?",
    answer: "Sim! O WhatsApp Multi-dispositivos permite usar no celular e no sistema simultaneamente. Porém, evite responder a mesma conversa nos dois lugares."
  }
];

export function AtendimentoHelpPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(category => 
    searchTerm === "" || category.articles.length > 0
  );

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
          <p className="text-muted-foreground">Guias e tutoriais para o sistema de atendimento</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar artigos, tutoriais..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs defaultValue="guias" className="space-y-6">
        <TabsList>
          <TabsTrigger value="guias" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Guias
          </TabsTrigger>
          <TabsTrigger value="inicio" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            Primeiros Passos
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Perguntas Frequentes
          </TabsTrigger>
        </TabsList>

        {/* Guias Tab */}
        <TabsContent value="guias" className="space-y-6">
          {!selectedCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((category) => (
                <Card 
                  key={category.id} 
                  className="cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{category.title}</CardTitle>
                        <CardDescription className="text-xs">
                          {category.articles.length} artigos
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {selectedCategory && (
            <div className="space-y-4">
              <Button 
                variant="ghost" 
                onClick={() => setSelectedCategory(null)}
                className="mb-4"
              >
                ← Voltar para categorias
              </Button>

              {filteredCategories
                .filter(cat => cat.id === selectedCategory)
                .map(category => (
                  <div key={category.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <category.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold">{category.title}</h2>
                        <p className="text-muted-foreground">{category.description}</p>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="space-y-2">
                      {category.articles.map((article) => (
                        <AccordionItem 
                          key={article.id} 
                          value={article.id}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline">
                            <span className="text-left">{article.title}</span>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <div className="whitespace-pre-line text-muted-foreground">
                                {article.content}
                              </div>
                              {article.tags && (
                                <div className="flex flex-wrap gap-1 mt-4">
                                  {article.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Primeiros Passos Tab */}
        <TabsContent value="inicio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                Configuração Inicial
              </CardTitle>
              <CardDescription>
                Siga estes passos para começar a atender
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickStartSteps.map((item) => (
                  <div 
                    key={item.step}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{item.title}</h4>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={item.path}>
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dicas Importantes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Use um número exclusivo</p>
                  <p className="text-xs text-muted-foreground">
                    Recomendamos usar um chip exclusivo para o atendimento, evitando misturar mensagens pessoais.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Mantenha o celular ligado</p>
                  <p className="text-xs text-muted-foreground">
                    O celular com o WhatsApp precisa estar conectado à internet para manter a conexão ativa.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Crie mensagens rápidas</p>
                  <p className="text-xs text-muted-foreground">
                    Configure respostas prontas para perguntas frequentes e agilize o atendimento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas Frequentes</CardTitle>
              <CardDescription>
                Respostas rápidas para as dúvidas mais comuns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
