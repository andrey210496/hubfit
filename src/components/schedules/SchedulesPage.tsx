import { useState } from 'react';
import { useSchedules, Schedule } from '@/hooks/useSchedules';
import { ScheduleModal } from './ScheduleModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Edit2, Trash2, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isPast, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

export function SchedulesPage() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule, fetchSchedules } = useSchedules();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchSchedules(value);
  };

  const handleDeleteSchedule = async () => {
    if (deletingSchedule) {
      await deleteSchedule(deletingSchedule.id);
      setDeletingSchedule(null);
    }
  };

  const getStatusBadge = (schedule: Schedule) => {
    if (schedule.sent_at) {
      return (
        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Enviado
        </Badge>
      );
    }
    
    if (schedule.status === 'error') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Erro
        </Badge>
      );
    }

    const sendAt = parseISO(schedule.send_at);
    if (isPast(sendAt)) {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Processando
        </Badge>
      );
    }

    return (
      <Badge variant="outline">
        <Calendar className="h-3 w-3 mr-1" />
        Agendado
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agendamentos de mensagens ({schedules.length})</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar agendamentos..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button onClick={handleOpenModal}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contato</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="text-center">Data/Hora</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 mx-auto" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 mx-auto" /></TableCell>
                </TableRow>
              ))
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum agendamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="font-medium">
                    {schedule.contact?.name || 'Contato removido'}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {schedule.body}
                  </TableCell>
                  <TableCell className="text-center">
                    {format(parseISO(schedule.send_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(schedule)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleEditSchedule(schedule)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!schedule.sent_at && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setDeletingSchedule(schedule)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ScheduleModal
        open={isModalOpen}
        onClose={handleCloseModal}
        schedule={editingSchedule}
        onSave={createSchedule}
        onUpdate={updateSchedule}
      />

      <AlertDialog open={!!deletingSchedule} onOpenChange={() => setDeletingSchedule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchedule}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
