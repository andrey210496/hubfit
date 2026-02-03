import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addHours } from 'date-fns';

interface ScheduleMessageModalProps {
  open: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
}

export function ScheduleMessageModal({ open, onClose, contactId, contactName }: ScheduleMessageModalProps) {
  const { profile } = useAuth();
  const [body, setBody] = useState('');
  const [sendAt, setSendAt] = useState(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim() || !sendAt || !profile?.company_id || !profile?.user_id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('schedules').insert({
        body: body.trim(),
        contact_id: contactId,
        send_at: new Date(sendAt).toISOString(),
        company_id: profile.company_id,
        user_id: profile.user_id,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Mensagem agendada com sucesso');
      handleClose();
    } catch (error: any) {
      console.error('Erro ao agendar mensagem:', error);
      toast.error('Erro ao agendar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setBody('');
    setSendAt(format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Agendar Mensagem</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Contato</Label>
            <Input value={contactName} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Digite a mensagem a ser enviada..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sendAt">Data e Hora do Envio *</Label>
            <Input
              id="sendAt"
              type="datetime-local"
              value={sendAt}
              onChange={(e) => setSendAt(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !body.trim() || !sendAt}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
