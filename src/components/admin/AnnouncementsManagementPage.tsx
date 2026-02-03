import { useState } from 'react';
import { useAnnouncements, Announcement, AnnouncementFormData } from '@/hooks/useAnnouncements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Megaphone, 
  Loader2,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState as useStateReact } from 'react';

interface Company {
  id: string;
  name: string;
}

export default function AnnouncementsManagementPage() {
  const { profile } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const { announcements, loading, createAnnouncement, updateAnnouncement, deleteAnnouncement, toggleStatus, fetchAnnouncements } = useAnnouncements(selectedCompanyId || undefined);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<AnnouncementFormData>({
    title: '',
    text: '',
    priority: 3,
    status: true,
    media_path: null,
    media_name: null,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch companies for super admin
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setCompanies(data);
        if (data.length > 0 && !selectedCompanyId) {
          setSelectedCompanyId(data[0].id);
        }
      }
    };

    fetchCompanies();
  }, []);

  // Refetch when company changes
  useEffect(() => {
    if (selectedCompanyId) {
      fetchAnnouncements();
    }
  }, [selectedCompanyId, fetchAnnouncements]);

  const filteredAnnouncements = announcements.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      text: '',
      priority: 3,
      status: true,
      media_path: null,
      media_name: null,
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      text: announcement.text,
      priority: announcement.priority || 3,
      status: announcement.status ?? true,
      media_path: announcement.media_path,
      media_name: announcement.media_name,
    });
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.text.trim()) return;
    if (!selectedCompanyId) return;
    
    setIsSaving(true);
    
    let success = false;
    if (editingAnnouncement) {
      success = await updateAnnouncement(editingAnnouncement.id, formData);
    } else {
      success = await createAnnouncement(formData, selectedCompanyId);
    }
    
    setIsSaving(false);
    
    if (success) {
      setIsDialogOpen(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    await deleteAnnouncement(deletingId);
    setIsDeleteDialogOpen(false);
    setDeletingId(null);
  };

  const getPriorityBadge = (priority: number | null) => {
    switch (priority) {
      case 1:
        return <Badge variant="destructive">Alta</Badge>;
      case 2:
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Média</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de Anúncios</h1>
          <p className="text-muted-foreground">
            Gerencie os anúncios exibidos na tela de login
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Anúncio
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Anúncios
          </CardTitle>
          <CardDescription>
            Anúncios ativos são exibidos na tela de login para todos os usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar anúncios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione uma empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium text-lg mb-1">Nenhum anúncio encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm ? 'Tente ajustar sua busca' : 'Crie seu primeiro anúncio para exibir na tela de login'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {announcement.text}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{getPriorityBadge(announcement.priority)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={announcement.status ?? false}
                          onCheckedChange={() => toggleStatus(announcement.id, announcement.status ?? false)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {announcement.status ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Eye className="h-3 w-3" /> Ativo
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3" /> Inativo
                            </span>
                          )}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {announcement.created_at && format(new Date(announcement.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(announcement)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDelete(announcement.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Editar Anúncio' : 'Novo Anúncio'}
            </DialogTitle>
            <DialogDescription>
              {editingAnnouncement 
                ? 'Atualize as informações do anúncio'
                : 'Preencha as informações para criar um novo anúncio'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título do anúncio"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="text">Conteúdo</Label>
              <Textarea
                id="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Conteúdo do anúncio"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade</Label>
                <Select 
                  value={String(formData.priority)} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Alta</SelectItem>
                    <SelectItem value="2">Média</SelectItem>
                    <SelectItem value="3">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={formData.status}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, status: checked }))}
                  />
                  <span className="text-sm">
                    {formData.status ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="media_path">URL da Imagem (opcional)</Label>
              <Input
                id="media_path"
                value={formData.media_path || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, media_path: e.target.value || null }))}
                placeholder="https://exemplo.com/imagem.jpg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || !formData.title.trim() || !formData.text.trim()}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                editingAnnouncement ? 'Atualizar' : 'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O anúncio será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
