import { useState, useMemo, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AvatarPreview } from '@/components/ui/avatar-preview';
import { Search, MessageSquare, Check, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TicketToolbar, TicketFilters } from './TicketToolbar';
import { useQueues } from '@/hooks/useQueues';
import { useTags } from '@/hooks/useTags';
import { useWhatsappConnections } from '@/hooks/useWhatsappConnections';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';

export interface Ticket {
  id: string;
  contact: {
    id: string;
    name: string;
    number: string;
    profile_pic_url?: string;
    engagement_level?: string | null;
    engagement_score?: number | null;
  };
  last_message: string | null;
  status: 'open' | 'pending' | 'closed';
  unread_messages: number;
  updated_at: string;
  is_group?: boolean;
  queue?: {
    id: string;
    name: string;
    color: string;
  };
  user_id?: string | null;
  whatsapp_id?: string | null;
  tags?: { id: string }[];
}

interface TicketListProps {
  tickets: Ticket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticket: Ticket) => void;
  onNewTicket: () => void;
  onAcceptTicket?: (ticketId: string) => void;
  onCloseTicket?: (ticketId: string) => void;
  loading?: boolean;
}

// Helper to check if a ticket is a broadcast (status@broadcast)
const isBroadcast = (ticket: Ticket) => {
  return ticket.contact.number === 'status@broadcast' || 
         ticket.contact.number.includes('@broadcast');
};

