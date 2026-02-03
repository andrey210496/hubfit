import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TransferTicketModalProps {
  open: boolean;
  onClose: () => void;
  ticketId: string;
  onTransferred: () => void;
}

interface User {
  id: string;
  name: string;
  user_id: string;
}

interface Queue {
  id: string;
  name: string;
  color: string;
}

export function TransferTicketModal({ open, onClose, ticketId, onTransferred }: TransferTicketModalProps) {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    if (open && profile?.company_id) {
      fetchData();
    }
  }, [open, profile?.company_id]);

  const fetchData = async () => {
    setFetchingData(true);
    try {
      const [usersRes, queuesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, user_id')
          .eq('company_id', profile?.company_id)
          .order('name'),
        supabase
          .from('queues')
          .select('id, name, color')
          .eq('company_id', profile?.company_id)
          .order('name'),
      ]);

      if (usersRes.data) setUsers(usersRes.data);
      if (queuesRes.data) setQueues(queuesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedUserId && !selectedQueueId) return;

    setLoading(true);
    try {
      const updateData: Record<string, any> = {};
      
      if (selectedUserId) {
        updateData.user_id = selectedUserId;
      }
      if (selectedQueueId) {
        updateData.queue_id = selectedQueueId;
      }

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) throw error;
      
      onTransferred();
      onClose();
    } catch (error) {
      console.error('Erro ao transferir:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUserId('');
    setSelectedQueueId('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Transferir Atendimento</DialogTitle>
        </DialogHeader>

        {fetchingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Transferir para usuário</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter(u => u.user_id !== profile?.user_id)
                    .map((user) => (
                      <SelectItem key={user.user_id} value={user.user_id}>
                        {user.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transferir para fila</Label>
              <Select value={selectedQueueId} onValueChange={setSelectedQueueId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: queue.color }} 
                        />
                        {queue.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleTransfer} 
            disabled={loading || (!selectedUserId && !selectedQueueId)}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
