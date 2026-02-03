import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Ticket, Percent, Calendar, Copy, Check, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { PageHeader, EmptyState, SearchInput, StatsCard, DataCard, DataCardContent, PremiumDialog, PremiumFormField, PremiumTextarea, PremiumSelect, PremiumToggle } from '@/components/gestao/ui';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// Mock data for demonstration
const mockCoupons = [
  {
    id: '1',
    code: 'BEMVINDO50',
    type: 'percentage' as const,
    value: 50,
    description: 'Desconto de boas-vindas para novos alunos',
    usageLimit: 100,
    usageCount: 45,
    expiresAt: '2025-02-28',
    isActive: true,
  },
  {
    id: '2',
    code: 'TRIMESTRAL',
    type: 'fixed' as const,
    value: 100,
    description: 'R$100 off no plano trimestral',
    usageLimit: 50,
    usageCount: 50,
    expiresAt: '2025-01-31',
    isActive: false,
  },
  {
    id: '3',
    code: 'INDICA20',
    type: 'percentage' as const,
    value: 20,
    description: 'Desconto por indicação de amigo',
    usageLimit: null,
    usageCount: 12,
    expiresAt: null,
    isActive: true,
  },
];

export function CouponsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [coupons, setCoupons] = useState(mockCoupons);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage' as 'percentage' | 'fixed',
    value: '',
    description: '',
    usageLimit: '',
    expiresAt: '',
    isActive: true,
  });

  const handleOpenDialog = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: '',
      description: '',
      usageLimit: '',
      expiresAt: '',
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code.trim() || !formData.value) {
      toast.error('Código e valor são obrigatórios');
      return;
    }
    const newCoupon = {
      id: Date.now().toString(),
      code: formData.code.toUpperCase(),
      type: formData.type,
      value: Number(formData.value),
      description: formData.description,
      usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
      usageCount: 0,
      expiresAt: formData.expiresAt || null,
      isActive: formData.isActive,
    };
    setCoupons(prev => [...prev, newCoupon]);
    setIsDialogOpen(false);
    toast.success('Cupom criado com sucesso!');
  };

  const filteredCoupons = coupons.filter(coupon =>
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCoupons = coupons.filter(c => c.isActive).length;
  const totalUsage = coupons.reduce((acc, c) => acc + c.usageCount, 0);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatValue = (coupon: typeof coupons[0]) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}%`;
    }
    return `R$ ${coupon.value}`;
  };

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Cupons de Desconto"
        description="Gerencie cupons promocionais para seus clientes"
        icon={<Ticket className="h-6 w-6" />}
        actions={
          <Button onClick={handleOpenDialog} className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
            <Plus className="h-4 w-4" />
            Novo Cupom
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<Ticket className="h-5 w-5" />}
          value={coupons.length}
          label="Total de cupons"
          color="primary"
        />
        <StatsCard
          icon={<Check className="h-5 w-5" />}
          value={activeCoupons}
          label="Cupons ativos"
          color="success"
        />
        <StatsCard
          icon={<Percent className="h-5 w-5" />}
          value={totalUsage}
          label="Usos registrados"
          color="info"
        />
      </div>

      <div className="mb-6">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar cupons..."
          className="max-w-sm"
        />
      </div>

      {filteredCoupons.length === 0 ? (
        <EmptyState
          icon={<Ticket className="h-10 w-10" />}
          title="Nenhum cupom cadastrado"
          description="Crie cupons de desconto para atrair e fidelizar clientes."
          action={
            <Button onClick={handleOpenDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Cupom
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoupons.map((coupon, index) => (
            <DataCard 
              key={coupon.id}
              className="animate-fade-up"
              style={{ animationDelay: `${index * 50}ms` } as React.CSSProperties}
            >
              <DataCardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      {coupon.type === 'percentage' ? (
                        <Percent className="h-5 w-5 text-primary" />
                      ) : (
                        <Ticket className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(coupon.code, coupon.id)}
                          className="flex items-center gap-1.5 font-mono font-semibold text-sm bg-muted/50 px-2 py-1 rounded-lg hover:bg-muted transition-colors"
                        >
                          {coupon.code}
                          {copiedId === coupon.id ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <Badge 
                        variant={coupon.isActive ? 'default' : 'secondary'} 
                        className="text-xs mt-1.5"
                      >
                        {coupon.isActive ? 'Ativo' : 'Inativo'}
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-sm">Desconto</span>
                    <span className="font-semibold text-lg">{formatValue(coupon)}</span>
                  </div>
                  {coupon.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {coupon.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50 text-sm">
                  <div className="text-muted-foreground">
                    {coupon.usageCount}/{coupon.usageLimit || '∞'} usos
                  </div>
                  {coupon.expiresAt && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(coupon.expiresAt).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>

                {/* Usage progress bar */}
                {coupon.usageLimit && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min((coupon.usageCount / coupon.usageLimit) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </DataCardContent>
            </DataCard>
          ))}
        </div>
      )}

      <PremiumDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title="Novo Cupom"
        subtitle="Crie um cupom de desconto para seus clientes"
        icon={<Ticket className="h-5 w-5" />}
        onSubmit={handleSave}
        submitLabel="Criar Cupom"
      >
        <div className="space-y-6">
          <PremiumFormField
            label="Código do Cupom"
            required
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="Ex: DESCONTO20"
          />
          <div className="grid grid-cols-2 gap-4">
            <PremiumSelect
              label="Tipo de Desconto"
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as 'percentage' | 'fixed' }))}
              options={[
                { value: 'percentage', label: 'Porcentagem (%)' },
                { value: 'fixed', label: 'Valor Fixo (R$)' },
              ]}
            />
            <PremiumFormField
              label="Valor"
              required
              type="number"
              value={formData.value}
              onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
              placeholder={formData.type === 'percentage' ? 'Ex: 20' : 'Ex: 50'}
            />
          </div>
          <PremiumTextarea
            label="Descrição"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva o cupom..."
            rows={2}
          />
          <div className="grid grid-cols-2 gap-4">
            <PremiumFormField
              label="Limite de Uso"
              type="number"
              value={formData.usageLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
              placeholder="Ilimitado"
            />
            <PremiumFormField
              label="Data de Expiração"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            />
          </div>
          <PremiumToggle
            label="Cupom Ativo"
            description="Ative para permitir o uso deste cupom"
            checked={formData.isActive}
            onChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
          />
        </div>
      </PremiumDialog>
    </div>
  );
}
