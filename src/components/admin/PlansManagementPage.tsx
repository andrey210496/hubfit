import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Loader2, Crown, Check, X, Users, Link2, LayoutList, Megaphone, Calendar, MessageSquare, Code, LayoutGrid } from 'lucide-react';
import { useAdminPlans, Plan, PlanFormData } from '@/hooks/useSuperAdmin';
import { cn } from '@/lib/utils';

const defaultPlanForm: PlanFormData = {
  name: '',
  price: 0,
  users: 1,
  connections: 1,
  queues: 1,
  use_campaigns: true,
  use_schedules: true,
  use_internal_chat: true,
  use_external_api: true,
  use_kanban: true,
};

const features = [
  { key: 'use_campaigns', label: 'Campanhas', icon: Megaphone, description: 'Envio de campanhas em massa' },
  { key: 'use_schedules', label: 'Agendamentos', icon: Calendar, description: 'Agendamento de mensagens' },
  { key: 'use_internal_chat', label: 'Chat Interno', icon: MessageSquare, description: 'Comunicação entre atendentes' },
  { key: 'use_external_api', label: 'API Externa', icon: Code, description: 'Acesso à API para integrações' },
  { key: 'use_kanban', label: 'Kanban', icon: LayoutGrid, description: 'Visualização Kanban de tickets' },
];

export default function PlansManagementPage() {
  const { plans, loading, createPlan, updatePlan, deletePlan } = useAdminPlans();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(defaultPlanForm);
  const [saving, setSaving] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setFormData(defaultPlanForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      users: plan.users,
      connections: plan.connections,
      queues: plan.queues,
      use_campaigns: plan.use_campaigns ?? true,
      use_schedules: plan.use_schedules ?? true,
      use_internal_chat: plan.use_internal_chat ?? true,
      use_external_api: plan.use_external_api ?? true,
      use_kanban: plan.use_kanban ?? true,
    });
    setDialogOpen(true);
  };

  const handleOpenDelete = (plan: Plan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    setSaving(true);
    let success: boolean;
    if (selectedPlan) {
      success = await updatePlan(selectedPlan.id, formData);
    } else {
      success = await createPlan(formData);
    }
    setSaving(false);
    if (success) {
      setDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    const success = await deletePlan(selectedPlan.id);
    setSaving(false);
    if (success) {
      setDeleteDialogOpen(false);
      setSelectedPlan(null);
    }
  };

  const getFeatureCount = (plan: Plan) => {
    return features.filter(f => plan[f.key as keyof Plan]).length;
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient-coral">Gestão de Planos</h1>
          <p className="text-muted-foreground">Gerencie os planos e funcionalidades do sistema</p>
        </div>
        <Button onClick={handleOpenCreate} className="neu-button gradient-coral text-white border-0 gap-2">
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : plans.length === 0 ? (
        <div className="module-card text-center py-16">
          <Crown className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum plano cadastrado</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 neu-button">
            Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((plan, index) => (
            <div 
              key={plan.id} 
              className={cn(
                "module-card group relative overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                index === 0 && "border-l-4 border-l-muted-foreground",
                index === 1 && "border-l-4 border-l-primary",
                index === 2 && "border-l-4 border-l-secondary",
                index >= 3 && "border-l-4 border-l-purple-500"
              )}
            >
              {/* Popular Badge */}
              {index === 2 && (
                <div className="absolute top-3 right-3">
                  <span className="gradient-teal text-white text-xs px-2 py-1 rounded-full font-medium">
                    Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    index === 0 && "bg-muted",
                    index === 1 && "gradient-coral",
                    index === 2 && "gradient-teal",
                    index >= 3 && "gradient-purple"
                  )}>
                    <Crown className={cn(
                      "h-5 w-5",
                      index === 0 ? "text-muted-foreground" : "text-white"
                    )} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{plan.name}</h3>
                    <p className="text-2xl font-bold text-gradient-coral">
                      {formatCurrency(plan.price)}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between neu-pressed px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Usuários</span>
                  </div>
                  <span className="font-semibold">{plan.users}</span>
                </div>
                <div className="flex items-center justify-between neu-pressed px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Conexões</span>
                  </div>
                  <span className="font-semibold">{plan.connections}</span>
                </div>
                <div className="flex items-center justify-between neu-pressed px-3 py-2 rounded-lg">
                  <div className="flex items-center gap-2">
                    <LayoutList className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Filas</span>
                  </div>
                  <span className="font-semibold">{plan.queues}</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5 mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {getFeatureCount(plan)} funcionalidades
                </p>
                {features.map(feature => {
                  const enabled = plan[feature.key as keyof Plan];
                  return (
                    <div key={feature.key} className="flex items-center gap-2">
                      {enabled ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/50" />
                      )}
                      <span className={cn(
                        "text-sm",
                        enabled ? "text-foreground" : "text-muted-foreground/50 line-through"
                      )}>
                        {feature.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 neu-button"
                  onClick={() => handleOpenEdit(plan)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="neu-button hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                  onClick={() => handleOpenDelete(plan)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl neu-raised border-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {selectedPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              {selectedPlan ? 'Atualize as informações do plano' : 'Configure as informações e funcionalidades do novo plano'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Plano</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Básico, Profissional"
                  className="neu-pressed border-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Valor Mensal (R$)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="neu-pressed border-0"
                />
              </div>
            </div>
            
            {/* Limits */}
            <div className="module-card">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Limites do Plano
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="users" className="text-sm">Usuários</Label>
                  <Input
                    id="users"
                    type="number"
                    value={formData.users}
                    onChange={(e) => setFormData({ ...formData, users: parseInt(e.target.value) || 1 })}
                    className="neu-pressed border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="connections" className="text-sm">Conexões WhatsApp</Label>
                  <Input
                    id="connections"
                    type="number"
                    value={formData.connections}
                    onChange={(e) => setFormData({ ...formData, connections: parseInt(e.target.value) || 1 })}
                    className="neu-pressed border-0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="queues" className="text-sm">Filas de Atendimento</Label>
                  <Input
                    id="queues"
                    type="number"
                    value={formData.queues}
                    onChange={(e) => setFormData({ ...formData, queues: parseInt(e.target.value) || 1 })}
                    className="neu-pressed border-0"
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="module-card">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-4 w-4 text-secondary" />
                Funcionalidades Disponíveis
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {features.map(feature => (
                  <div 
                    key={feature.key}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-xl transition-all",
                      formData[feature.key as keyof PlanFormData] 
                        ? "neu-pressed" 
                        : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                        formData[feature.key as keyof PlanFormData]
                          ? "gradient-teal text-white"
                          : "bg-muted text-muted-foreground"
                      )}>
                        <feature.icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={formData[feature.key as keyof PlanFormData] as boolean}
                      onCheckedChange={(checked) => setFormData({ ...formData, [feature.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="neu-button">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={saving || !formData.name}
              className="gradient-coral text-white border-0"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedPlan ? 'Salvar Alterações' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="neu-raised border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano <strong>"{selectedPlan?.name}"</strong>? 
              Esta ação não pode ser desfeita e pode afetar empresas que utilizam este plano.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="neu-button">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir Plano
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
