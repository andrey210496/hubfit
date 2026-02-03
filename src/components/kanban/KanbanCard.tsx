import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, Clock, User, Eye, ExternalLink, GripVertical } from 'lucide-react';
import { KanbanTicket } from '@/hooks/useKanbanTickets';
import { cn } from '@/lib/utils';

interface KanbanCardProps {
  ticket: KanbanTicket;
  onViewConversation?: (ticket: KanbanTicket) => void;
  onOpenInTickets?: (ticket: KanbanTicket) => void;
}

export function KanbanCard({ ticket, onViewConversation, onOpenInTickets }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'agora';
  };

  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onViewConversation?.(ticket);
  };

  const handleOpenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onOpenInTickets?.(ticket);
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-all hover:shadow-md group',
        isDragging && 'opacity-50 shadow-lg rotate-2'
      )}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header with drag handle and actions */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* Drag Handle */}
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 opacity-50 hover:opacity-100 transition-opacity"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarImage src={ticket.contact?.profile_pic_url || undefined} />
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {ticket.contact?.name ? getInitials(ticket.contact.name) : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {ticket.contact?.name || 'Sem nome'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {ticket.contact?.number || ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {ticket.unread_messages && ticket.unread_messages > 0 && (
              <Badge variant="default" className="bg-green-500 text-xs px-1.5">
                {ticket.unread_messages}
              </Badge>
            )}
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleViewClick}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver conversa</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={handleOpenClick}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Abrir em atendimentos</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Last Message */}
        {ticket.last_message && (
          <p className="text-xs text-muted-foreground line-clamp-2 pl-6">
            {ticket.last_message}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pl-6">
          <div className="flex items-center gap-2">
            {ticket.queue && (
              <Badge
                variant="outline"
                className="text-xs px-1.5 py-0"
                style={{ borderColor: ticket.queue.color, color: ticket.queue.color }}
              >
                {ticket.queue.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatTime(ticket.updated_at)}
          </div>
        </div>

        {/* Assigned User */}
        {ticket.user && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t pl-6">
            <User className="h-3 w-3" />
            <span className="truncate">{ticket.user.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
