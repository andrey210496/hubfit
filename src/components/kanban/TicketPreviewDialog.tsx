import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, ExternalLink, Phone, Clock, User } from 'lucide-react';
import { KanbanTicket } from '@/hooks/useKanbanTickets';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Message {
  id: string;
  body: string;
  from_me: boolean | null;
  created_at: string | null;
  media_type: string | null;
}

interface TicketPreviewDialogProps {
  ticket: KanbanTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenInTickets: (ticket: KanbanTicket) => void;
}

export function TicketPreviewDialog({ ticket, open, onOpenChange, onOpenInTickets }: TicketPreviewDialogProps) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ticket && open && profile?.company_id) {
      fetchMessages();
    }
  }, [ticket, open, profile?.company_id]);

  const fetchMessages = async () => {
    if (!ticket || !profile?.company_id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, from_me, created_at, media_type')
        .eq('ticket_id', ticket.id)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open':
        return 'Aberto';
      case 'pending':
        return 'Pendente';
      case 'closed':
        return 'Fechado';
      default:
        return status;
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={ticket.contact?.profile_pic_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {ticket.contact?.name ? getInitials(ticket.contact.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{ticket.contact?.name || 'Sem nome'}</p>
              <p className="text-sm text-muted-foreground font-normal">{ticket.contact?.number}</p>
            </div>
            <Badge className={`${getStatusColor(ticket.status)} text-white`}>
              {getStatusLabel(ticket.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Ticket Info */}
        <div className="flex flex-wrap gap-2 py-2 border-b">
          {ticket.queue && (
            <Badge
              variant="outline"
              style={{ borderColor: ticket.queue.color, color: ticket.queue.color }}
            >
              {ticket.queue.name}
            </Badge>
          )}
          {ticket.user && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {ticket.user.name}
            </Badge>
          )}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(ticket.updated_at)}
          </Badge>
        </div>

        {/* Messages Preview */}
        <ScrollArea className="flex-1 min-h-0 max-h-[300px]">
          <div className="space-y-2 p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Nenhuma mensagem encontrada
              </div>
            ) : (
              messages.reverse().map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.from_me
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.media_type && msg.media_type !== 'chat' ? (
                      <span className="italic text-xs">
                        [{msg.media_type === 'audio' ? '🎙️ Áudio' : `📎 ${msg.media_type}`}]
                      </span>
                    ) : null}
                    <p className="break-words">{msg.body}</p>
                    <p className="text-[10px] opacity-70 text-right mt-1">
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              onOpenInTickets(ticket);
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em Atendimentos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}