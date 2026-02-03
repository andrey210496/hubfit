import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, MoreHorizontal, Copy, RefreshCw, Trash2, Edit, Loader2 } from 'lucide-react';
import { useApiTokens, ApiToken, API_PERMISSIONS } from '@/hooks/useApiTokens';
import { ApiTokenForm } from './ApiTokenForm';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export function ApiTokensList() {
  const { tokens, loading, updateToken, deleteToken, regenerateToken } = useApiTokens();
  const [showForm, setShowForm] = useState(false);
  const [editingToken, setEditingToken] = useState<ApiToken | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<ApiToken | null>(null);
  const [regeneratedToken, setRegeneratedToken] = useState<string | null>(null);
  const { toast } = useToast();

  const handleToggleActive = async (token: ApiToken) => {
    await updateToken(token.id, { is_active: !token.is_active });
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
      title: 'Copiado',
      description: 'Token copiado para a área de transferência',
    });
  };

  const handleRegenerate = async (token: ApiToken) => {
    const newToken = await regenerateToken(token.id);
    if (newToken) {
      setRegeneratedToken(newToken);
    }
  };

  const handleDelete = async () => {
    if (tokenToDelete) {
      await deleteToken(tokenToDelete.id);
      setDeleteDialogOpen(false);
      setTokenToDelete(null);
    }
  };

  const getPermissionLabels = (permissions: string[]) => {
    if (permissions.includes('*') || permissions.includes('all')) {
      return ['Acesso total'];
    }
    return permissions.map(p => {
      const perm = API_PERMISSIONS.find(ap => ap.value === p);
      return perm?.label || p;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Tokens de API</CardTitle>
            <CardDescription>
              Crie e gerencie tokens para acessar a API externa
            </CardDescription>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Token
          </Button>
        </CardHeader>
        <CardContent>
          {tokens.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum token criado ainda.</p>
              <p className="text-sm">Clique em "Novo Token" para criar seu primeiro token de API.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Último uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell className="font-medium">{token.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded text-xs">
                          {token.token.substring(0, 12)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleCopyToken(token.token)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getPermissionLabels(token.permissions).slice(0, 2).map((label, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                        {token.permissions.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{token.permissions.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {token.last_used_at
                        ? format(new Date(token.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : 'Nunca'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={token.is_active}
                        onCheckedChange={() => handleToggleActive(token)}
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleCopyToken(token.token)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar token
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setEditingToken(token);
                            setShowForm(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRegenerate(token)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerar token
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setTokenToDelete(token);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ApiTokenForm
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) setEditingToken(null);
        }}
        editToken={editingToken}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir token?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todas as integrações que usam este token deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!regeneratedToken} onOpenChange={() => setRegeneratedToken(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Novo Token Gerado</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Copie o novo token agora. Ele não será exibido novamente.</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm break-all">
                  {regeneratedToken}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (regeneratedToken) {
                      handleCopyToken(regeneratedToken);
                    }
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setRegeneratedToken(null)}>
              Entendi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
