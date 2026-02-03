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
  Users, 
  CreditCard, 
  Calendar, 
  Crown, 
  ScanLine, 
  DollarSign,
  Settings,
  BookOpen,
  Lightbulb,
  ChevronRight,
  Rocket
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
    id: "clientes",
    title: "Clientes",
    icon: Users,
    description: "Gestão de alunos e cadastros",
    articles: [
      {
        id: "cadastro-cliente",
        title: "Como cadastrar um novo cliente?",
        content: `Para cadastrar um novo cliente:

1. Acesse **Clientes** no menu lateral
2. Clique no botão **"+ Novo Cliente"**
3. Preencha os dados obrigatórios:
   - Nome completo
   - Telefone (com DDD)
   - Email
   - CPF
4. Selecione um **Plano** para o cliente
5. Configure a **data de vencimento** do pagamento
6. Clique em **"Salvar"**

O cliente será cadastrado automaticamente com status "Ativo" e terá acesso ao Portal do Aluno.`,
        tags: ["cadastro", "novo cliente", "aluno"]
      },
      {
        id: "perfil-cliente",
        title: "Como acessar o perfil completo do cliente?",
        content: `O perfil do cliente contém todas as informações em abas organizadas:

- **Informações**: Dados cadastrais e de contato
- **Plano e Contrato**: Detalhes do plano ativo e histórico
- **Financeiro**: Pagamentos, cobranças e vendas
- **Agenda**: Reservas de aulas e frequência
- **Comunicação**: Histórico de conversas via WhatsApp

Para acessar, clique no nome do cliente na lista ou use o botão de edição.`,
        tags: ["perfil", "informações", "dados"]
      },
      {
        id: "status-cliente",
        title: "O que significam os status dos clientes?",
        content: `Os clientes podem ter os seguintes status:

- **Ativo**: Plano em dia, acesso liberado
- **Pendente**: Aguardando pagamento ou confirmação
- **Inativo**: Plano cancelado ou expirado
- **Bloqueado**: Acesso suspenso por inadimplência

O sistema atualiza automaticamente o status baseado na data de expiração do plano e pagamentos.`,
        tags: ["status", "ativo", "inativo", "bloqueado"]
      }
    ]
  },
  {
    id: "planos",
    title: "Planos",
    icon: Crown,
    description: "Configuração de planos e preços",
    articles: [
      {
        id: "criar-plano",
        title: "Como criar um novo plano?",
        content: `Para criar um plano:

1. Acesse **Planos** no menu
2. Clique em **"+ Novo Plano"**
3. Configure:
   - **Nome** do plano (ex: "Mensal", "Trimestral")
   - **Período** (mensal, trimestral, semestral, anual)
   - **Preço**
   - **Benefícios** inclusos
   - **Limite de aulas** por semana (opcional)
4. Ative o plano e salve

Os planos aparecem automaticamente nas opções de contrato dos clientes.`,
        tags: ["plano", "criar", "preço"]
      },
      {
        id: "editar-plano",
        title: "Posso editar um plano com clientes ativos?",
        content: `Sim, você pode editar planos a qualquer momento. Porém:

- Alterações de **preço** afetam apenas **novos contratos**
- Clientes existentes mantêm o valor contratado
- Alterações de **benefícios** podem ser aplicadas a todos

Para manter histórico, considere criar um novo plano em vez de editar o existente.`,
        tags: ["editar", "alterar", "plano"]
      }
    ]
  },
  {
    id: "financeiro",
    title: "Financeiro",
    icon: DollarSign,
    description: "Pagamentos e cobranças",
    articles: [
      {
        id: "registrar-pagamento",
        title: "Como registrar um pagamento manual?",
        content: `No perfil do cliente, aba **Financeiro**:

1. Localize a cobrança pendente
2. Clique no botão **"Manual"**
3. Selecione o **método de pagamento** (Dinheiro, PIX, Cartão...)
4. Confirme o pagamento

O status será atualizado automaticamente para "Pago".`,
        tags: ["pagamento", "manual", "baixa"]
      },
      {
        id: "cobranca-online",
        title: "Como enviar uma cobrança online?",
        content: `Para cobrar via PIX, Boleto ou Cartão:

1. Acesse o perfil do cliente → Financeiro
2. Na cobrança pendente, clique em **"Online"**
3. Preencha os dados:
   - CPF/CNPJ do cliente
   - Email para envio
4. Selecione o método (PIX, Boleto, Cartão)
5. Clique em **"Gerar Cobrança"**

O cliente receberá os dados de pagamento e o sistema atualizará automaticamente quando confirmado.

**Importante**: A conta de recebimento deve estar configurada em Métodos de Pagamento.`,
        tags: ["cobrança", "online", "pix", "boleto"]
      },
      {
        id: "configurar-recebimento",
        title: "Como configurar a conta de recebimento?",
        content: `Para receber pagamentos online:

1. Acesse **Configurações → Métodos de Pagamento**
2. Na seção "Conta de Recebimento", preencha:
   - Nome/Razão Social
   - CPF/CNPJ
   - Email
   - Endereço completo
3. Clique em **"Criar Conta de Recebimento"**

A subconta será criada automaticamente e você poderá receber pagamentos com split automático de taxas.`,
        tags: ["conta", "recebimento", "asaas", "configurar"]
      }
    ]
  },
  {
    id: "agenda",
    title: "Agenda e Aulas",
    icon: Calendar,
    description: "Grade de horários e reservas",
    articles: [
      {
        id: "criar-horario",
        title: "Como criar a grade de horários?",
        content: `Para configurar horários de aulas:

1. Acesse **Tipos de Aula** e crie as modalidades (Musculação, Spinning, etc.)
2. Vá em **Grade de Horários**
3. Clique em **"+ Novo Horário"**
4. Configure:
   - Tipo de aula
   - Dia da semana
   - Horário início/fim
   - Instrutor responsável
   - Capacidade máxima
5. Salve

O sistema gerará automaticamente as sessões para as próximas 8 semanas.`,
        tags: ["horário", "grade", "aula", "criar"]
      },
      {
        id: "reserva-aula",
        title: "Como funciona a reserva de aulas?",
        content: `Clientes podem reservar aulas de duas formas:

**Pelo Portal do Aluno:**
- O próprio cliente faz a reserva pelo app/site

**Pelo Sistema (recepção):**
1. Acesse **Agenda**
2. Clique na sessão desejada
3. Selecione o cliente
4. Confirme a reserva

O sistema controla automaticamente a capacidade e evita overbooking.`,
        tags: ["reserva", "aula", "agendar"]
      }
    ]
  },
  {
    id: "acesso",
    title: "Controle de Acesso",
    icon: ScanLine,
    description: "Catraca e check-in",
    articles: [
      {
        id: "checkin-manual",
        title: "Como fazer check-in manual?",
        content: `Na tela de **Controle de Acesso**:

1. Digite o nome ou número do cliente
2. Selecione na lista de sugestões
3. Clique em **"Check-in"**

O sistema validará automaticamente:
- Status do cliente (ativo)
- Plano válido (não expirado)
- Pagamentos em dia

Se houver pendências, aparecerá um alerta.`,
        tags: ["checkin", "acesso", "entrada"]
      },
      {
        id: "qrcode-aluno",
        title: "Como funciona o QR Code do aluno?",
        content: `Cada cliente possui um QR Code único para acesso rápido:

1. O QR Code está disponível no **Portal do Aluno**
2. O cliente apresenta na catraca ou recepção
3. O sistema lê e faz o check-in automaticamente

Para gerar/visualizar o QR Code: Perfil do Cliente → aba Informações.`,
        tags: ["qrcode", "catraca", "acesso"]
      }
    ]
  },
  {
    id: "configuracoes",
    title: "Configurações",
    icon: Settings,
    description: "Personalização do sistema",
    articles: [
      {
        id: "metodos-pagamento",
        title: "Como configurar métodos de pagamento?",
        content: `Em **Métodos de Pagamento** você configura:

**Pagamentos Manuais:**
- Dinheiro, PIX Manual, Cartão (maquininha)
- Configure taxas por método
- Defina parcelamento e taxas por parcela

**Conta de Recebimento (Online):**
- Configure para receber PIX, Boleto e Cartão online
- O split de taxas é automático

Cada método pode ter taxas diferentes para cálculo preciso de receita líquida.`,
        tags: ["pagamento", "método", "taxa", "configurar"]
      },
      {
        id: "tipos-aula",
        title: "Como criar tipos de aula?",
        content: `Em **Tipos de Aula**:

1. Clique em **"+ Novo Tipo"**
2. Configure:
   - Nome (ex: "Spinning", "Yoga")
   - Descrição
   - Duração padrão
   - Capacidade máxima
   - Cor para identificação
3. Salve

Os tipos de aula aparecem automaticamente ao criar horários na grade.`,
        tags: ["aula", "tipo", "modalidade"]
      }
    ]
  }
];

