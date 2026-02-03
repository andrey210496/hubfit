import { useState } from 'react';
import { Plus, Search, Edit, Trash2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useQuickMessages, QuickMessage } from '@/hooks/useQuickMessages';
import { QuickMessageModal } from './QuickMessageModal';

export function QuickMessagesPage() {
  const {
    quickMessages,
    loading,
    fetchQuickMessages,
    createQuickMessage,
    updateQuickMessage,
    deleteQuickMessage,
  } = useQuickMessages();

  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedQuickMessage, setSelectedQuickMessage] = useState<QuickMessage | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quickMessageToDelete, setQuickMessageToDelete] = useState<QuickMessage | null>(null);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    fetchQuickMessages(value);
  };

  const handleAdd = () => {
    setSelectedQuickMessage(null);
    setModalOpen(true);
  };

  const handleEdit = (quickMessage: QuickMessage) => {
    setSelectedQuickMessage(quickMessage);
    setModalOpen(true);
  };

  const handleDeleteClick = (quickMessage: QuickMessage) => {
    setQuickMessageToDelete(quickMessage);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (quickMessageToDelete) {
      await deleteQuickMessage(quickMessageToDelete.id);
      setDeleteDialogOpen(false);
      setQuickMessageToDelete(null);
    }
  };

  const handleSave = async (data: { shortcut: string; message: string }) => {
    if (selectedQuickMessage) {
      return await updateQuickMessage(selectedQuickMessage.id, data);
    } else {
      return await createQuickMessage(data);
    }
  };

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6" />
          Respostas Rápidas
        </h1>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Resposta Rápida
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por atalho ou mensagem..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">Atalho</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-full max-w-md" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : quickMessages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                  Nenhuma resposta rápida encontrada
                </TableCell>
              </TableRow>
            ) : (
              quickMessages.map((quickMessage) => (
                <TableRow key={quickMessage.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {quickMessage.shortcut}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {truncateMessage(quickMessage.message)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(quickMessage)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(quickMessage)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <QuickMessageModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        quickMessage={selectedQuickMessage}
        onSave={handleSave}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a resposta rápida "{quickMessageToDelete?.shortcut}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
