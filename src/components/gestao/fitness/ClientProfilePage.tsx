import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Edit,
  MessageCircle,
  MoreHorizontal,
  CheckCircle,
  Star,
  DollarSign,
  FileText,
  FolderOpen,
  Award,
  HelpCircle,
  Camera,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getStatusLabel, getStatusColor } from '@/hooks/useMembers';
import { getPeriodLabel } from '@/hooks/useFitnessPlans';
import { SalesTab } from './profile/SalesTab';
import { ContractsTab } from './profile/ContractsTab';
import { FinanceTab } from './profile/FinanceTab';
import { CommunicationTab } from './profile/CommunicationTab';
import { ParQTab } from './profile/ParQTab';

interface MemberData {
  id: string;
  contact_id: string;
  status: string;
  enrollment_date: string;
  expiration_date: string | null;
  fitness_plan_id: string | null;
  birth_date: string | null;
  has_guardian: boolean;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_relationship: string | null;
  instructor_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  contact: {
    name: string;
    number: string;
    email: string | null;
    cpf: string | null;
    rg: string | null;
    gender: string | null;
    objective: string | null;
    profile_pic_url: string | null;
    notes: string | null;
    whatsapp_notifications: boolean | null;
    address_street: string | null;
    address_number: string | null;
    address_complement: string | null;
    address_neighborhood: string | null;
    address_city: string | null;
    address_state: string | null;
    address_zipcode: string | null;
  };
  fitness_plan: {
    id: string;
    name: string;
    price: number;
    period: string;
  } | null;
  instructor: {
    id: string;
    name: string;
  } | null;
}

export function ClientProfilePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('id');
  
  const [member, setMember] = useState<MemberData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('resumo');

  useEffect(() => {
    if (memberId) {
      fetchMember(memberId);
    }
  }, [memberId]);

  const fetchMember = async (id: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select(`
          *,
          contact:contacts(*),
          fitness_plan:fitness_plans(id, name, price, period),
          instructor:profiles!members_instructor_id_fkey(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setMember(data as unknown as MemberData);
    } catch (error: any) {
      console.error('Error fetching member:', error);
      toast.error('Erro ao carregar dados do cliente');
      navigate('/gestao/fitness/clientes');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null;
    return differenceInYears(new Date(), parseISO(birthDate));
  };

  const getGenderLabel = (gender: string | null) => {
    if (gender === 'M') return 'Masculino';
    if (gender === 'F') return 'Feminino';
    if (gender === 'O') return 'Outro';
    return '';
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cliente não encontrado</p>
      </div>
    );
  }

  const age = calculateAge(member.birth_date);
  const genderLabel = getGenderLabel(member.contact?.gender);
  const ageGenderText = [age ? `${age} anos` : null, genderLabel].filter(Boolean).join(', ');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate('/gestao/fitness/clientes')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Perfil do Cliente</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar Section */}
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={member.contact?.profile_pic_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(member.contact?.name || '')}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors">
                <Camera className="h-4 w-4" />
              </button>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-bold">{member.contact?.name}</h2>
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                <Badge 
                  variant="outline" 
                  className={getStatusColor(member.status as any)}
                >
                  {getStatusLabel(member.status as any)}
                </Badge>
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
                  <Star className="h-3 w-3 mr-1 fill-current" />
                  VIP
                </Badge>
              </div>
              
              {ageGenderText && (
                <p className="text-muted-foreground">{ageGenderText}</p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="default" 
                  size="sm"
                  className="gap-2"
                  onClick={() => navigate(`/gestao/fitness/clientes?edit=${member.id}`)}
                >
                  <Edit className="h-4 w-4" />
                  CADASTRO
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    const phone = member.contact?.number?.replace(/\\D/g, '');
                    if (phone) {
                      window.open(`https://wa.me/55${phone}`, '_blank');
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  WHATSAPP
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <MoreHorizontal className="h-4 w-4" />
                  MAIS AÇÕES
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b rounded-none h-auto p-0">
          <TabsTrigger 
            value="resumo" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            RESUMO
          </TabsTrigger>
          <TabsTrigger 
            value="comunicacao"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            COMUNICAÇÃO
          </TabsTrigger>
          <TabsTrigger 
            value="vendas"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            VENDAS
          </TabsTrigger>
          <TabsTrigger 
            value="contratos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            CONTRATOS
          </TabsTrigger>
          <TabsTrigger 
            value="financeiro"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            FINANCEIRO
          </TabsTrigger>
          <TabsTrigger 
            value="treinos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            TREINOS
          </TabsTrigger>
          <TabsTrigger 
            value="parq"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            PAR-Q
          </TabsTrigger>
          <TabsTrigger 
            value="avaliacoes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            AVALIAÇÕES FÍSICAS
          </TabsTrigger>
          <TabsTrigger 
            value="graduacoes"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
          >
            GRADUAÇÕES
          </TabsTrigger>
        </TabsList>

        {/* Resumo Tab Content */}
        <TabsContent value="resumo" className="mt-6 space-y-6">
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-100">
                  <DollarSign className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Em atraso</p>
                  <p className="text-lg font-semibold">R$ 0,00</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo devedor</p>
                  <p className="text-lg font-semibold">R$ 0,00</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Créditos</p>
                  <p className="text-lg font-semibold">R$ 0,00</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <Award className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo do clube</p>
                  <p className="text-lg font-semibold">--</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próx. vencimento</p>
                  <p className="text-lg font-semibold">
                    {member.expiration_date 
                      ? format(parseISO(member.expiration_date), 'dd/MM/yyyy', { locale: ptBR })
                      : '--'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contratos */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Contratos</span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <FolderOpen className="h-4 w-4" />
                  </Button>
                </div>
                {member.fitness_plan ? (
                  <div className="space-y-1">
                    <p className="font-medium">{member.fitness_plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Válido até {member.expiration_date 
                        ? format(parseISO(member.expiration_date), "dd/MM/yyyy", { locale: ptBR })
                        : '--'}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum contrato ativo</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Categorias */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Categorias</span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma categoria</p>
                </div>
              </CardContent>
            </Card>

            {/* Clube de Recompensas */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Clube de recompensas</span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Award className="h-12 w-12 mb-2 opacity-30" />
                  <p className="text-sm">Sem recompensas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comunicacao" className="mt-6">
          <CommunicationTab
            contactId={member.contact_id}
            contactName={member.contact?.name || ''}
            contactNumber={member.contact?.number || ''}
            contactPicUrl={member.contact?.profile_pic_url}
          />
        </TabsContent>

        <TabsContent value="vendas" className="mt-6">
          <SalesTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="contratos" className="mt-6">
          <ContractsTab memberId={member.id} />
        </TabsContent>

        <TabsContent value="financeiro" className="mt-6">
          <FinanceTab 
            memberId={member.id} 
            contactData={{
              name: member.contact?.name || '',
              email: member.contact?.email,
              cpf: member.contact?.cpf,
              number: member.contact?.number,
            }}
          />
        </TabsContent>

        <TabsContent value="treinos" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Registro de treinos em breve</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parq" className="mt-6">
          <ParQTab 
            memberId={member.id} 
            memberName={member.contact?.name || ''} 
          />
        </TabsContent>

        <TabsContent value="avaliacoes" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Avaliações físicas em breve</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="graduacoes" className="mt-6">
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Graduações em breve</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