const quickStartSteps = [
  {
    step: 1,
    title: "Configure sua conta de recebimento",
    description: "Cadastre seus dados para receber pagamentos online",
    path: "/gestao/fitness/metodos-pagamento"
  },
  {
    step: 2,
    title: "Crie seus planos",
    description: "Configure os planos que serão oferecidos aos clientes",
    path: "/gestao/fitness/planos"
  },
  {
    step: 3,
    title: "Cadastre tipos de aula",
    description: "Defina as modalidades oferecidas na sua academia",
    path: "/gestao/fitness/tipos-aula"
  },
  {
    step: 4,
    title: "Monte a grade de horários",
    description: "Configure os horários das aulas semanais",
    path: "/gestao/fitness/horarios"
  },
  {
    step: 5,
    title: "Cadastre seus clientes",
    description: "Adicione os alunos com seus respectivos planos",
    path: "/gestao/fitness/clientes"
  }
];

const faqs = [
  {
    question: "Como o cliente acessa o Portal do Aluno?",
    answer: "O cliente acessa o portal usando o email cadastrado. Ele receberá um link de acesso por email ou pode acessar diretamente pela URL do portal e fazer login com email/senha."
  },
  {
    question: "O sistema envia cobranças automáticas?",
    answer: "O sistema gera as cobranças automaticamente baseado no plano do cliente. Para envio automático de notificações, é necessário configurar o WhatsApp na seção de Atendimento."
  },
  {
    question: "Posso usar o sistema sem a conta de recebimento online?",
    answer: "Sim! Você pode registrar todos os pagamentos manualmente. A conta de recebimento online é opcional e serve para oferecer PIX, Boleto e Cartão aos clientes."
  },
  {
    question: "Como cancelo o plano de um cliente?",
    answer: "No perfil do cliente, aba 'Plano e Contrato', clique em 'Cancelar Contrato'. Você pode informar o motivo do cancelamento para análise posterior."
  },
  {
    question: "O sistema controla inadimplência automaticamente?",
    answer: "Sim. Quando a data de vencimento passa e não há pagamento registrado, o cliente é marcado automaticamente. Você pode configurar bloqueio de acesso por inadimplência."
  },
  {
    question: "Como exporto relatórios?",
    answer: "Na maioria das telas de listagem há um botão de exportação. Você pode exportar clientes, pagamentos e relatórios em formato Excel."
  }
];

export function GestaoHelpPage() {
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

  const totalArticles = helpCategories.reduce((acc, cat) => acc + cat.articles.length, 0);

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Central de Ajuda</h1>
          <p className="text-muted-foreground">Guias, tutoriais e respostas para suas dúvidas</p>
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
          {/* Category Cards */}
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

          {/* Selected Category Articles */}
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
                Siga estes passos para começar a usar o sistema
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
                  <p className="font-medium text-sm">Configure primeiro, cadastre depois</p>
                  <p className="text-xs text-muted-foreground">
                    Configure planos, tipos de aula e horários antes de cadastrar clientes para agilizar o processo.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Conta de recebimento é opcional</p>
                  <p className="text-xs text-muted-foreground">
                    Você pode usar apenas pagamentos manuais se preferir. A conta online é para quem quer oferecer PIX e boleto.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Integre o WhatsApp</p>
                  <p className="text-xs text-muted-foreground">
                    Para enviar lembretes automáticos de pagamento e aulas, configure o WhatsApp na seção Atendimento.
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
