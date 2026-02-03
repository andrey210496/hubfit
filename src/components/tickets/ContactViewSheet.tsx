import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Users, Mail, Phone, User, MessageSquare, Edit, Copy, Check, Hash, Ticket as TicketIcon, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Ticket } from './TicketList';

interface ContactViewSheetProps {
  open: boolean;
  onClose: () => void;
  ticket: Ticket | null;
  onEdit?: () => void;
}

function ContactIdField({ contactId }: { contactId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contactId);
    setCopied(true);
    toast.success('ID do contato copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <Hash className="h-5 w-5 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">ID do Contato (API)</p>
        <p className="text-sm font-mono text-primary truncate">{contactId}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="shrink-0 h-8 w-8"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function TicketIdField({ ticketId }: { ticketId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(ticketId);
    setCopied(true);
    toast.success('ID do ticket copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
      <TicketIcon className="h-5 w-5 text-emerald-500" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">ID do Ticket (API)</p>
        <p className="text-sm font-mono text-emerald-600 dark:text-emerald-400 truncate">{ticketId}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="shrink-0 h-8 w-8"
      >
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function ContactViewSheet({ open, onClose, ticket, onEdit }: ContactViewSheetProps) {
  const navigate = useNavigate();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);

  useEffect(() => {
    if (ticket?.contact.id && open) {
      checkMemberLink(ticket.contact.id);
    }
  }, [ticket?.contact.id, open]);

  const checkMemberLink = async (contactId: string) => {
    setLoadingMember(true);
    try {
      const { data } = await supabase
        .from('members')
        .select('id')
        .eq('contact_id', contactId)
        .limit(1)
        .maybeSingle();
      
      setMemberId(data?.id || null);
    } catch (error) {
      console.error('Error checking member link:', error);
    } finally {
      setLoadingMember(false);
    }
  };

  if (!ticket) return null;

  const contact = ticket.contact;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleOpenMemberProfile = () => {
    if (memberId) {
      navigate(`/gestao/fitness/clientes/perfil?id=${memberId}`);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Dados do Contato</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage src={contact.profile_pic_url} />
              <AvatarFallback className="bg-muted text-muted-foreground text-2xl">
                {ticket.is_group ? <Users className="h-10 w-10" /> : getInitials(contact.name)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-semibold text-foreground">{contact.name}</h2>
            {ticket.is_group && (
              <Badge variant="secondary" className="mt-2">
                GRUPO
              </Badge>
            )}
          </div>

          <Separator />

          {/* Contact Info */}
          <div className="space-y-4">
            {/* Contact ID with copy button */}
            <ContactIdField contactId={contact.id} />

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Número</p>
                <p className="text-sm font-medium">{contact.number}</p>
              </div>
            </div>

            {/* Only show email for contacts that have it */}
            {(contact as any).email && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{String((contact as any).email)}</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Ticket Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Atendimento</h3>
            
            {/* Ticket ID with copy button */}
            <TicketIdField ticketId={ticket.id} />
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant={
                  ticket.status === 'open' ? 'default' : 
                  ticket.status === 'pending' ? 'secondary' : 'outline'
                }>
                  {ticket.status === 'open' ? 'Aberto' : 
                   ticket.status === 'pending' ? 'Pendente' : 'Resolvido'}
                </Badge>
              </div>
            </div>

            {ticket.queue && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fila</p>
                  <Badge 
                    variant="outline"
                    style={{ borderColor: ticket.queue.color, color: ticket.queue.color }}
                  >
                    {ticket.queue.name}
                  </Badge>
                </div>
              </div>
            )}

            {ticket.unread_messages > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Mensagens não lidas</p>
                  <Badge variant="default">{ticket.unread_messages}</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <Separator />
          <div className="space-y-2">
            {memberId && (
              <Button 
                variant="default" 
                className="w-full gap-2"
                onClick={handleOpenMemberProfile}
              >
                <Dumbbell className="h-4 w-4" />
                Ver Perfil do Aluno
              </Button>
            )}
            {onEdit && (
              <Button variant="outline" className="w-full" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar Contato
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
