import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Edit, Trash2, Dumbbell, Clock, Users, Check, FileText } from 'lucide-react';
import { useClassTypes, type CreateClassTypeData } from '@/hooks/useClassTypes';
import { 
  PageHeader, 
  EmptyState, 
  SearchInput, 
  StatsCard, 
  DataCard, 
  DataCardContent,
  PremiumDialog,
  PremiumFormField,
  PremiumTextarea,
  PremiumColorPicker,
  PremiumToggle,
} from '@/components/gestao/ui';

const colorOptions = [
  '#7C3AED', '#EF4444', '#F59E0B', '#10B981', '#3B82F6', 
  '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
];

export function ClassTypesPage() {
  const { classTypes, isLoading, createClassType, updateClassType, deleteClassType } = useClassTypes();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClassType, setEditingClassType] = useState<typeof classTypes[0] | null>(null);
  const [formData, setFormData] = useState<CreateClassTypeData>({
    name: '',
    description: '',
    duration_minutes: 60,
    max_capacity: 20,
    color: '#7C3AED',
    is_active: true,
  });

  const filteredClassTypes = classTypes.filter(ct =>
    ct.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTypes = classTypes.filter(ct => ct.is_active).length;
  const totalCapacity = classTypes.reduce((acc, ct) => acc + ct.max_capacity, 0);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 60,
      max_capacity: 20,
      color: '#7C3AED',
      is_active: true,
    });
    setEditingClassType(null);
  };

  const handleOpenDialog = (classType?: typeof classTypes[0]) => {
    if (classType) {
      setEditingClassType(classType);
      setFormData({
        name: classType.name,
        description: classType.description || '',
        duration_minutes: classType.duration_minutes,
        max_capacity: classType.max_capacity,
        color: classType.color,
        is_active: classType.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    if (editingClassType) {
      await updateClassType.mutateAsync({ id: editingClassType.id, ...formData });
    } else {
      await createClassType.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Tipos de Aula"
        description="Configure as modalidades oferecidas"
        icon={<Dumbbell className="h-6 w-6" />}
        actions={
          <>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Nova Modalidade
            </Button>
            <PremiumDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              title={editingClassType ? 'Editar Modalidade' : 'Nova Modalidade'}
              subtitle="Configure os detalhes da modalidade de aula"
              icon={<Dumbbell className="h-5 w-5" />}
              onSubmit={handleSubmit}
              submitLabel={editingClassType ? 'Salvar Alterações' : 'Criar Modalidade'}
              submitDisabled={!formData.name}
              isSubmitting={createClassType.isPending || updateClassType.isPending}
              size="md"
            >
              <PremiumFormField
                label="Nome *"
                icon={FileText}
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: WOD, Halterofilismo, Mobilidade"
              />

              <PremiumTextarea
                label="Descrição"
                icon={FileText}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />

              <div className="grid grid-cols-2 gap-4">
                <PremiumFormField
                  label="Duração (min) *"
                  icon={Clock}
                  type="number"
                  min="15"
                  step="5"
                  value={formData.duration_minutes}
                  onChange={e => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                />

                <PremiumFormField
                  label="Capacidade *"
                  icon={Users}
                  type="number"
                  min="1"
                  value={formData.max_capacity}
                  onChange={e => setFormData(prev => ({ ...prev, max_capacity: parseInt(e.target.value) || 20 }))}
                />
              </div>

              <PremiumColorPicker
                label="Cor da Modalidade"
                value={formData.color}
                onChange={(color) => setFormData(prev => ({ ...prev, color }))}
                colors={colorOptions}
              />

              <PremiumToggle
                label="Modalidade ativa"
                description="Disponível para agendamentos"
                icon={Check}
                checked={formData.is_active}
                onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </PremiumDialog>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<Dumbbell className="h-5 w-5" />}
          value={classTypes.length}
          label="Total de modalidades"
          color="primary"
        />
        <StatsCard
          icon={<Check className="h-5 w-5" />}
          value={activeTypes}
          label="Modalidades ativas"
          color="success"
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          value={totalCapacity}
          label="Capacidade total"
          color="info"
        />
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar modalidades..."
          className="max-w-sm"
        />
      </div>

      {filteredClassTypes.length === 0 ? (
        <EmptyState
          icon={<Dumbbell className="h-10 w-10" />}
          title="Nenhuma modalidade cadastrada"
          description="Crie modalidades como WOD, Halterofilismo, Mobilidade, etc."
          action={
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeira Modalidade
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClassTypes.map((classType, index) => (
            <DataCard 
              key={classType.id} 
              accent={classType.color}
              className="animate-fade-up group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <DataCardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-xl transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${classType.color}20` }}
                    >
                      <Dumbbell className="h-5 w-5" style={{ color: classType.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{classType.name}</h3>
                      {!classType.is_active && (
                        <Badge variant="secondary" className="text-xs mt-1 rounded-lg">Inativa</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(classType)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-2xl">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir modalidade?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Os horários associados também serão excluídos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteClassType.mutate(classType.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                {classType.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                    {classType.description}
                  </p>
                )}
                <div className="flex gap-4 mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">{classType.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-muted-foreground">{classType.max_capacity} vagas</span>
                  </div>
                </div>
              </DataCardContent>
            </DataCard>
          ))}
        </div>
      )}
    </div>
  );
}
