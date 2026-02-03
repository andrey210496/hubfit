import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Variable, User, Clock, FileText, Phone, Mail, Calendar, Hash, Building,
  CreditCard, Dumbbell, CalendarCheck, Receipt, UserCheck, Trophy
} from 'lucide-react';

export interface MessageVariable {
  name: string;
  value: string;
  description: string;
  icon: React.ReactNode;
  category: 'contact' | 'time' | 'ticket' | 'company' | 'member' | 'contract' | 'payment' | 'class';
}

export const MESSAGE_VARIABLES: MessageVariable[] = [
  // Variáveis de Contato
  {
    name: 'Nome do Contato',
    value: '{{name}}',
    description: 'Nome completo do contato',
    icon: <User className="h-3.5 w-3.5" />,
    category: 'contact',
  },
  {
    name: 'Primeiro Nome',
    value: '{{firstName}}',
    description: 'Primeiro nome do contato',
    icon: <User className="h-3.5 w-3.5" />,
    category: 'contact',
  },
  {
    name: 'Telefone',
    value: '{{phone}}',
    description: 'Número de telefone do contato',
    icon: <Phone className="h-3.5 w-3.5" />,
    category: 'contact',
  },
  {
    name: 'E-mail',
    value: '{{email}}',
    description: 'E-mail do contato (se disponível)',
    icon: <Mail className="h-3.5 w-3.5" />,
    category: 'contact',
  },
  // Variáveis de Tempo
  {
    name: 'Saudação',
    value: '{{greeting}}',
    description: 'Bom dia, Boa tarde ou Boa noite (automático)',
    icon: <Clock className="h-3.5 w-3.5" />,
    category: 'time',
  },
  {
    name: 'Hora Atual',
    value: '{{hour}}',
    description: 'Hora atual no formato HH:MM',
    icon: <Clock className="h-3.5 w-3.5" />,
    category: 'time',
  },
  {
    name: 'Data Atual',
    value: '{{date}}',
    description: 'Data atual no formato DD/MM/AAAA',
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: 'time',
  },
  {
    name: 'Dia da Semana',
    value: '{{weekday}}',
    description: 'Dia da semana (segunda-feira, terça-feira, etc)',
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: 'time',
  },
  // Variáveis de Ticket
  {
    name: 'Protocolo',
    value: '{{protocol}}',
    description: 'Número do protocolo do atendimento',
    icon: <FileText className="h-3.5 w-3.5" />,
    category: 'ticket',
  },
  {
    name: 'Número do Ticket',
    value: '{{ticketNumber}}',
    description: 'Número sequencial do ticket',
    icon: <Hash className="h-3.5 w-3.5" />,
    category: 'ticket',
  },
  // Variáveis da Empresa
  {
    name: 'Nome da Empresa',
    value: '{{companyName}}',
    description: 'Nome da sua empresa',
    icon: <Building className="h-3.5 w-3.5" />,
    category: 'company',
  },
  // ============ VARIÁVEIS DE GESTÃO FITNESS ============
  // Variáveis do Aluno/Membro
  {
    name: 'Status do Aluno',
    value: '{{memberStatus}}',
    description: 'Ativo, Inativo, Bloqueado, etc',
    icon: <UserCheck className="h-3.5 w-3.5" />,
    category: 'member',
  },
  {
    name: 'Data de Matrícula',
    value: '{{enrollmentDate}}',
    description: 'Data em que o aluno foi matriculado',
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
    category: 'member',
  },
  {
    name: 'Data de Vencimento',
    value: '{{expirationDate}}',
    description: 'Data de vencimento do plano/mensalidade',
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: 'member',
  },
  {
    name: 'Dias até Vencimento',
    value: '{{daysUntilExpiration}}',
    description: 'Quantidade de dias até o vencimento',
    icon: <Clock className="h-3.5 w-3.5" />,
    category: 'member',
  },
  // Variáveis do Contrato/Plano
  {
    name: 'Nome do Plano',
    value: '{{planName}}',
    description: 'Nome do plano contratado (Mensal, Trimestral, etc)',
    icon: <Trophy className="h-3.5 w-3.5" />,
    category: 'contract',
  },
  {
    name: 'Valor do Plano',
    value: '{{planPrice}}',
    description: 'Valor do plano em reais (ex: R$ 99,90)',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    category: 'contract',
  },
  {
    name: 'Início do Contrato',
    value: '{{contractStartDate}}',
    description: 'Data de início do contrato atual',
    icon: <CalendarCheck className="h-3.5 w-3.5" />,
    category: 'contract',
  },
  {
    name: 'Fim do Contrato',
    value: '{{contractEndDate}}',
    description: 'Data de término do contrato',
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: 'contract',
  },
  // Variáveis de Pagamento
  {
    name: 'Próximo Vencimento',
    value: '{{nextPaymentDate}}',
    description: 'Data do próximo pagamento',
    icon: <Calendar className="h-3.5 w-3.5" />,
    category: 'payment',
  },
  {
    name: 'Valor Próximo Pagamento',
    value: '{{nextPaymentAmount}}',
    description: 'Valor do próximo pagamento (ex: R$ 99,90)',
    icon: <Receipt className="h-3.5 w-3.5" />,
    category: 'payment',
  },
  {
    name: 'Valor em Atraso',
    value: '{{overdueAmount}}',
    description: 'Total de valores em atraso (se houver)',
    icon: <CreditCard className="h-3.5 w-3.5" />,
    category: 'payment',
  },
  {
    name: 'Dias em Atraso',
    value: '{{overdueDays}}',
    description: 'Quantidade de dias em atraso',
    icon: <Clock className="h-3.5 w-3.5" />,
    category: 'payment',
  },
  // Variáveis de Aulas
  {
    name: 'Próxima Aula',
    value: '{{nextClassName}}',
    description: 'Nome da próxima aula agendada',
    icon: <Dumbbell className="h-3.5 w-3.5" />,
    category: 'class',
  },
  {
    name: 'Horário Próxima Aula',
    value: '{{nextClassTime}}',
    description: 'Data e horário da próxima aula',
    icon: <Clock className="h-3.5 w-3.5" />,
    category: 'class',
  },
  {
    name: 'Nome do Instrutor',
    value: '{{instructorName}}',
    description: 'Nome do instrutor responsável',
    icon: <User className="h-3.5 w-3.5" />,
    category: 'class',
  },
  {
    name: 'Aulas no Mês',
    value: '{{monthlyClassCount}}',
    description: 'Quantidade de aulas realizadas no mês',
    icon: <Hash className="h-3.5 w-3.5" />,
    category: 'class',
  },
];

