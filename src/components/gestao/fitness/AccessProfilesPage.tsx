import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShieldCheck, Shield, Eye, Edit2, Trash2, Users, Lock } from 'lucide-react';
import { PageHeader, EmptyState, SearchInput, DataCard, DataCardContent, PremiumDialog, PremiumFormField, PremiumTextarea, PremiumColorPicker, PremiumToggle } from '@/components/gestao/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// Mock data for demonstration
const mockProfiles = [
  {
    id: '1',
    name: 'Administrador',
    description: 'Acesso total ao sistema',
    permissions: ['all'],
    usersCount: 2,
    color: '#7C3AED',
    isSystem: true,
  },
  {
    id: '2', 
    name: 'Recepcionista',
    description: 'Acesso a check-in, clientes e agenda',
    permissions: ['clients', 'access', 'schedule'],
    usersCount: 3,
    color: '#3B82F6',
    isSystem: false,
  },
  {
    id: '3',
    name: 'Instrutor',
    description: 'Acesso a treinos e alunos',
    permissions: ['clients', 'workouts'],
    usersCount: 5,
    color: '#10B981',
    isSystem: false,
  },
];

const permissionLabels: Record<string, string> = {
  all: 'Acesso Total',
  clients: 'Clientes',
  access: 'Controle de Acesso',
  schedule: 'Agenda',
  financial: 'Financeiro',
  workouts: 'Treinos',
  reports: 'Relatórios',
  settings: 'Configurações',
};

const availablePermissions = [
  { id: 'clients', label: 'Clientes' },
  { id: 'access', label: 'Controle de Acesso' },
  { id: 'schedule', label: 'Agenda' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'workouts', label: 'Treinos' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'settings', label: 'Configurações' },
];

export function AccessProfilesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [profiles, setProfiles] = useState(mockProfiles);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#7C3AED',
    permissions: [] as string[],
  });

  const handleOpenDialog = () => {
    setFormData({ name: '', description: '', color: '#7C3AED', permissions: [] });
    setIsDialogOpen(true);
  };

  const handlePermissionToggle = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const newProfile = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      color: formData.color,
      permissions: formData.permissions,
      usersCount: 0,
      isSystem: false,
    };
    setProfiles(prev => [...prev, newProfile]);
    setIsDialogOpen(false);
    toast.success('Perfil criado com sucesso!');
  };

  const filteredProfiles = profiles.filter(profile =>
    profile.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Perfis de Acesso"
        description="Configure níveis de permissão para os usuários do sistema"
        icon={<ShieldCheck className="h-6 w-6" />}
        actions={
          <Button onClick={handleOpenDialog} className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
            <Plus className="h-4 w-4" />
            Novo Perfil
          </Button>
        }
      />

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar perfis..."
          className="max-w-sm"
        />
      </div>

      {filteredProfiles.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-10 w-10" />}
          title="Nenhum perfil cadastrado"
          description="Crie perfis de acesso para controlar as permissões dos usuários do sistema."
          action={
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Perfil
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((profile, index) => (
            <DataCard 
              key={profile.id} 
              accent={profile.color}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <DataCardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${profile.color}20` }}
                    >
                      <Shield className="h-5 w-5" style={{ color: profile.color }} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{profile.name}</h3>
                        {profile.isSystem && (
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {profile.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {profile.permissions.slice(0, 3).map(perm => (
                    <Badge 
                      key={perm} 
                      variant="secondary" 
                      className="text-xs rounded-lg px-2"
                    >
                      {permissionLabels[perm] || perm}
                    </Badge>
                  ))}
                  {profile.permissions.length > 3 && (
                    <Badge variant="outline" className="text-xs rounded-lg px-2">
                      +{profile.permissions.length - 3}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{profile.usersCount} usuário{profile.usersCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg"
                      disabled={profile.isSystem}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                      disabled={profile.isSystem}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DataCardContent>
            </DataCard>
          ))}
        </div>
      )}

      <PremiumDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Novo Perfil de Acesso"
        subtitle="Configure as permissões para este perfil"
        icon={<ShieldCheck className="h-5 w-5" />}
        onSubmit={handleSave}
        submitLabel="Criar Perfil"
      >
        <div className="space-y-6">
          <PremiumFormField
            label="Nome do Perfil"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Recepcionista"
          />
          <PremiumTextarea
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva as responsabilidades deste perfil..."
            rows={3}
          />
          <PremiumColorPicker
            label="Cor do Perfil"
            value={formData.color}
            onChange={(color) => setFormData(prev => ({ ...prev, color }))}
            colors={['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']}
          />
          <div className="space-y-3">
            <Label className="text-sm font-medium">Permissões</Label>
            <div className="grid grid-cols-2 gap-3">
              {availablePermissions.map((perm) => (
                <div
                  key={perm.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handlePermissionToggle(perm.id)}
                >
                  <Checkbox
                    checked={formData.permissions.includes(perm.id)}
                    onCheckedChange={() => handlePermissionToggle(perm.id)}
                  />
                  <span className="text-sm">{perm.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PremiumDialog>
    </div>
  );
}
