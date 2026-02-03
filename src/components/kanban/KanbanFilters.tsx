import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Filter, X, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface Queue {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  name: string;
  user_id: string;
}

export interface KanbanFiltersState {
  queueId: string | null;
  userId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  searchTerm: string;
  statusFilter: 'all' | 'open' | 'pending' | 'closed';
}

interface KanbanFiltersProps {
  filters: KanbanFiltersState;
  onFiltersChange: (filters: KanbanFiltersState) => void;
}

export function KanbanFilters({ filters, onFiltersChange }: KanbanFiltersProps) {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      const [queuesRes, usersRes] = await Promise.all([
        supabase.from('queues').select('id, name, color').order('name'),
        supabase.from('profiles').select('id, name, user_id').order('name'),
      ]);

      if (queuesRes.data) setQueues(queuesRes.data);
      if (usersRes.data) setUsers(usersRes.data);
    };

    fetchOptions();
  }, []);

  const hasActiveFilters =
    filters.queueId || filters.userId || filters.startDate || filters.endDate || filters.searchTerm || filters.statusFilter !== 'all';

  const clearFilters = () => {
    onFiltersChange({
      queueId: null,
      userId: null,
      startDate: null,
      endDate: null,
      searchTerm: '',
      statusFilter: 'all',
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros:
      </div>

      {/* Search by Contact Name */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar contato..."
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
          className="pl-8 w-[200px]"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.statusFilter}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, statusFilter: value as KanbanFiltersState['statusFilter'] })
        }
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Todos os status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os status</SelectItem>
          <SelectItem value="open">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Abertos
            </div>
          </SelectItem>
          <SelectItem value="pending">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              Pendentes
            </div>
          </SelectItem>
          <SelectItem value="closed">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-500" />
              Fechados
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Queue Filter */}
      <Select
        value={filters.queueId || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, queueId: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todas as filas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as filas</SelectItem>
          {queues.map((queue) => (
            <SelectItem key={queue.id} value={queue.id}>
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: queue.color }}
                />
                {queue.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* User Filter */}
      <Select
        value={filters.userId || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ ...filters, userId: value === 'all' ? null : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Todos os usuários" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os usuários</SelectItem>
          {users.map((user) => (
            <SelectItem key={user.user_id} value={user.user_id}>
              {user.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Start Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[140px] justify-start text-left font-normal',
              !filters.startDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Data início'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.startDate || undefined}
            onSelect={(date) => onFiltersChange({ ...filters, startDate: date || null })}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* End Date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[140px] justify-start text-left font-normal',
              !filters.endDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Data fim'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={filters.endDate || undefined}
            onSelect={(date) => onFiltersChange({ ...filters, endDate: date || null })}
            initialFocus
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          Limpar
        </Button>
      )}
    </div>
  );
}
