import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { RefreshCw, Tag, AlertCircle } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { KanbanFilters, KanbanFiltersState } from './KanbanFilters';
import { useKanbanTickets, KanbanTicket } from '@/hooks/useKanbanTickets';
import { useKanbanTags } from '@/hooks/useKanbanTags';
import { TicketPreviewDialog } from './TicketPreviewDialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Column {
  id: string;
  title: string;
  color: string;
  icon: React.ReactNode;
  tagId: string;
}

export function KanbanPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<KanbanFiltersState>({
    queueId: null,
    userId: null,
    startDate: null,
    endDate: null,
    searchTerm: '',
    statusFilter: 'all',
  });

  const {
    loading,
    fetchTickets,
    getTicketsByTag,
    tickets,
  } = useKanbanTickets(filters);

  const { tags: kanbanTags, loading: tagsLoading } = useKanbanTags();

  const [activeTicket, setActiveTicket] = useState<KanbanTicket | null>(null);
  const [previewTicket, setPreviewTicket] = useState<KanbanTicket | null>(null);

  // Build columns from tags only
  const tagColumns: Column[] = kanbanTags.map((tag) => ({
    id: `tag-${tag.id}`,
    title: tag.name,
    color: tag.color,
    icon: <Tag className="h-4 w-4" />,
    tagId: tag.id,
  }));

  const handleViewConversation = (ticket: KanbanTicket) => {
    setPreviewTicket(ticket);
  };

  const handleOpenInTickets = (ticket: KanbanTicket) => {
    navigate(`/tickets?ticketId=${ticket.id}`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const getTicketsForColumn = (tagId: string) => {
    let columnTickets = getTicketsByTag(tagId);
    
    // Apply status filter
    if (filters.statusFilter !== 'all') {
      columnTickets = columnTickets.filter((ticket) => ticket.status === filters.statusFilter);
    }
    
    return columnTickets;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const ticket = tickets.find((t) => t.id === active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTicket(null);
    // Tag-based kanban doesn't support drag to change tags
    // Users can manage tags through the ticket interface
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kanban</h1>
          <p className="text-muted-foreground">
            Visualize tickets organizados por tags
          </p>
        </div>
        <Button variant="outline" onClick={fetchTickets} disabled={loading || tagsLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading || tagsLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Filters */}
      <KanbanFilters filters={filters} onFiltersChange={setFilters} />

      {/* Empty State */}
      {!tagsLoading && tagColumns.length === 0 && (
        <Alert className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhuma tag configurada para exibir no Kanban. Vá em <strong>Tags</strong> e marque a opção "Exibir no Kanban" nas tags desejadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Kanban Board */}
      {tagColumns.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 overflow-x-auto overflow-y-hidden mt-4">
            <div className="flex gap-4 h-full min-w-max pb-4">
              {tagColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  tickets={getTicketsForColumn(column.tagId)}
                  color={column.color}
                  icon={column.icon}
                  onViewConversation={handleViewConversation}
                  onOpenInTickets={handleOpenInTickets}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTicket ? (
              <div className="rotate-3 scale-105">
                <KanbanCard ticket={activeTicket} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Ticket Preview Dialog */}
      <TicketPreviewDialog
        ticket={previewTicket}
        open={!!previewTicket}
        onOpenChange={(open) => !open && setPreviewTicket(null)}
        onOpenInTickets={handleOpenInTickets}
      />
    </div>
  );
}
