import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { DialogTrigger, Dialog } from '@/components/ui/dialog';
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
import { Plus, Edit, Trash2, CreditCard, X, Check, Sparkles, FileText, Calendar, DollarSign, Layers } from 'lucide-react';
import { useFitnessPlans, getPeriodLabel, type PlanPeriod, type CreateFitnessPlanData } from '@/hooks/useFitnessPlans';
import { 
  PageHeader, 
  EmptyState, 
  SearchInput, 
  StatsCard,
  PremiumDialog,
  PremiumFormField,
  PremiumTextarea,
  PremiumSelect,
  PremiumToggle,
} from '@/components/gestao/ui';

export function FitnessPlansPage() {
  const { plans, isLoading, createPlan, updatePlan, deletePlan } = useFitnessPlans();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<typeof plans[0] | null>(null);
  const [formData, setFormData] = useState<CreateFitnessPlanData>({
    name: '',
    description: '',
    period: 'monthly',
    price: 0,
    classes_per_week: null,
    benefits: [],
    is_active: true,
  });
  const [benefitInput, setBenefitInput] = useState('');

  const filteredPlans = plans.filter(plan =>
    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activePlans = plans.filter(p => p.is_active).length;
  const avgPrice = plans.length > 0 
    ? plans.reduce((acc, p) => acc + p.price, 0) / plans.length 
    : 0;

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      period: 'monthly',
      price: 0,
      classes_per_week: null,
      benefits: [],
      is_active: true,
    });
    setBenefitInput('');
    setEditingPlan(null);
  };

  const handleOpenDialog = (plan?: typeof plans[0]) => {
    if (plan) {
      setEditingPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        period: plan.period,
        price: plan.price,
        classes_per_week: plan.classes_per_week,
        benefits: plan.benefits || [],
        is_active: plan.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name || formData.price <= 0) return;

    if (editingPlan) {
      await updatePlan.mutateAsync({ id: editingPlan.id, ...formData });
    } else {
      await createPlan.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleAddBenefit = () => {
    if (benefitInput.trim()) {
      setFormData(prev => ({
        ...prev,
        benefits: [...(prev.benefits || []), benefitInput.trim()],
      }));
      setBenefitInput('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: (prev.benefits || []).filter((_, i) => i !== index),
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Planos de Adesão"
        description="Gerencie os planos disponíveis para seus alunos"
        icon={<CreditCard className="h-6 w-6" />}
        actions={
          <>
            <Button 
              onClick={() => handleOpenDialog()} 
              className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Novo Plano
            </Button>
            <PremiumDialog
              open={isDialogOpen}
              onOpenChange={setIsDialogOpen}
              title={editingPlan ? 'Editar Plano' : 'Novo Plano'}
              subtitle="Configure os detalhes do plano de adesão"
              icon={<CreditCard className="h-5 w-5" />}
              onSubmit={handleSubmit}
              submitLabel={editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
              submitDisabled={!formData.name || formData.price <= 0}
              isSubmitting={createPlan.isPending || updatePlan.isPending}
              size="md"
            >
              <PremiumFormField
                label="Nome do Plano *"
                icon={FileText}
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Plano Mensal"
              />

              <PremiumTextarea
                label="Descrição"
                icon={FileText}
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />

              <div className="grid grid-cols-2 gap-4">
                <PremiumSelect
                  label="Período *"
                  icon={Calendar}
                  value={formData.period}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, period: value as PlanPeriod }))}
                  options={[
                    { value: 'monthly', label: 'Mensal' },
                    { value: 'quarterly', label: 'Trimestral' },
                    { value: 'semiannual', label: 'Semestral' },
                    { value: 'annual', label: 'Anual' },
                  ]}
                />

                <PremiumFormField
                  label="Valor (R$) *"
                  icon={DollarSign}
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <PremiumFormField
                label="Aulas por Semana"
                icon={Layers}
                type="number"
                min="0"
                value={formData.classes_per_week ?? ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  classes_per_week: e.target.value ? parseInt(e.target.value) : null 
                }))}
                hint="Deixe vazio para ilimitado"
              />

              {/* Benefits section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  Benefícios
                </div>
                <div className="flex gap-2">
                  <Input
                    value={benefitInput}
                    onChange={e => setBenefitInput(e.target.value)}
                    placeholder="Adicionar benefício"
                    className="rounded-xl bg-muted/30 border-border/50"
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddBenefit())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddBenefit} className="rounded-xl shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.benefits && formData.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                    {formData.benefits.map((benefit, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="gap-1.5 rounded-lg px-3 py-1.5 bg-primary/10 text-primary border-0"
                      >
                        <Sparkles className="h-3 w-3" />
                        {benefit}
                        <button 
                          onClick={() => handleRemoveBenefit(index)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <PremiumToggle
                label="Plano ativo"
                description="Disponível para novos clientes"
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
          icon={<CreditCard className="h-5 w-5" />}
          value={plans.length}
          label="Total de planos"
          color="primary"
        />
        <StatsCard
          icon={<Check className="h-5 w-5" />}
          value={activePlans}
          label="Planos ativos"
          color="success"
        />
        <StatsCard
          icon={<Sparkles className="h-5 w-5" />}
          value={formatCurrency(avgPrice)}
          label="Valor médio"
          color="info"
        />
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar planos..."
          className="max-w-sm"
        />
      </div>

      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-10 w-10" />}
          title="Nenhum plano cadastrado"
          description="Crie planos de adesão para seus alunos com diferentes períodos e benefícios."
          action={
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Plano
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Plano</TableHead>
                <TableHead className="font-semibold">Período</TableHead>
                <TableHead className="font-semibold">Valor</TableHead>
                <TableHead className="font-semibold">Aulas/Semana</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="w-[100px] font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan, index) => (
                <TableRow 
                  key={plan.id}
                  className="animate-fade-up group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <TableCell>
                    <div>
                      <p className="font-medium">{plan.name}</p>
                      {plan.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{plan.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-lg">
                      {getPeriodLabel(plan.period)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-primary">{formatCurrency(plan.price)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {plan.classes_per_week ?? '∞'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={plan.is_active ? 'default' : 'secondary'}
                      className="rounded-lg"
                    >
                      {plan.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(plan)}
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
                            <AlertDialogTitle>Excluir plano?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Membros com este plano ficarão sem plano associado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePlan.mutate(plan.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
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
