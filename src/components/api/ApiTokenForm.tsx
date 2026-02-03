import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Loader2 } from 'lucide-react';
import { useApiTokens, ApiToken, API_PERMISSIONS } from '@/hooks/useApiTokens';
import { useToast } from '@/hooks/use-toast';

interface ApiTokenFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editToken?: ApiToken | null;
}

export function ApiTokenForm({ open, onOpenChange, editToken }: ApiTokenFormProps) {
  const { createToken, updateToken } = useApiTokens();
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (editToken) {
      setName(editToken.name);
      setPermissions(editToken.permissions);
      setExpiresAt(editToken.expires_at ? editToken.expires_at.split('T')[0] : '');
    } else {
      setName('');
      setPermissions([]);
      setExpiresAt('');
    }
    setCreatedToken(null);
  }, [editToken, open]);

  const handleTogglePermission = (permission: string) => {
    setPermissions(prev =>
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSelectAll = () => {
    if (permissions.length === API_PERMISSIONS.length) {
      setPermissions([]);
    } else {
      setPermissions(API_PERMISSIONS.map(p => p.value));
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para o token',
        variant: 'destructive',
      });
      return;
    }

    if (permissions.length === 0) {
      toast({
        title: 'Erro',
        description: 'Selecione pelo menos uma permissão',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      if (editToken) {
        await updateToken(editToken.id, {
          name,
          permissions,
          expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        });
        onOpenChange(false);
      } else {
        const token = await createToken(
          name,
          permissions,
          expiresAt ? new Date(expiresAt).toISOString() : undefined
        );
        if (token) {
          setCreatedToken(token.token);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToken = () => {
    if (createdToken) {
      navigator.clipboard.writeText(createdToken);
      toast({
        title: 'Copiado',
        description: 'Token copiado para a área de transferência',
      });
    }
  };

  if (createdToken) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Token Criado com Sucesso!</DialogTitle>
            <DialogDescription>
              Copie o token agora. Por segurança, ele não será exibido novamente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                {createdToken}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopyToken}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editToken ? 'Editar Token' : 'Novo Token de API'}</DialogTitle>
          <DialogDescription>
            {editToken
              ? 'Atualize as configurações do token'
              : 'Crie um novo token para integração com sistemas externos'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Integração ERP"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires">Validade (opcional)</Label>
            <Input
              id="expires"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permissões</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
              >
                {permissions.length === API_PERMISSIONS.length ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {API_PERMISSIONS.map((perm) => (
                <div key={perm.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={perm.value}
                    checked={permissions.includes(perm.value)}
                    onCheckedChange={() => handleTogglePermission(perm.value)}
                  />
                  <label
                    htmlFor={perm.value}
                    className="text-sm cursor-pointer"
                  >
                    {perm.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editToken ? 'Salvar' : 'Criar Token'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
