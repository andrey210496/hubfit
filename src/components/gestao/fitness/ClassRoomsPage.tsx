import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Edit2, Trash2, MapPin, Users } from 'lucide-react';
import { useClassRooms, type CreateClassRoomData } from '@/hooks/useClassRooms';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e',
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
];

export function ClassRoomsPage() {
  const { rooms, isLoading, createRoom, updateRoom, deleteRoom } = useClassRooms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<typeof rooms[0] | null>(null);
  const [formData, setFormData] = useState<CreateClassRoomData>({
    name: '',
    description: '',
    capacity: null,
    color: '#6366f1',
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      capacity: null,
      color: '#6366f1',
      is_active: true,
    });
    setEditingRoom(null);
  };

  const handleOpenDialog = (room?: typeof rooms[0]) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description || '',
        capacity: room.capacity,
        color: room.color,
        is_active: room.is_active,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    if (editingRoom) {
      await updateRoom.mutateAsync({ id: editingRoom.id, ...formData });
    } else {
      await createRoom.mutateAsync(formData);
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Salas e Espaços</h1>
            <p className="text-muted-foreground text-sm">
              Organize aulas simultâneas em diferentes espaços
            </p>
          </div>
        </div>
        <Button 
          onClick={() => handleOpenDialog()} 
          className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
        >
          <Plus className="h-4 w-4" />
          Nova Sala
        </Button>
      </div>

      {rooms.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Nenhuma sala cadastrada</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-md">
              Cadastre salas para organizar aulas que acontecem simultaneamente. 
              Por exemplo: "Sala de Musculação" e "Sala de Cross Training".
            </p>
            <Button onClick={() => handleOpenDialog()} className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" />
              Criar primeira sala
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <Card 
              key={room.id} 
              className={cn(
                "rounded-2xl transition-all hover:shadow-lg cursor-pointer group",
                !room.is_active && "opacity-60"
              )}
              onClick={() => handleOpenDialog(room)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: room.color }}
                    >
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{room.name}</CardTitle>
                      {!room.is_active && (
                        <span className="text-xs text-muted-foreground">Inativo</span>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenDialog(room);
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {room.description && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {room.description}
                  </p>
                )}
                {room.capacity && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{room.capacity} vagas</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingRoom ? 'Editar Sala' : 'Nova Sala'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium">Nome *</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Sala de Musculação"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Descrição</Label>
              <Textarea
                value={formData.description || ''}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição opcional da sala"
                className="mt-1.5 rounded-xl resize-none"
                rows={2}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Capacidade (opcional)</Label>
              <Input
                type="number"
                min="1"
                value={formData.capacity ?? ''}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  capacity: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="Número de vagas"
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-lg transition-all",
                      formData.color === color 
                        ? "ring-2 ring-offset-2 ring-primary scale-110" 
                        : "hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <Label htmlFor="is_active" className="cursor-pointer font-normal">
                Sala ativa
              </Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>

            {editingRoom && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir sala
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir sala?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A sala será removida dos horários associados. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteRoom.mutate(editingRoom.id);
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)} 
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name.trim() || createRoom.isPending || updateRoom.isPending}
                className="rounded-xl"
              >
                {editingRoom ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
