import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type TicketStatus = Database['public']['Enums']['ticket_status'];

export interface KanbanTicket {
  id: string;
  status: TicketStatus;
  last_message: string | null;
  unread_messages: number | null;
  created_at: string;
  updated_at: string;
  contact: {
    id: string;
    name: string;
    number: string;
    profile_pic_url: string | null;
  } | null;
  user: {
    id: string;
    name: string;
  } | null;
  queue: {
    id: string;
    name: string;
    color: string;
  } | null;
  tags: {
    id: string;
    name: string;
    color: string;
  }[];
}

export interface KanbanFilters {
  queueId: string | null;
  userId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  searchTerm?: string;
  statusFilter?: 'all' | 'open' | 'pending' | 'closed';
}

export function useKanbanTickets(filters?: KanbanFilters) {
  const [tickets, setTickets] = useState<KanbanTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('tickets')
        .select(`
          id,
          status,
          last_message,
          unread_messages,
          created_at,
          updated_at,
          contact_id,
          user_id,
          queue_id
        `)
        .eq('is_group', false) // Exclude group conversations
        .order('updated_at', { ascending: false });

      // Apply filters
      if (filters?.queueId) {
        query = query.eq('queue_id', filters.queueId);
      }
      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate.toISOString());
      }
      if (filters?.endDate) {
        const endOfDay = new Date(filters.endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch related data
      const ticketsWithRelations = await Promise.all(
        (data || []).map(async (ticket) => {
          let contact = null;
          let user = null;
          let queue = null;
          let tags: { id: string; name: string; color: string }[] = [];

          if (ticket.contact_id) {
            const { data: contactData } = await supabase
              .from('contacts')
              .select('id, name, number, profile_pic_url')
              .eq('id', ticket.contact_id)
              .maybeSingle();
            contact = contactData;
          }

          if (ticket.user_id) {
            const { data: userData } = await supabase
              .from('profiles')
              .select('id, name')
              .eq('user_id', ticket.user_id)
              .maybeSingle();
            user = userData;
          }

          if (ticket.queue_id) {
            const { data: queueData } = await supabase
              .from('queues')
              .select('id, name, color')
              .eq('id', ticket.queue_id)
              .maybeSingle();
            queue = queueData;
          }

          // Fetch ticket tags
          const { data: ticketTagsData } = await supabase
            .from('ticket_tags')
            .select('tag_id, tags:tag_id(id, name, color)')
            .eq('ticket_id', ticket.id);

          if (ticketTagsData) {
            tags = ticketTagsData
              .filter((tt: any) => tt.tags)
              .map((tt: any) => ({
                id: tt.tags.id,
                name: tt.tags.name,
                color: tt.tags.color,
              }));
          }

          return {
            ...ticket,
            contact,
            user,
            queue,
            tags,
          } as KanbanTicket;
        })
      );

      // Filter by search term (contact name) client-side
      const filteredTickets = filters?.searchTerm
        ? ticketsWithRelations.filter((ticket) =>
            ticket.contact?.name.toLowerCase().includes(filters.searchTerm!.toLowerCase())
          )
        : ticketsWithRelations;

      setTickets(filteredTickets);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tickets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [filters?.queueId, filters?.userId, filters?.startDate, filters?.endDate, filters?.searchTerm, toast]);

  const updateTicketStatus = async (ticketId: string, newStatus: TicketStatus) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      setTickets((prev) =>
        prev.map((ticket) =>
          ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
        )
      );

      toast({ title: 'Status atualizado!' });
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('kanban-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          // Refetch tickets when any change occurs
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTickets]);

  const getTicketsByStatus = (status: TicketStatus) =>
    tickets.filter((ticket) => ticket.status === status);

  const getTicketsByTag = (tagId: string) =>
    tickets.filter((ticket) => ticket.tags.some((tag) => tag.id === tagId));

  return {
    tickets,
    loading,
    fetchTickets,
    updateTicketStatus,
    getTicketsByStatus,
    getTicketsByTag,
    openTickets: getTicketsByStatus('open'),
    pendingTickets: getTicketsByStatus('pending'),
    closedTickets: getTicketsByStatus('closed'),
  };
}