const CATEGORY_LABELS = {
  contact: 'Contato',
  time: 'Data/Hora',
  ticket: 'Atendimento',
  company: 'Empresa',
  member: 'Aluno',
  contract: 'Plano/Contrato',
  payment: 'Financeiro',
  class: 'Aulas',
};

const CATEGORY_COLORS = {
  contact: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
  time: 'bg-green-500/10 text-green-500 hover:bg-green-500/20',
  ticket: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20',
  company: 'bg-purple-500/10 text-purple-500 hover:bg-purple-500/20',
  member: 'bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20',
  contract: 'bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20',
  payment: 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
  class: 'bg-pink-500/10 text-pink-500 hover:bg-pink-500/20',
};

interface MessageVariablesPickerProps {
  onSelectVariable: (variable: string) => void;
}

export function MessageVariablesPicker({ onSelectVariable }: MessageVariablesPickerProps) {
  const [open, setOpen] = useState(false);

  const groupedVariables = MESSAGE_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, MessageVariable[]>);

  const handleSelect = (value: string) => {
    onSelectVariable(value);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Variable className="h-4 w-4" />
          Inserir Variável
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Variáveis do Sistema</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Clique em uma variável para inserir na mensagem. Ela será substituída automaticamente ao enviar.
          </p>
        </div>
        <div className="max-h-[300px] overflow-y-auto">
          {Object.entries(groupedVariables).map(([category, variables]) => (
            <div key={category} className="p-2">
              <div className="flex items-center gap-2 mb-2 px-2">
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}`}
                >
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </Badge>
              </div>
              <div className="space-y-1">
                {variables.map((variable) => (
                  <button
                    key={variable.value}
                    type="button"
                    className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted transition-colors text-left"
                    onClick={() => handleSelect(variable.value)}
                  >
                    <div className="mt-0.5 text-muted-foreground">
                      {variable.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{variable.name}</span>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {variable.value}
                        </code>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {variable.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t bg-muted/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Dica:</strong> Use <code className="bg-muted px-1 rounded">{'{{greeting}}'}</code> + <code className="bg-muted px-1 rounded">{'{{firstName}}'}</code> para uma saudação personalizada.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
