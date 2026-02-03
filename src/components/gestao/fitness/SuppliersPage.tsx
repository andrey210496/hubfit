import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Truck, Building2, Phone, Mail, MapPin, MoreVertical, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { PageHeader, EmptyState, SearchInput, StatsCard, DataCard, DataCardContent, PremiumDialog, PremiumFormField, PremiumSelect, PremiumToggle } from '@/components/gestao/ui';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Mock data for demonstration
const mockSuppliers = [
  {
    id: '1',
    name: 'FitEquip Brasil',
    category: 'Equipamentos',
    contact: 'Carlos Santos',
    phone: '(11) 98765-4321',
    email: 'vendas@fitequip.com.br',
    city: 'São Paulo - SP',
    isActive: true,
  },
  {
    id: '2',
    name: 'SupleMax',
    category: 'Suplementos',
    contact: 'Maria Oliveira',
    phone: '(21) 99876-5432',
    email: 'comercial@suplemax.com.br',
    city: 'Rio de Janeiro - RJ',
    isActive: true,
  },
  {
    id: '3',
    name: 'WearFit Uniformes',
    category: 'Vestuário',
    contact: 'João Pereira',
    phone: '(31) 97654-3210',
    email: 'contato@wearfit.com.br',
    city: 'Belo Horizonte - MG',
    isActive: false,
  },
];

const categoryColors: Record<string, string> = {
  'Equipamentos': '#7C3AED',
  'Suplementos': '#10B981',
  'Vestuário': '#3B82F6',
  'Limpeza': '#F59E0B',
  'Outros': '#6B7280',
};

export function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [suppliers, setSuppliers] = useState(mockSuppliers);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Equipamentos',
    contact: '',
    phone: '',
    email: '',
    city: '',
    isActive: true,
  });

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      category: 'Equipamentos',
      contact: '',
      phone: '',
      email: '',
      city: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    const newSupplier = {
      id: Date.now().toString(),
      ...formData,
    };
    setSuppliers(prev => [...prev, newSupplier]);
    setIsDialogOpen(false);
    toast.success('Fornecedor criado com sucesso!');
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeSuppliers = suppliers.filter(s => s.isActive).length;
  const categories = [...new Set(suppliers.map(s => s.category))].length;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Fornecedores"
        description="Gerencie seus fornecedores e parceiros comerciais"
        icon={<Truck className="h-6 w-6" />}
        actions={
          <Button onClick={handleOpenDialog} className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<Building2 className="h-5 w-5" />}
          value={suppliers.length}
          label="Total de fornecedores"
          color="primary"
        />
        <StatsCard
          icon={<Truck className="h-5 w-5" />}
          value={activeSuppliers}
          label="Fornecedores ativos"
          color="success"
        />
        <StatsCard
          icon={<Building2 className="h-5 w-5" />}
          value={categories}
          label="Categorias"
          color="info"
        />
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar fornecedores..."
          className="max-w-sm"
        />
      </div>

      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<Truck className="h-10 w-10" />}
          title="Nenhum fornecedor cadastrado"
          description="Adicione seus fornecedores para manter controle de parceiros comerciais."
          action={
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Fornecedor
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier, index) => (
            <DataCard 
              key={supplier.id}
              accent={categoryColors[supplier.category] || categoryColors['Outros']}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <DataCardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl">
                      <AvatarFallback 
                        className="rounded-xl text-sm font-medium"
                        style={{ 
                          backgroundColor: `${categoryColors[supplier.category] || categoryColors['Outros']}20`,
                          color: categoryColors[supplier.category] || categoryColors['Outros']
                        }}
                      >
                        {getInitials(supplier.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold">{supplier.name}</h3>
                      <Badge 
                        variant="secondary" 
                        className="text-xs mt-0.5"
                        style={{ 
                          backgroundColor: `${categoryColors[supplier.category] || categoryColors['Outros']}15`,
                          color: categoryColors[supplier.category] || categoryColors['Outros']
                        }}
                      >
                        {supplier.category}
                      </Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 text-sm">
                  {supplier.contact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">{supplier.contact}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <a 
                      href={`tel:${supplier.phone}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      {supplier.phone}
                    </a>
                  )}
                  {supplier.email && (
                    <a 
                      href={`mailto:${supplier.email}`}
                      className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors truncate"
                    >
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{supplier.email}</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{supplier.city}</span>
                  </div>
                  <Badge variant={supplier.isActive ? 'default' : 'secondary'}>
                    {supplier.isActive ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </DataCardContent>
            </DataCard>
          ))}
        </div>
      )}

      <PremiumDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Novo Fornecedor"
        subtitle="Adicione um novo fornecedor ao sistema"
        icon={<Truck className="h-5 w-5" />}
        onSubmit={handleSave}
        submitLabel="Criar Fornecedor"
      >
        <div className="space-y-6">
          <PremiumFormField
            label="Nome da Empresa"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: FitEquip Brasil"
          />
          <PremiumSelect
            label="Categoria"
            value={formData.category}
            onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            options={[
              { value: 'Equipamentos', label: 'Equipamentos' },
              { value: 'Suplementos', label: 'Suplementos' },
              { value: 'Vestuário', label: 'Vestuário' },
              { value: 'Limpeza', label: 'Limpeza' },
              { value: 'Outros', label: 'Outros' },
            ]}
          />
          <PremiumFormField
            label="Nome do Contato"
            value={formData.contact}
            onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
            placeholder="Ex: Carlos Santos"
          />
          <div className="grid grid-cols-2 gap-4">
            <PremiumFormField
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
            <PremiumFormField
              label="E-mail"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="contato@empresa.com"
            />
          </div>
          <PremiumFormField
            label="Cidade"
            value={formData.city}
            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
            placeholder="São Paulo - SP"
          />
          <PremiumToggle
            label="Fornecedor Ativo"
            description="Ative para exibir este fornecedor como disponível"
            checked={formData.isActive}
            onChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </PremiumDialog>
    </div>
  );
}
