import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Search, Edit, Trash2, Users, QrCode, Calendar, AlertTriangle, Info } from 'lucide-react';
import { useMembers, getStatusLabel, getStatusColor, type MemberStatus } from '@/hooks/useMembers';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { ContactTagsSelect } from '@/components/contacts/ContactTagsSelect';

interface ClientFormData {
  // Dados Principais
  name: string;
  cpf: string;
  phone: string;
  rg: string;
  birth_date: string;
  email: string;
  objective: string;
  gender: string;
  // Responsável
  has_guardian: boolean;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship: string;
  // Consultor/Professor
  instructor_id: string;
  // Endereço
  address_zipcode: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  // Notificações e Observações
  whatsapp_notifications: boolean;
  notes: string;
  // Plano e Matrícula
  fitness_plan_id: string | null;
  enrollment_date: string;
  // Emergência
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_notes: string;
}

const OBJECTIVES = [
  'Emagrecimento',
  'Hipertrofia',
  'Condicionamento Físico',
  'Qualidade de Vida',
  'Reabilitação',
  'Performance Esportiva',
  'Ganho de Flexibilidade',
  'Outros',
];

const GENDERS = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'O', label: 'Outro' },
];

const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function ClientsPage() {
  const { members, isLoading, updateMember, deleteMember } = useMembers();
  const { profiles } = useProfiles();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  const initialFormData: ClientFormData = {
    name: '',
    cpf: '',
    phone: '',
    rg: '',
    birth_date: '',
    email: '',
    objective: '',
    gender: '',
    has_guardian: false,
    guardian_name: '',
    guardian_phone: '',
    guardian_relationship: '',
    instructor_id: '',
    address_zipcode: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    whatsapp_notifications: true,
    notes: '',
    fitness_plan_id: null,
    enrollment_date: new Date().toISOString().split('T')[0],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
  };
  
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);

  // Load tags when editing a member
  useEffect(() => {
    const loadContactTags = async () => {
      if (editingMember?.contact_id) {
        const { data } = await supabase
          .from('contact_tags')
          .select('tag_id')
          .eq('contact_id', editingMember.contact_id);
        
        setSelectedTagIds(data?.map(ct => ct.tag_id) || []);
      }
    };
    
    if (editingMember) {
      loadContactTags();
    }
  }, [editingMember]);

  // Filter instructors from profiles
  const instructors = profiles.filter(p => p.profile === 'user' || p.profile === 'admin');

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.contact?.number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingMember(null);
    setSelectedTagIds([]);
  };

  const handleOpenDialog = async (member?: typeof members[0]) => {
    if (member) {
      setEditingMember(member);
      
      // Fetch contact data with extended fields
      const { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', member.contact_id)
        .single();
      
      setFormData({
        name: member.contact?.name || '',
        cpf: (contactData as any)?.cpf || '',
        phone: member.contact?.number || '',
        rg: (contactData as any)?.rg || '',
        birth_date: member.birth_date || '',
        email: member.contact?.email || '',
        objective: (contactData as any)?.objective || '',
        gender: (contactData as any)?.gender || '',
        has_guardian: (member as any).has_guardian || false,
        guardian_name: (member as any).guardian_name || '',
        guardian_phone: (member as any).guardian_phone || '',
        guardian_relationship: (member as any).guardian_relationship || '',
        instructor_id: (member as any).instructor_id || '',
        address_zipcode: (contactData as any)?.address_zipcode || '',
        address_street: (contactData as any)?.address_street || '',
        address_number: (contactData as any)?.address_number || '',
        address_complement: (contactData as any)?.address_complement || '',
        address_neighborhood: (contactData as any)?.address_neighborhood || '',
        address_city: (contactData as any)?.address_city || '',
        address_state: (contactData as any)?.address_state || '',
        whatsapp_notifications: (contactData as any)?.whatsapp_notifications ?? true,
        notes: (contactData as any)?.notes || '',
        fitness_plan_id: member.fitness_plan_id,
        enrollment_date: member.enrollment_date,
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_notes: member.medical_notes || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    // Validação: Nome, Telefone e Email obrigatórios
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Celular é obrigatório');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('E-mail é obrigatório');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingMember) {
        // Update existing member
        // 1. Update contact
        await supabase
          .from('contacts')
          .update({
            name: formData.name,
            number: formData.phone,
            email: formData.email,
            cpf: formData.cpf || null,
            rg: formData.rg || null,
            gender: formData.gender || null,
            objective: formData.objective || null,
            address_zipcode: formData.address_zipcode || null,
            address_street: formData.address_street || null,
            address_number: formData.address_number || null,
            address_complement: formData.address_complement || null,
            address_neighborhood: formData.address_neighborhood || null,
            address_city: formData.address_city || null,
            address_state: formData.address_state || null,
            whatsapp_notifications: formData.whatsapp_notifications,
            notes: formData.notes || null,
          })
          .eq('id', editingMember.contact_id);

        // 2. Save contact tags
        await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', editingMember.contact_id);

        if (selectedTagIds.length > 0) {
          await supabase.from('contact_tags').insert(
            selectedTagIds.map(tagId => ({
              contact_id: editingMember.contact_id,
              tag_id: tagId,
            }))
          );
        }

        // 3. Update member
        await updateMember.mutateAsync({
          id: editingMember.id,
          contact_id: editingMember.contact_id,
          fitness_plan_id: formData.fitness_plan_id,
          enrollment_date: formData.enrollment_date,
          emergency_contact_name: formData.emergency_contact_name,
          emergency_contact_phone: formData.emergency_contact_phone,
          medical_notes: formData.medical_notes,
          birth_date: formData.birth_date || null,
          has_guardian: formData.has_guardian,
          guardian_name: formData.guardian_name || null,
          guardian_phone: formData.guardian_phone || null,
          guardian_relationship: formData.guardian_relationship || null,
          instructor_id: formData.instructor_id || null,
        });

        toast.success('Cliente atualizado com sucesso!');
      } else {
        // Create new member
        // Resolve company id (profile can be null during initial load)
        let companyId: string | null = profile?.company_id ?? null;

        if (!companyId) {
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
          if (!userData?.user) throw new Error('Sessão expirada. Faça login novamente.');

          const { data: resolvedCompanyId, error: companyError } = await supabase.rpc(
            'get_user_company_id',
            { _user_id: userData.user.id }
          );

          if (companyError) throw companyError;
          companyId = (resolvedCompanyId as any) ?? null;
        }

        if (!companyId) throw new Error('Empresa não encontrada para este usuário.');

        // 1. Create contact first
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            company_id: companyId,
            name: formData.name,
            number: formData.phone,
            email: formData.email,
            cpf: formData.cpf || null,
            rg: formData.rg || null,
            gender: formData.gender || null,
            objective: formData.objective || null,
            address_zipcode: formData.address_zipcode || null,
            address_street: formData.address_street || null,
            address_number: formData.address_number || null,
            address_complement: formData.address_complement || null,
            address_neighborhood: formData.address_neighborhood || null,
            address_city: formData.address_city || null,
            address_state: formData.address_state || null,
            whatsapp_notifications: formData.whatsapp_notifications,
            notes: formData.notes || null,
          })
          .select()
          .single();

        if (contactError) throw contactError;

        // 2. Save contact tags
        if (selectedTagIds.length > 0) {
          await supabase.from('contact_tags').insert(
            selectedTagIds.map(tagId => ({
              contact_id: newContact.id,
              tag_id: tagId,
            }))
          );
        }

        // 3. Create member
        const { error: memberError } = await supabase.from('members').insert({
          company_id: companyId,
          contact_id: newContact.id,
          fitness_plan_id: formData.fitness_plan_id,
          enrollment_date: formData.enrollment_date,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          medical_notes: formData.medical_notes || null,
          birth_date: formData.birth_date || null,
          has_guardian: formData.has_guardian,
          guardian_name: formData.guardian_name || null,
          guardian_phone: formData.guardian_phone || null,
          guardian_relationship: formData.guardian_relationship || null,
          instructor_id: formData.instructor_id || null,
        });

        if (memberError) throw memberError;

        queryClient.invalidateQueries({ queryKey: ['members'] });
        toast.success('Cliente cadastrado com sucesso!');
        
        // Navigate to profile page after creation
        if (newContact) {
          const { data: newMember } = await supabase
            .from('members')
            .select('id')
            .eq('contact_id', newContact.id)
            .single();
          
          if (newMember) {
            navigate(`/gestao/fitness/clientes/perfil?id=${newMember.id}`);
          }
        }
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error('Error saving client:', error);
      toast.error(error.message || 'Erro ao salvar cliente');
    } finally {
      setIsSubmitting(false);
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

  const isExpiringSoon = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    const expDate = parseISO(expirationDate);
    const warningDate = addDays(new Date(), 7);
    return isBefore(expDate, warningDate) && isAfter(expDate, new Date());
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return isBefore(parseISO(expirationDate), new Date());
  };

  // Stats
  const activeMembers = members.filter(m => m.status === 'active').length;
  const expiringMembers = members.filter(m => isExpiringSoon(m.expiration_date)).length;
  const expiredMembers = members.filter(m => isExpired(m.expiration_date) && m.status === 'active').length;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">Gerencie seus clientes e alunos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <Accordion type="multiple" defaultValue={['dados-principais']} className="w-full">
                {/* Dados Principais */}
                <AccordionItem value="dados-principais">
                  <AccordionTrigger className="text-base font-semibold">
                    Dados Principais
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={formData.name}
                          onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label>CPF</Label>
                        <Input
                          value={formData.cpf}
                          onChange={e => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <Label>Celular *</Label>
                        <Input
                          value={formData.phone}
                          onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>RG</Label>
                        <Input
                          value={formData.rg}
                          onChange={e => setFormData(prev => ({ ...prev, rg: e.target.value }))}
                          placeholder="00.000.000-0"
                        />
                      </div>
                      <div>
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={formData.birth_date}
                          onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label>E-mail *</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Objetivo</Label>
                        <Select
                          value={formData.objective}
                          onValueChange={value => setFormData(prev => ({ ...prev, objective: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o objetivo" />
                          </SelectTrigger>
                          <SelectContent>
                            {OBJECTIVES.map(obj => (
                              <SelectItem key={obj} value={obj}>{obj}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Sexo</Label>
                        <Select
                          value={formData.gender}
                          onValueChange={value => setFormData(prev => ({ ...prev, gender: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {GENDERS.map(g => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>O cliente não poderá utilizar o aplicativo se não houver e-mail ou celular em seu cadastro.</span>
                    </div>
                    
                    {/* Tags */}
                    <div>
                      <Label>Tags</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        As tags vinculam o cliente ao sistema de atendimento/CRM
                      </p>
                      <ContactTagsSelect
                        contactId={editingMember?.contact_id}
                        selectedTagIds={selectedTagIds}
                        onTagsChange={setSelectedTagIds}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Responsável */}
                <AccordionItem value="responsavel">
                  <AccordionTrigger className="text-base font-semibold">
                    Responsável
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Switch
                        checked={formData.has_guardian}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, has_guardian: checked }))}
                      />
                      <span>Informar responsável</span>
                    </div>
                    {formData.has_guardian && (
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Nome do Responsável</Label>
                          <Input
                            value={formData.guardian_name}
                            onChange={e => setFormData(prev => ({ ...prev, guardian_name: e.target.value }))}
                            placeholder="Nome completo"
                          />
                        </div>
                        <div>
                          <Label>Telefone</Label>
                          <Input
                            value={formData.guardian_phone}
                            onChange={e => setFormData(prev => ({ ...prev, guardian_phone: e.target.value }))}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        <div>
                          <Label>Parentesco</Label>
                          <Input
                            value={formData.guardian_relationship}
                            onChange={e => setFormData(prev => ({ ...prev, guardian_relationship: e.target.value }))}
                            placeholder="Ex: Pai, Mãe, Tutor"
                          />
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* Consultor/Professor */}
                <AccordionItem value="consultor">
                  <AccordionTrigger className="text-base font-semibold">
                    Consultor/Professor
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Consultor/Professor</Label>
                        <Select
                          value={formData.instructor_id || 'none'}
                          onValueChange={value => setFormData(prev => ({ ...prev, instructor_id: value === 'none' ? '' : value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {instructors.map(inst => (
                              <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Endereço */}
                <AccordionItem value="endereco">
                  <AccordionTrigger className="text-base font-semibold">
                    Endereço
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>CEP</Label>
                        <Input
                          value={formData.address_zipcode}
                          onChange={e => setFormData(prev => ({ ...prev, address_zipcode: e.target.value }))}
                          placeholder="00000-000"
                        />
                      </div>
                      <div>
                        <Label>Logradouro</Label>
                        <Input
                          value={formData.address_street}
                          onChange={e => setFormData(prev => ({ ...prev, address_street: e.target.value }))}
                          placeholder="Rua, Av, etc"
                        />
                      </div>
                      <div>
                        <Label>Número</Label>
                        <Input
                          value={formData.address_number}
                          onChange={e => setFormData(prev => ({ ...prev, address_number: e.target.value }))}
                          placeholder="Nº"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Complemento</Label>
                        <Input
                          value={formData.address_complement}
                          onChange={e => setFormData(prev => ({ ...prev, address_complement: e.target.value }))}
                          placeholder="Apto, Bloco, etc"
                        />
                      </div>
                      <div>
                        <Label>Bairro</Label>
                        <Input
                          value={formData.address_neighborhood}
                          onChange={e => setFormData(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                          placeholder="Bairro"
                        />
                      </div>
                      <div>
                        <Label>Cidade</Label>
                        <Input
                          value={formData.address_city}
                          onChange={e => setFormData(prev => ({ ...prev, address_city: e.target.value }))}
                          placeholder="Cidade"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Estado</Label>
                        <Select
                          value={formData.address_state}
                          onValueChange={value => setFormData(prev => ({ ...prev, address_state: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATES.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Contato de Emergência */}
                <AccordionItem value="emergencia">
                  <AccordionTrigger className="text-base font-semibold">
                    Contato de Emergência
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Nome</Label>
                        <Input
                          value={formData.emergency_contact_name}
                          onChange={e => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                          placeholder="Nome do contato"
                        />
                      </div>
                      <div>
                        <Label>Telefone</Label>
                        <Input
                          value={formData.emergency_contact_phone}
                          onChange={e => setFormData(prev => ({ ...prev, emergency_contact_phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Observações Médicas</Label>
                      <Textarea
                        value={formData.medical_notes}
                        onChange={e => setFormData(prev => ({ ...prev, medical_notes: e.target.value }))}
                        placeholder="Alergias, restrições, lesões..."
                        rows={2}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Notificações e Observações */}
                <AccordionItem value="notificacoes">
                  <AccordionTrigger className="text-base font-semibold">
                    Notificações e Observações
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Switch
                        checked={formData.whatsapp_notifications}
                        onCheckedChange={checked => setFormData(prev => ({ ...prev, whatsapp_notifications: checked }))}
                      />
                      <span>Receber notificação pelo WhatsApp</span>
                    </div>
                    <div>
                      <Label>Observações</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Observações gerais sobre o cliente..."
                        rows={3}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {editingMember ? 'Salvar' : 'Cadastrar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMembers}</p>
              <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-500/10">
              <Calendar className="h-6 w-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringMembers}</p>
              <p className="text-sm text-muted-foreground">Vencendo em 7 dias</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiredMembers}</p>
              <p className="text-sm text-muted-foreground">Planos Vencidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as MemberStatus | 'all')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
            <SelectItem value="suspended">Suspensos</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredMembers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Cadastre seus clientes clicando no botão "Novo Cliente".
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map(member => (
                <TableRow 
                  key={member.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/gestao/fitness/clientes/perfil?id=${member.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.contact?.profile_pic_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(member.contact?.name || '')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.contact?.name}</p>
                        <p className="text-sm text-muted-foreground">{member.contact?.number}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                  {member.fitness_plan ? (
                      <div>
                        <p className="font-medium">{member.fitness_plan.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.fitness_plan.period}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Sem plano</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {member.expiration_date ? (
                      <div className="flex items-center gap-2">
                        <span className={
                          isExpired(member.expiration_date) ? 'text-red-500' :
                          isExpiringSoon(member.expiration_date) ? 'text-yellow-500' : ''
                        }>
                          {format(parseISO(member.expiration_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        {isExpired(member.expiration_date) && (
                          <Badge variant="destructive" className="text-xs">Vencido</Badge>
                        )}
                        {isExpiringSoon(member.expiration_date) && (
                          <Badge variant="outline" className="text-xs text-yellow-500 border-yellow-500">
                            Vencendo
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(member.status)}>
                      {getStatusLabel(member.status)}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(member)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Ver QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O cliente será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMember.mutate(member.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}