import { useState } from 'react';
import { useQueues, Queue, QueueFormData } from '@/hooks/useQueues';
import { QueueModal } from './QueueModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Edit, Trash2, Building2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QueuesPage() {
  const { queues, loading, createQueue, updateQueue, deleteQueue } = useQueues();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState<Queue | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleOpenModal = (queue?: Queue) => {
    setSelectedQueue(queue || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQueue(null);
  };

  const handleSave = async (data: QueueFormData) => {
    if (selectedQueue) {
      return updateQueue(selectedQueue.id, data);
    } else {
      return createQueue(data);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmId) {
      await deleteQueue(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Filas de Atendimento
            </CardTitle>
            <CardDescription>
              Gerencie as filas de atendimento do sistema
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenModal()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Fila
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center">Cor</TableHead>
                  <TableHead className="text-center">Ordem</TableHead>
                  <TableHead>Mensagem de Saudação</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : queues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Building2 className="h-8 w-8" />
                        <p>Nenhuma fila cadastrada</p>
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeira fila
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  queues.map((queue, index) => (
                    <TableRow key={queue.id}>
                      <TableCell className="text-center font-mono text-sm">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{queue.name}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className="inline-block w-16 h-5 rounded"
                            style={{ backgroundColor: queue.color }}
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {queue.order_queue ?? '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <span className="line-clamp-1 text-muted-foreground text-sm">
                          {queue.greeting_message || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenModal(queue)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(queue.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <QueueModal
        open={isModalOpen}
        onClose={handleCloseModal}
        queue={selectedQueue}
        onSave={handleSave}
      />

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fila</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta fila? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
