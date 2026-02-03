import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  CreditCard, 
  Receipt, 
  Crown, 
  Users, 
  MessageSquare, 
  Workflow,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { usePlans, useInvoices, useCompanyPlan } from '@/hooks/useFinancial';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FinancialPage() {
  const { plans, loading: plansLoading } = usePlans();
  const { invoices, loading: invoicesLoading } = useInvoices();
  const { companyPlan, loading: companyPlanLoading } = useCompanyPlan();

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500">Pago</Badge>;
      case 'expired':
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="secondary">Em aberto</Badge>;
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  const FeatureIcon = ({ enabled }: { enabled: boolean | null }) => (
    enabled ? (
      <Check className="h-4 w-4 text-green-500" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground" />
    )
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
          <p className="text-muted-foreground">
            Gerencie planos e pagamentos
          </p>
        </div>
      </div>

      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Crown className="h-4 w-4" />
            Planos
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="subscription" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        {/* Planos Tab */}
        <TabsContent value="plans" className="space-y-4">
          {companyPlanLoading || plansLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {companyPlan && (
                <Card className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Seu Plano Atual: {companyPlan.name}
                    </CardTitle>
                    <CardDescription>
                      {formatCurrency(companyPlan.price)}/mês
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{companyPlan.users} usuários</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{companyPlan.connections} conexões</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Workflow className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{companyPlan.queues} filas</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <Card 
                    key={plan.id} 
                    className={companyPlan?.id === plan.id ? 'border-primary' : ''}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        {companyPlan?.id === plan.id && (
                          <Badge>Atual</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-2xl font-bold text-foreground">
                        {formatCurrency(plan.price)}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usuários</span>
                          <span className="font-medium">{plan.users}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Conexões</span>
                          <span className="font-medium">{plan.connections}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Filas</span>
                          <span className="font-medium">{plan.queues}</span>
                        </div>
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Campanhas</span>
                          <FeatureIcon enabled={plan.use_campaigns} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Agendamentos</span>
                          <FeatureIcon enabled={plan.use_schedules} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Chat Interno</span>
                          <FeatureIcon enabled={plan.use_internal_chat} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>API Externa</span>
                          <FeatureIcon enabled={plan.use_external_api} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Kanban</span>
                          <FeatureIcon enabled={plan.use_kanban} />
                        </div>
                      </div>

                      {companyPlan?.id !== plan.id && (
                        <Button className="w-full" variant="outline">
                          Selecionar Plano
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Faturas Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Faturas</CardTitle>
              <CardDescription>
                Visualize todas as suas faturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma fatura encontrada
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.detail || 'Mensalidade'}</TableCell>
                          <TableCell>{formatCurrency(invoice.value)}</TableCell>
                          <TableCell>{formatDate(invoice.due_date)}</TableCell>
                          <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                          <TableCell>
                            {invoice.status !== 'paid' && (
                              <Button size="sm" variant="outline">
                                Pagar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assinatura Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Assinatura</CardTitle>
              <CardDescription>
                Gerencie sua assinatura atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {companyPlanLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : companyPlan ? (
                <>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Plano {companyPlan.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(companyPlan.price)}/mês
                      </p>
                    </div>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Recursos Inclusos</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Usuários</span>
                          <span>{companyPlan.users}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Conexões WhatsApp</span>
                          <span>{companyPlan.connections}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Filas de Atendimento</span>
                          <span>{companyPlan.queues}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Funcionalidades</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Campanhas</span>
                          <FeatureIcon enabled={companyPlan.use_campaigns} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Agendamentos</span>
                          <FeatureIcon enabled={companyPlan.use_schedules} />
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Chat Interno</span>
                          <FeatureIcon enabled={companyPlan.use_internal_chat} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline">Alterar Plano</Button>
                    <Button variant="outline" className="text-destructive">
                      Cancelar Assinatura
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Você ainda não possui um plano ativo
                  </p>
                  <Button>Escolher um Plano</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
