import { useState } from 'react';
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
import { Plus, Search, Edit, Trash2, Users, QrCode, Calendar, AlertTriangle } from 'lucide-react';
import { useMembers, getStatusLabel, getStatusColor, type MemberStatus, type CreateMemberData } from '@/hooks/useMembers';
import { useFitnessPlans, getPeriodLabel } from '@/hooks/useFitnessPlans';
import { useContacts } from '@/hooks/useContacts';
import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function MembersPage() {
  const { members, isLoading, createMember, updateMember, deleteMember } = useMembers();
  const { plans } = useFitnessPlans();
  const { contacts } = useContacts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<MemberStatus | 'all'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<typeof members[0] | null>(null);
  const [formData, setFormData] = useState<CreateMemberData>({
    contact_id: '',
    fitness_plan_id: null,
    enrollment_date: new Date().toISOString().split('T')[0],
    emergency_contact_name: '',
    emergency_contact_phone: '',
    medical_notes: '',
    birth_date: null,
  });

  // Filter contacts that are not already members
  const existingContactIds = members.map(m => m.contact_id);
  const availableContacts = contacts.filter(c => 
    !existingContactIds.includes(c.id) || c.id === editingMember?.contact_id
  );

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.contact?.number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetForm = () => {
    setFormData({
      contact_id: '',
      fitness_plan_id: null,
      enrollment_date: new Date().toISOString().split('T')[0],
      emergency_contact_name: '',
      emergency_contact_phone: '',
      medical_notes: '',
      birth_date: null,
    });
    setEditingMember(null);
  };

  const handleOpenDialog = (member?: typeof members[0]) => {
    if (member) {
      setEditingMember(member);
      setFormData({
        contact_id: member.contact_id,
        fitness_plan_id: member.fitness_plan_id,
        enrollment_date: member.enrollment_date,
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
        medical_notes: member.medical_notes || '',
        birth_date: member.birth_date,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.contact_id) return;

    if (editingMember) {
      await updateMember.mutateAsync({ id: editingMember.id, ...formData });
    } else {
      await createMember.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
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
          <h1 className="text-2xl font-bold text-foreground">Membros</h1>
          <p className="text-muted-foreground">Gerencie os alunos matriculados</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Editar Membro' : 'Novo Membro'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <Label>Contato *</Label>
                <Select
                  value={formData.contact_id}
                  onValueChange={value => setFormData(prev => ({ ...prev, contact_id: value }))}
                  disabled={!!editingMember}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um contato" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map(contact => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} - {contact.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plano</Label>
                <Select
                  value={formData.fitness_plan_id || 'none'}
                  onValueChange={value => setFormData(prev => ({ 
                    ...prev, 
                    fitness_plan_id: value === 'none' ? null : value 
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem plano</SelectItem>
                    {plans.filter(p => p.is_active).map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {getPeriodLabel(plan.period)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data de Matrícula</Label>
                  <Input
                    type="date"
                    value={formData.enrollment_date}
                    onChange={e => setFormData(prev => ({ ...prev, enrollment_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={e => setFormData(prev => ({ ...prev, birth_date: e.target.value || null }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contato de Emergência</Label>
                  <Input
                    value={formData.emergency_contact_name}
                    onChange={e => setFormData(prev => ({ ...prev, emergency_contact_name: e.target.value }))}
                    placeholder="Nome"
                  />
                </div>
                <div>
                  <Label>Telefone Emergência</Label>
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
              <div className="flex gap-2 justify-end pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!formData.contact_id || createMember.isPending || updateMember.isPending}
                >
                  {editingMember ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
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
              <p className="text-sm text-muted-foreground">Membros Ativos</p>
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
            placeholder="Buscar membros..."
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
            <h3 className="text-lg font-medium">Nenhum membro encontrado</h3>
            <p className="text-muted-foreground text-center max-w-sm mt-1">
              Cadastre seus alunos vinculando-os aos contatos existentes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Membro</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map(member => (
                <TableRow key={member.id}>
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
                          {getPeriodLabel(member.fitness_plan.period)}
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
                  <TableCell>
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
                            <AlertDialogTitle>Excluir membro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. O histórico de acessos e pagamentos será mantido.
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