export function TicketList({ tickets, selectedTicketId, onSelectTicket, onNewTicket, onAcceptTicket, onCloseTicket, loading }: TicketListProps) {
  const [search, setSearch] = useState('');
  const { profile } = useAuth();
  const { queues } = useQueues();
  const { tags } = useTags();
  const { connections } = useWhatsappConnections();
  const { users } = useUsers();

  const [filters, setFilters] = useState<TicketFilters>({
    sortOrder: 'recent',
    showOnlyMine: false,
    viewType: 'individual',
    statusFilter: 'open',
    selectedQueues: [],
    selectedTags: [],
    selectedConnections: [],
    selectedUsers: [],
    readFilter: 'all',
  });

  // Separate tab for open vs pending (only when not viewing closed)
  const [activeTab, setActiveTab] = useState<'open' | 'pending'>('open');

  const normalizeContactNumber = (raw: string) => {
    const base = raw.split('@')[0] ?? raw;
    return base.replace(/\D/g, '');
  };

  const getDedupeKey = (ticket: Ticket) => {
    return ticket.is_group
      ? `g:${ticket.contact.number}`
      : `p:${normalizeContactNumber(ticket.contact.number)}`;
  };

  const dedupeTickets = (items: Ticket[]) => {
    const byKey = new Map<string, Ticket>();
    for (const t of items) {
      const key = getDedupeKey(t);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, t);
        continue;
      }
      if (new Date(t.updated_at) > new Date(existing.updated_at)) {
        byKey.set(key, t);
      }
    }
    return Array.from(byKey.values());
  };

  const filteredTickets = useMemo(() => {
    let result = tickets.filter(ticket => {
      // Exclude broadcasts
      if (isBroadcast(ticket)) return false;

      // Search filter
      const matchesSearch = 
        ticket.contact.name.toLowerCase().includes(search.toLowerCase()) ||
        ticket.contact.number.includes(search) ||
        ticket.last_message?.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      // Status filter - when viewing 'open', use the activeTab (open or pending)
      if (filters.statusFilter === 'open') {
        if (ticket.status !== activeTab) return false;
      } else if (filters.statusFilter === 'closed') {
        if (ticket.status !== 'closed') return false;
      }

      // Type filter (individual vs group)
      if (filters.viewType === 'individual' && ticket.is_group) return false;
      if (filters.viewType === 'group' && !ticket.is_group) return false;

      // Show only mine
      if (filters.showOnlyMine && profile?.user_id && ticket.user_id !== profile.user_id) {
        return false;
      }

      // Queue filter
      if (filters.selectedQueues.length > 0) {
        if (!ticket.queue || !filters.selectedQueues.includes(ticket.queue.id)) {
          return false;
        }
      }

      // Tag filter
      if (filters.selectedTags.length > 0) {
        const ticketTagIds = ticket.tags?.map(t => t.id) || [];
        const hasMatchingTag = filters.selectedTags.some(tagId => ticketTagIds.includes(tagId));
        if (!hasMatchingTag) return false;
      }

      // Connection filter
      if (filters.selectedConnections.length > 0) {
        if (!ticket.whatsapp_id || !filters.selectedConnections.includes(ticket.whatsapp_id)) {
          return false;
        }
      }

      // User filter
      if (filters.selectedUsers.length > 0) {
        if (!ticket.user_id || !filters.selectedUsers.includes(ticket.user_id)) {
          return false;
        }
      }

      // Read filter
      if (filters.readFilter === 'unread' && ticket.unread_messages === 0) return false;
      if (filters.readFilter === 'read' && ticket.unread_messages > 0) return false;

      return true;
    });

    // Dedupe
    result = dedupeTickets(result);

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.updated_at).getTime();
      const dateB = new Date(b.updated_at).getTime();
      return filters.sortOrder === 'recent' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [tickets, search, filters, activeTab, profile?.user_id]);

  // Count for tabs
  const openCount = useMemo(() => {
    return dedupeTickets(
      tickets.filter(t => !isBroadcast(t) && t.status === 'open' && 
        ((filters.viewType === 'individual' && !t.is_group) || (filters.viewType === 'group' && t.is_group)))
    ).length;
  }, [tickets, filters.viewType]);

  const pendingCount = useMemo(() => {
    return dedupeTickets(
      tickets.filter(t => !isBroadcast(t) && t.status === 'pending' && 
        ((filters.viewType === 'individual' && !t.is_group) || (filters.viewType === 'group' && t.is_group)))
    ).length;
  }, [tickets, filters.viewType]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isSameDay(date, new Date())) {
      return format(date, 'HH:mm');
    }
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  };

  return (
    <div className="flex flex-col h-full min-h-0 neu-raised rounded-2xl overflow-hidden">
      {/* Header with gradient accent */}
      <div className="relative">
        {/* Gradient top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 gradient-coral opacity-80" />
        
        <div className="p-3 pt-3 pr-5 space-y-3">
          {/* Toolbar with all filter buttons */}
          <TicketToolbar
            filters={filters}
            onFiltersChange={setFilters}
            onNewTicket={onNewTicket}
            queues={queues}
            tags={tags}
            connections={connections}
            users={users}
            currentUserId={profile?.user_id}
          />
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar conversas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 rounded-xl neu-pressed border-0 bg-transparent placeholder:text-muted-foreground/60 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          {/* Active filters summary */}
          {(filters.selectedQueues.length > 0 || filters.selectedTags.length > 0 || 
            filters.selectedConnections.length > 0 || filters.selectedUsers.length > 0) && (
            <div className="flex flex-wrap gap-1">
              {filters.selectedQueues.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {filters.selectedQueues.length} fila(s)
                </Badge>
              )}
              {filters.selectedTags.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {filters.selectedTags.length} tag(s)
                </Badge>
              )}
              {filters.selectedConnections.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {filters.selectedConnections.length} conexão(ões)
                </Badge>
              )}
              {filters.selectedUsers.length > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {filters.selectedUsers.length} usuário(s)
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-2 text-[10px] text-muted-foreground"
                onClick={() => setFilters(prev => ({
                  ...prev,
                  selectedQueues: [],
                  selectedTags: [],
                  selectedConnections: [],
                  selectedUsers: [],
                }))}
              >
                Limpar
              </Button>
            </div>
          )}

          {/* Status Tabs - Abertos / Pendentes */}
          {filters.statusFilter !== 'closed' && (
            <div className="flex gap-1 p-1 neu-pressed rounded-xl">
              {(['open', 'pending'] as const).map((status) => {
                const count = status === 'open' ? openCount : pendingCount;
                return (
                  <button
                    key={status}
                    className={cn(
                      "flex-1 py-2 px-4 text-[13px] font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                      activeTab === status 
                        ? "bg-card text-foreground shadow-neu-sm" 
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => setActiveTab(status)}
                  >
                    <span>{status === 'open' ? 'Atendendo' : 'Pendentes'}</span>
                    {count > 0 && (
                      <span className={cn(
                        "h-5 min-w-5 px-1.5 text-[10px] font-semibold rounded-full flex items-center justify-center",
                        activeTab === status 
                          ? status === 'open' ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1 min-h-0 scrollbar-thin">
        <div className="p-4 pr-10">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl animate-pulse neu-flat">
                  <div className="w-12 h-12 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-28 bg-muted rounded-lg" />
                    <div className="h-3 w-full bg-muted rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl neu-pressed flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhum atendimento encontrado</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectTicket(ticket)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelectTicket(ticket);
                    }
                  }}
                  className={cn(
                    "max-w-[295px] cursor-pointer p-3 flex items-center gap-3 rounded-xl transition-all duration-200 text-left relative group",
                    "animate-fade-up",
                    selectedTicketId === ticket.id
                      ? "neu-raised bg-card-elevated"
                      : "hover:bg-muted/50"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Queue color indicator */}
                  {ticket.queue && (
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-full transition-all duration-200 group-hover:h-[calc(100%-8px)]"
                      style={{ backgroundColor: ticket.queue.color }}
                    />
                  )}

                  {/* Avatar with online indicator */}
                  <div className="relative">
                    <AvatarPreview
                      src={ticket.contact.profile_pic_url}
                      fallback={getInitials(ticket.contact.name)}
                      isGroup={ticket.is_group}
                      name={ticket.contact.name}
                      className={cn(
                        "flex-shrink-0 ring-2 ring-transparent transition-all duration-200",
                        selectedTicketId === ticket.id && "ring-primary/50"
                      )}
                    />
                    {ticket.unread_messages > 0 && (
                      <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-bold bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-glow-primary animate-scale-in">
                        {ticket.unread_messages}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name and time */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          "flex-1 font-semibold truncate transition-colors",
                          ticket.unread_messages > 0 ? "text-foreground" : "text-foreground/80"
                        )}
                      >
                        {ticket.contact.name}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(ticket.updated_at)}
                      </span>
                    </div>

                    {/* Last message */}
                    <p
                      className={cn(
                        "text-sm truncate",
                        ticket.unread_messages > 0
                          ? "text-foreground/70 font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {ticket.last_message || "Sem mensagens"}
                    </p>

                    {/* Pending ticket actions */}
                    {ticket.status === "pending" && (onAcceptTicket || onCloseTicket) && (
                      <div className="flex items-center gap-1.5 mt-2">
                        {onAcceptTicket && (
                          <Button
                            size="sm"
                            className="h-7 px-3 text-[11px] rounded-lg bg-success hover:bg-success/90 text-success-foreground shadow-glow-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcceptTicket(ticket.id);
                            }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Aceitar
                          </Button>
                        )}
                        {onCloseTicket && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-3 text-[11px] rounded-lg border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCloseTicket(ticket.id);
                            }}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Fechar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
