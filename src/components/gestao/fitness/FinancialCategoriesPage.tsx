import { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FolderTree, Edit, Trash2, TrendingUp, TrendingDown, Check, Layers } from "lucide-react";
import { useFinancialCategories, type FinancialCategory, type CreateFinancialCategoryData } from '@/hooks/useFinancialCategories';
import { cn } from '@/lib/utils';
import { PageHeader, EmptyState, StatsCard, DataCard, DataCardContent, PremiumDialog, PremiumFormField, PremiumColorPicker, PremiumSelect } from '@/components/gestao/ui';
import { FileText } from 'lucide-react';

const colorOptions = [
  { value: '#22C55E', label: 'Verde' },
  { value: '#3B82F6', label: 'Azul' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#06B6D4', label: 'Ciano' },
  { value: '#6B7280', label: 'Cinza' },
];

export function FinancialCategoriesPage() {
  const { categories, incomeCategories, expenseCategories, isLoading, createCategory, updateCategory, deleteCategory } = useFinancialCategories();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinancialCategory | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [formData, setFormData] = useState<CreateFinancialCategoryData>({
    name: '',
    type: 'expense',
    color: '#6B7280',
    parent_id: null,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab,
      color: '#6B7280',
      parent_id: null,
    });
    setEditingCategory(null);
  };

  const handleOpenDialog = (category?: FinancialCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        type: category.type,
        color: category.color || '#6B7280',
        parent_id: category.parent_id,
      });
    } else {
      resetForm();
      setFormData(prev => ({ ...prev, type: activeTab }));
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingCategory) {
      await updateCategory.mutateAsync({
        id: editingCategory.id,
        name: formData.name,
        color: formData.color,
        parent_id: formData.parent_id,
      });
    } else {
      await createCategory.mutateAsync(formData);
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const renderCategoryItem = (category: FinancialCategory, isSubcategory = false, index = 0) => {
    const subcategories = categories.filter(c => c.parent_id === category.id);
    
    return (
      <div key={category.id}>
        <div 
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border transition-all duration-200 group animate-fade-up",
            "hover:border-border hover:shadow-md hover:-translate-y-0.5",
            isSubcategory && "ml-8 border-l-2",
            !category.is_active && "opacity-50"
          )}
          style={{ 
            borderLeftColor: isSubcategory ? category.color || undefined : undefined,
            animationDelay: `${index * 30}ms`
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${category.color || '#6B7280'}20` }}
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: category.color || '#6B7280' }}
              />
            </div>
            <div>
              <span className="font-medium">{category.name}</span>
              {subcategories.length > 0 && (
                <span className="text-xs text-muted-foreground ml-2">
                  ({subcategories.length} subcategoria{subcategories.length > 1 ? 's' : ''})
                </span>
              )}
            </div>
            {!category.is_active && (
              <Badge variant="secondary" className="text-xs rounded-lg">Inativa</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => handleOpenDialog(category)}
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
                  <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {subcategories.length > 0 
                      ? `Esta categoria possui ${subcategories.length} subcategoria(s). Elas serão desvinculadas.`
                      : 'Esta ação não pode ser desfeita.'
                    }
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCategory.mutate(category.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <div className="space-y-2 mt-2">
          {subcategories.map((sub, subIndex) => renderCategoryItem(sub, true, subIndex))}
        </div>
      </div>
    );
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
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const rootExpenseCategories = expenseCategories.filter(c => !c.parent_id);
  const rootIncomeCategories = incomeCategories.filter(c => !c.parent_id);

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Categorias Financeiras"
        description="Organize suas receitas e despesas por categoria"
        icon={<FolderTree className="h-6 w-6" />}
        actions={
          <Button 
            className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
            onClick={() => handleOpenDialog()}
          >
            <Plus className="h-4 w-4" />
            Nova Categoria
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<Layers className="h-5 w-5" />}
          value={categories.length}
          label="Total de categorias"
          color="primary"
        />
        <StatsCard
          icon={<TrendingDown className="h-5 w-5" />}
          value={expenseCategories.length}
          label="Categorias de despesa"
          color="destructive"
        />
        <StatsCard
          icon={<TrendingUp className="h-5 w-5" />}
          value={incomeCategories.length}
          label="Categorias de receita"
          color="success"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'expense' | 'income')}>
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-xl p-1 bg-muted/50">
          <TabsTrigger value="expense" className="gap-2 rounded-lg data-[state=active]:shadow-md">
            <TrendingDown className="h-4 w-4" />
            Despesas ({expenseCategories.length})
          </TabsTrigger>
          <TabsTrigger value="income" className="gap-2 rounded-lg data-[state=active]:shadow-md">
            <TrendingUp className="h-4 w-4" />
            Receitas ({incomeCategories.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="mt-6">
          <DataCard hover={false}>
            <DataCardContent className="p-0">
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-destructive/10">
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Categorias de Despesa</h3>
                    <p className="text-sm text-muted-foreground">Organize suas saídas financeiras</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-2">
                {rootExpenseCategories.length === 0 ? (
                  <EmptyState
                    icon={<FolderTree className="h-10 w-10" />}
                    title="Nenhuma categoria de despesa"
                    description="Crie categorias para organizar suas despesas"
                    action={
                      <Button 
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, type: 'expense' }));
                          handleOpenDialog();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Criar primeira categoria
                      </Button>
                    }
                  />
                ) : (
                  rootExpenseCategories.map((cat, index) => renderCategoryItem(cat, false, index))
                )}
              </div>
            </DataCardContent>
          </DataCard>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <DataCard hover={false}>
            <DataCardContent className="p-0">
              <div className="p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Categorias de Receita</h3>
                    <p className="text-sm text-muted-foreground">Organize suas entradas financeiras</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-2">
                {rootIncomeCategories.length === 0 ? (
                  <EmptyState
                    icon={<FolderTree className="h-10 w-10" />}
                    title="Nenhuma categoria de receita"
                    description="Crie categorias para organizar suas receitas"
                    action={
                      <Button 
                        variant="outline"
                        className="gap-2 rounded-xl"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, type: 'income' }));
                          handleOpenDialog();
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Criar primeira categoria
                      </Button>
                    }
                  />
                ) : (
                  rootIncomeCategories.map((cat, index) => renderCategoryItem(cat, false, index))
                )}
              </div>
            </DataCardContent>
          </DataCard>
        </TabsContent>
      </Tabs>

      {/* Dialog for creating/editing categories */}
      <PremiumDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        subtitle="Configure os detalhes da categoria financeira"
        icon={<FolderTree className="h-5 w-5" />}
        onSubmit={handleSubmit}
        submitLabel={editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
        submitDisabled={!formData.name.trim()}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
        size="md"
      >
        <PremiumFormField
          label="Nome *"
          icon={FileText}
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ex: Aluguel, Salários, Vendas..."
        />

        {!editingCategory && (
          <PremiumSelect
            label="Tipo *"
            icon={Layers}
            value={formData.type}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, type: value as 'income' | 'expense', parent_id: null }))
            }
            options={[
              { value: 'expense', label: 'Despesa', icon: <TrendingDown className="h-4 w-4 text-destructive" /> },
              { value: 'income', label: 'Receita', icon: <TrendingUp className="h-4 w-4 text-green-500" /> },
            ]}
          />
        )}

        <PremiumColorPicker
          label="Cor"
          value={formData.color || '#6B7280'}
          onChange={(color) => setFormData(prev => ({ ...prev, color }))}
          colors={colorOptions.map(c => c.value)}
        />

        <PremiumSelect
          label="Categoria Pai (opcional)"
          icon={FolderTree}
          value={formData.parent_id || 'none'}
          onValueChange={(value) => 
            setFormData(prev => ({ ...prev, parent_id: value === 'none' ? null : value }))
          }
          options={[
            { value: 'none', label: 'Nenhuma (categoria raiz)' },
            ...categories
              .filter(c => c.type === formData.type && !c.parent_id && c.id !== editingCategory?.id)
              .map(cat => ({
                value: cat.id,
                label: cat.name,
                icon: <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color || '#6B7280' }} />
              }))
          ]}
        />
      </PremiumDialog>
    </div>
  );
}
