import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { KanbanCard } from './KanbanCard';
import { KanbanTicket } from '@/hooks/useKanbanTickets';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  tickets: KanbanTicket[];
  color: string;
  icon: React.ReactNode;
  onViewConversation?: (ticket: KanbanTicket) => void;
  onOpenInTickets?: (ticket: KanbanTicket) => void;
}

export function KanbanColumn({ 
  id, 
  title, 
  tickets, 
  color, 
  icon,
  onViewConversation,
  onOpenInTickets,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Card
      className={cn(
        'flex flex-col min-w-[320px] max-w-[350px] transition-colors h-full',
        isOver && 'ring-2 ring-primary bg-primary/5'
      )}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {icon}
            </div>
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className="font-semibold">
            {tickets.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-2 pt-0 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div
            ref={setNodeRef}
            className="space-y-2 p-1 min-h-[200px]"
          >
            <SortableContext
              items={tickets.map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              {tickets.length === 0 ? (
                <div className="flex items-center justify-center h-[100px] text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                  Sem tickets
                </div>
              ) : (
                tickets.map((ticket) => (
                  <KanbanCard 
                    key={ticket.id} 
                    ticket={ticket}
                    onViewConversation={onViewConversation}
                    onOpenInTickets={onOpenInTickets}
                  />
                ))
              )}
            </SortableContext>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
