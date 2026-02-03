import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  ArrowUpDown,
  User,
  Users,
  MessageSquare,
  CheckCircle,
  Inbox,
  Tag,
  Phone,
  UserCircle,
  Mail,
  MailOpen,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Queue } from '@/hooks/useQueues';
import { Tag as TagType } from '@/hooks/useTags';
import { WhatsappConnection } from '@/hooks/useWhatsappConnections';
import { Profile } from '@/hooks/useUsers';
import { Badge } from '@/components/ui/badge';

export interface TicketFilters {
  sortOrder: 'recent' | 'oldest';
  showOnlyMine: boolean;
  viewType: 'individual' | 'group';
  statusFilter: 'open' | 'closed' | 'all';
  selectedQueues: string[];
  selectedTags: string[];
  selectedConnections: string[];
  selectedUsers: string[];
  readFilter: 'all' | 'read' | 'unread';
}

interface TicketToolbarProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  onNewTicket: () => void;
  queues: Queue[];
  tags: TagType[];
  connections: WhatsappConnection[];
  users: Profile[];
  currentUserId?: string;
}

interface ToggleButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  tooltip: string;
  activeTooltip?: string;
  badge?: number;
}

function ToggleButton({ active, onClick, icon, activeIcon, tooltip, activeTooltip, badge }: ToggleButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          className={cn(
            "h-8 w-8 p-0 relative transition-all duration-200",
            active
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {active && activeIcon ? activeIcon : icon}
          {badge !== undefined && badge > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{active && activeTooltip ? activeTooltip : tooltip}</TooltipContent>
    </Tooltip>
  );
}

interface FilterPopoverProps {
  icon: React.ReactNode;
  tooltip: string;
  items: { id: string; name: string; color?: string }[];
  selectedItems: string[];
  onSelectionChange: (selected: string[]) => void;
  emptyMessage?: string;
}

function FilterPopover({ icon, tooltip, items, selectedItems, onSelectionChange, emptyMessage = "Nenhum item" }: FilterPopoverProps) {
  const hasSelection = selectedItems.length > 0;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 relative transition-all duration-200",
                hasSelection
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {icon}
              {hasSelection && (
                <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[9px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
                  {selectedItems.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-2 z-50 bg-popover border shadow-lg" align="start">
        <ScrollArea className="max-h-64">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer"
                  onClick={() => {
                    const isSelected = selectedItems.includes(item.id);
                    if (isSelected) {
                      onSelectionChange(selectedItems.filter(id => id !== item.id));
                    } else {
                      onSelectionChange([...selectedItems, item.id]);
                    }
                  }}
                >
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    className="pointer-events-none"
                  />
                  {item.color && (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                  )}
                  <span className="text-sm truncate flex-1">{item.name}</span>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        {selectedItems.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => onSelectionChange([])}
          >
            Limpar seleção
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function TicketToolbar({
  filters,
  onFiltersChange,
  onNewTicket,
  queues,
  tags,
  connections,
  users,
  currentUserId,
}: TicketToolbarProps) {
  const updateFilter = <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex items-center gap-1 p-2 bg-muted/30 rounded-xl border border-border/50">
      {/* 1. Novo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="sm"
            className="h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm"
            onClick={onNewTicket}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Novo
          </Button>
        </TooltipTrigger>
        <TooltipContent>Novo atendimento</TooltipContent>
      </Tooltip>

      <div className="w-px h-6 bg-border/50 mx-1" />

      {/* 2. Ordenação */}
      <ToggleButton
        active={filters.sortOrder === 'oldest'}
        onClick={() => updateFilter('sortOrder', filters.sortOrder === 'recent' ? 'oldest' : 'recent')}
        icon={<ArrowDown className="h-4 w-4" />}
        activeIcon={<ArrowUp className="h-4 w-4" />}
        tooltip="Mais recentes primeiro"
        activeTooltip="Mais antigos primeiro"
      />

      {/* 3. Meus/Todos */}
      <ToggleButton
        active={filters.showOnlyMine}
        onClick={() => updateFilter('showOnlyMine', !filters.showOnlyMine)}
        icon={<Users className="h-4 w-4" />}
        activeIcon={<User className="h-4 w-4" />}
        tooltip="Mostrar todos os atendimentos"
        activeTooltip="Apenas meus atendimentos"
      />

      {/* 4. Individual/Grupo */}
      <ToggleButton
        active={filters.viewType === 'group'}
        onClick={() => updateFilter('viewType', filters.viewType === 'individual' ? 'group' : 'individual')}
        icon={<MessageSquare className="h-4 w-4" />}
        activeIcon={<Users className="h-4 w-4" />}
        tooltip="Conversas individuais"
        activeTooltip="Grupos"
      />

      {/* 5. Abertos/Fechados */}
      <ToggleButton
        active={filters.statusFilter === 'closed'}
        onClick={() => updateFilter('statusFilter', filters.statusFilter === 'open' ? 'closed' : 'open')}
        icon={<Inbox className="h-4 w-4" />}
        activeIcon={<CheckCircle className="h-4 w-4" />}
        tooltip="Abertos"
        activeTooltip="Encerrados"
      />

      <div className="w-px h-6 bg-border/50 mx-1" />

      {/* 6. Filtrar por Filas */}
      <FilterPopover
        icon={<Inbox className="h-4 w-4" />}
        tooltip="Filtrar por filas"
        items={queues.map(q => ({ id: q.id, name: q.name, color: q.color || undefined }))}
        selectedItems={filters.selectedQueues}
        onSelectionChange={(selected) => updateFilter('selectedQueues', selected)}
        emptyMessage="Nenhuma fila cadastrada"
      />

      {/* 7. Filtrar por Tags */}
      <FilterPopover
        icon={<Tag className="h-4 w-4" />}
        tooltip="Filtrar por tags"
        items={tags.map(t => ({ id: t.id, name: t.name, color: t.color || undefined }))}
        selectedItems={filters.selectedTags}
        onSelectionChange={(selected) => updateFilter('selectedTags', selected)}
        emptyMessage="Nenhuma tag cadastrada"
      />

      {/* 8. Filtrar por Conexão */}
      <FilterPopover
        icon={<Phone className="h-4 w-4" />}
        tooltip="Filtrar por conexão"
        items={connections.map(c => ({ id: c.id, name: c.name }))}
        selectedItems={filters.selectedConnections}
        onSelectionChange={(selected) => updateFilter('selectedConnections', selected)}
        emptyMessage="Nenhuma conexão"
      />

      {/* 9. Filtrar por Usuário */}
      <FilterPopover
        icon={<UserCircle className="h-4 w-4" />}
        tooltip="Filtrar por usuário"
        items={users.map(u => ({ id: u.user_id, name: u.name }))}
        selectedItems={filters.selectedUsers}
        onSelectionChange={(selected) => updateFilter('selectedUsers', selected)}
        emptyMessage="Nenhum usuário"
      />

      {/* 10. Lidas/Não lidas */}
      <ToggleButton
        active={filters.readFilter === 'unread'}
        onClick={() => {
          const next = filters.readFilter === 'all' ? 'unread' : filters.readFilter === 'unread' ? 'read' : 'all';
          updateFilter('readFilter', next);
        }}
        icon={<MailOpen className="h-4 w-4" />}
        activeIcon={<Mail className="h-4 w-4" />}
        tooltip={
          filters.readFilter === 'all' ? 'Todas as mensagens' :
          filters.readFilter === 'unread' ? 'Apenas não lidas' : 'Apenas lidas'
        }
      />
    </div>
  );
}
