import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useSuperAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { convertAudioBlobToWav } from '@/lib/audio/convertAudioBlobToWav';
import { convertAudioBlobToOggOpus } from '@/lib/audio/convertAudioBlobToOggOpus';
import { TicketList, Ticket } from './TicketList';
import { ChatArea, Message } from './ChatArea';
import { NewTicketModal } from './NewTicketModal';
import { TransferTicketModal } from './TransferTicketModal';
import { ScheduleMessageModal } from './ScheduleMessageModal';
import { ContactViewSheet } from './ContactViewSheet';
// Helper to get mimetype category
const getMimeCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'document' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  return 'document';
};

export function TicketsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [contactSheetOpen, setContactSheetOpen] = useState(false);

  // Handle ticketId from URL query parameter
  useEffect(() => {
    const ticketId = searchParams.get('ticketId');
    if (ticketId && tickets.length > 0 && !selectedTicket) {
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket(ticket);
        // Clear the query parameter after selecting
        searchParams.delete('ticketId');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [tickets, searchParams, selectedTicket]);

  // Handle contactId from URL query parameter (when coming from contacts page)
  useEffect(() => {
    const contactId = searchParams.get('contactId');
    if (!contactId || !profile?.company_id || loadingTickets) return;

    const handleContactNavigation = async () => {
      // First, check if there's already an open/pending ticket for this contact in the loaded list
      const existingTicket = tickets.find(t => t.contact?.id === contactId);
      if (existingTicket) {
        setSelectedTicket(existingTicket);
        searchParams.delete('contactId');
        setSearchParams(searchParams, { replace: true });
        return;
      }

      // Check database for any existing ticket (open or pending)
      const { data: dbTicket } = await supabase
        .from('tickets')
        .select(`
          id,
          last_message,
          status,
          unread_messages,
          updated_at,
          is_group,
          user_id,
          whatsapp_id,
          contact:contacts(id, name, number, profile_pic_url),
          queue:queues(id, name, color)
        `)
        .eq('contact_id', contactId)
        .in('status', ['open', 'pending'])
        .maybeSingle();

      if (dbTicket) {
        const formattedTicket: Ticket = {
          id: dbTicket.id,
          contact: dbTicket.contact as Ticket['contact'],
          last_message: dbTicket.last_message,
          status: dbTicket.status as Ticket['status'],
          unread_messages: dbTicket.unread_messages ?? 0,
          updated_at: dbTicket.updated_at,
          is_group: dbTicket.is_group ?? false,
          queue: dbTicket.queue as Ticket['queue'],
          user_id: (dbTicket as any).user_id ?? null,
          whatsapp_id: (dbTicket as any).whatsapp_id ?? null,
        };
        // Add to list if not already there
        setTickets(prev => {
          const exists = prev.some(t => t.id === formattedTicket.id);
          return exists ? prev : [formattedTicket, ...prev];
        });
        setSelectedTicket(formattedTicket);
        searchParams.delete('contactId');
        setSearchParams(searchParams, { replace: true });
        return;
      }

      // Get the contact's company_id to create ticket in correct company
      const { data: contactData } = await supabase
        .from('contacts')
        .select('company_id')
        .eq('id', contactId)
        .single();

      const ticketCompanyId = contactData?.company_id || profile.company_id;

      // If no ticket exists, create one
      const { data: newTicket, error } = await supabase
        .from('tickets')
        .insert({
          company_id: ticketCompanyId,
          contact_id: contactId,
          status: 'open',
          user_id: profile.user_id ?? null,
          unread_messages: 0,
        })
        .select(`
          id,
          last_message,
          status,
          unread_messages,
          updated_at,
          is_group,
          user_id,
          whatsapp_id,
          contact:contacts(id, name, number, profile_pic_url),
          queue:queues(id, name, color)
        `)
        .single();

      if (!error && newTicket) {
        const formattedTicket: Ticket = {
          id: newTicket.id,
          contact: newTicket.contact as Ticket['contact'],
          last_message: newTicket.last_message,
          status: newTicket.status as Ticket['status'],
          unread_messages: newTicket.unread_messages ?? 0,
          updated_at: newTicket.updated_at,
          is_group: newTicket.is_group ?? false,
          queue: newTicket.queue as Ticket['queue'],
          user_id: (newTicket as any).user_id ?? null,
          whatsapp_id: (newTicket as any).whatsapp_id ?? null,
        };
        setTickets(prev => [formattedTicket, ...prev]);
        setSelectedTicket(formattedTicket);
      } else if (error) {
        console.error('Error creating ticket:', error);
      }

      searchParams.delete('contactId');
      setSearchParams(searchParams, { replace: true });
    };

    handleContactNavigation();
  }, [searchParams, profile?.company_id, loadingTickets, tickets]);

  // Detect super admin via roles (recommended) and also support legacy "global company" marker
  const { isSuper: isSuperRole } = useUserRole();
  const GLOBAL_COMPANY_ID = '00000000-0000-0000-0000-000000000000';
  const isSuper = profile?.company_id === GLOBAL_COMPANY_ID || isSuperRole;

  // Fetch tickets
  useEffect(() => {
    if (!profile?.company_id) {
      setLoadingTickets(false);
      return;
    }

    const fetchTickets = async () => {
      setLoadingTickets(true);
      
      // Build query - super admins see all tickets, regular users see only their company
      let query = supabase
        .from('tickets')
        .select(`
          id,
          last_message,
          status,
          unread_messages,
          updated_at,
          is_group,
          user_id,
          whatsapp_id,
          contact:contacts(id, name, number, profile_pic_url, engagement_level, engagement_score),
          queue:queues(id, name, color)
        `)
        .order('updated_at', { ascending: false });

      // Only filter by company_id if NOT a super admin
      if (!isSuper) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching tickets:', error);
        toast({
          title: 'Erro ao carregar atendimentos',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        const formattedTickets = data?.map(t => ({
          id: t.id,
          contact: t.contact as Ticket['contact'],
          last_message: t.last_message,
          status: t.status as Ticket['status'],
          unread_messages: t.unread_messages ?? 0,
          updated_at: t.updated_at,
          is_group: t.is_group ?? false,
          queue: t.queue as Ticket['queue'],
          user_id: (t as any).user_id ?? null,
          whatsapp_id: (t as any).whatsapp_id ?? null,
        })) || [];
        setTickets(formattedTickets);
      }
      setLoadingTickets(false);
    };

    fetchTickets();

    // Subscribe to realtime updates - for super admin, subscribe without company filter
    const channelConfig = isSuper 
      ? { event: '*' as const, schema: 'public', table: 'tickets' }
      : { event: '*' as const, schema: 'public', table: 'tickets', filter: `company_id=eq.${profile.company_id}` };

    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', channelConfig, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id, isSuper]);

  // Fetch messages when ticket is selected
  useEffect(() => {
    if (!selectedTicket) {
      setMessages([]);
      return;
    }

    let cancelled = false;

    // Clear messages immediately when switching conversations to avoid mixing
    setMessages([]);

    const sortByCreatedAtAsc = (a: Message, b: Message) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

    const mergeMessages = (current: Message[], incoming: Message[]) => {
      const byId = new Map<string, Message>();
      current.forEach((m) => byId.set(m.id, m));
      incoming.forEach((m) => byId.set(m.id, m));
      return Array.from(byId.values()).sort(sortByCreatedAtAsc);
    };

    const upsertMessage = (current: Message[], next: Message) => {
      const idx = current.findIndex((m) => m.id === next.id);
      const merged = idx === -1
        ? [...current, next]
        : current.map((m) => (m.id === next.id ? { ...m, ...next } : m));
      return merged.sort(sortByCreatedAtAsc);
    };

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('id, wid, body, original_body, from_me, is_read, ack, media_url, media_type, created_at, updated_at, is_deleted, is_edited, participant, data_json')
        // Full conversation history (individual or group) is tied to the contact
        .eq('contact_id', selectedTicket.contact.id)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(() => mergeMessages([], (data as Message[]) ?? []));
      }
      setLoadingMessages(false);
    };

    // Subscribe first (avoid race condition between fetch and realtime)
    const channel = supabase
      .channel(`messages-contact-${selectedTicket.contact.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `contact_id=eq.${selectedTicket.contact.id}`,
        },
        (payload) => {
          // Avoid inserting incomplete rows (e.g. DELETE events that may only include the id)
          if ((payload as any).eventType === 'DELETE') return;

          const row = (payload.new || payload.old) as Message | undefined;
          if (!row?.id || !row.created_at) return;

          setMessages((prev) => upsertMessage(prev, row));
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchMessages();
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedTicket?.id, selectedTicket?.contact?.id]);

  const handleSendMessage = async (body: string) => {
    if (!selectedTicket || !profile?.company_id) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          ticketId: selectedTicket.id,
          body,
        },
      });

      if (error) {
        toast({
          title: 'Erro ao enviar mensagem',
          description: error.message,
          variant: 'destructive',
        });
      } else if (!data?.success) {
        toast({
          title: 'Erro ao enviar mensagem',
          description: data?.error || 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendAttachment = async (file: File) => {
    if (!selectedTicket || !profile?.company_id) return;

    try {
      // Upload to Storage
      const filePath = `${profile.company_id}/attachments/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('files')
        .upload(filePath, file);

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('files').getPublicUrl(filePath);
      const mediaUrl = urlData.publicUrl;
      const mediaType = getMimeCategory(file.type);

      // Send via edge function (empty body for media-only messages)
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          ticketId: selectedTicket.id,
          body: '',
          mediaUrl,
          mediaType,
          mimeType: file.type,
          fileName: file.name,
        },
      });

      if (error) {
        throw error;
      } else if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast({
        title: 'Anexo enviado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar anexo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'closed' })
      .eq('id', selectedTicket.id);

    if (error) {
      toast({
        title: 'Erro ao encerrar atendimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Atendimento encerrado',
      });
      setSelectedTicket(null);
    }
  };

  const handleReturnToPending = async () => {
    if (!selectedTicket) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'pending', user_id: null })
      .eq('id', selectedTicket.id);

    if (error) {
      toast({
        title: 'Erro ao devolver atendimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Atendimento devolvido para pendentes',
      });
      setSelectedTicket(null);
    }
  };

  const handleReactToMessage = async (messageWid: string, emoji: string) => {
    if (!selectedTicket) return;

    try {
      const { data, error } = await supabase.functions.invoke('send-reaction', {
        body: {
          ticketId: selectedTicket.id,
          messageWid,
          emoji,
        },
      });

      if (error) {
        throw error;
      } else if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast({
        title: 'Reação enviada',
        description: data?.saved === false && data?.warning ? `Aviso: ${data.warning}` : undefined,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar reação',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSendAudio = async (audioBlob: Blob) => {
    if (!selectedTicket || !profile?.company_id) return;

    try {
      // Create a file from the blob (keep extension consistent with actual mime type)
      const rawMime = (audioBlob.type || 'audio/webm').split(';')[0];
      const ext =
        rawMime === 'audio/ogg'
          ? 'ogg'
          : rawMime === 'audio/mpeg'
            ? 'mp3'
            : rawMime === 'audio/mp4'
              ? 'm4a'
              : 'webm';

      // 1) Upload ORIGINAL audio (for audit/debug)
      const originalFileName = `audio_${Date.now()}.${ext}`;
      const originalFile = new File([audioBlob], originalFileName, { type: rawMime });
      const originalPath = `${profile.company_id}/attachments/original/${Date.now()}_${originalFileName}`;

      const { error: uploadOriginalError } = await supabase.storage
        .from('files')
        .upload(originalPath, originalFile, { contentType: rawMime });

      if (uploadOriginalError) {
        throw new Error(`Upload failed: ${uploadOriginalError.message}`);
      }

      const { data: originalUrlData } = supabase.storage.from('files').getPublicUrl(originalPath);
      const originalMediaUrl = originalUrlData.publicUrl;

      // 2) Upload WAV version for playback compatibility (especially iPhone Safari)
      let mediaUrl = originalMediaUrl;
      let wavBlob: Blob | null = null;

      try {
        wavBlob = await convertAudioBlobToWav(audioBlob);
        const wavFileName = `audio_${Date.now()}.wav`;
        const wavPath = `${profile.company_id}/attachments/playback/${Date.now()}_${wavFileName}`;

        const { error: uploadWavError } = await supabase.storage
          .from('files')
          .upload(wavPath, wavBlob, { contentType: 'audio/wav' });

        if (!uploadWavError) {
          const { data: wavUrlData } = supabase.storage.from('files').getPublicUrl(wavPath);
          mediaUrl = wavUrlData.publicUrl;
        }
      } catch (e) {
        console.warn('[handleSendAudio] WAV conversion failed, keeping original for playback:', e);
      }

      // 3) Create a REAL OGG/Opus for WhatsApp (WuzAPI requires data:audio/ogg;base64,...)
      let providerMediaUrl: string | null = null;
      try {
        // IMPORTANT: convert from the original recording (not the WAV playback),
        // otherwise we may lose the original container/mime info.
        const oggBlob = await convertAudioBlobToOggOpus(audioBlob);
        const oggFileName = `audio_${Date.now()}.ogg`;
        const oggPath = `${profile.company_id}/attachments/provider/${Date.now()}_${oggFileName}`;

        const { error: uploadOggError } = await supabase.storage
          .from('files')
          .upload(oggPath, oggBlob, { contentType: 'audio/ogg' });

        if (!uploadOggError) {
          const { data: oggUrlData } = supabase.storage.from('files').getPublicUrl(oggPath);
          providerMediaUrl = oggUrlData.publicUrl;
        }
      } catch (e) {
        console.warn('[handleSendAudio] OGG/Opus conversion failed, WhatsApp may reject the audio:', e);
      }

      if (!providerMediaUrl) {
        throw new Error('Não foi possível gerar o áudio compatível com WhatsApp. Tente gravar novamente.');
      }

      // Send via backend function
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: {
          ticketId: selectedTicket.id,
          body: '',
          mediaUrl, // playback URL
          originalMediaUrl, // original recorded file URL
          providerMediaUrl, // OGG/Opus URL for WhatsApp
          mediaType: 'ptt',
          mimeType: rawMime,
          fileName: originalFileName,
        },
      });

      if (error) {
        throw error;
      } else if (!data?.success) {
        throw new Error(data?.error || 'Erro desconhecido');
      }

      toast({
        title: 'Áudio enviado',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar áudio',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleTransferred = () => {
    toast({
      title: 'Atendimento transferido com sucesso',
    });
    setSelectedTicket(null);
  };

  // Accept ticket from pending list (changes to open and assigns to current user)
  const handleAcceptTicketFromList = async (ticketId: string) => {
    if (!profile?.user_id) return;

    const { error } = await supabase
      .from('tickets')
      .update({ status: 'open', user_id: profile.user_id })
      .eq('id', ticketId);

    if (error) {
      toast({
        title: 'Erro ao aceitar atendimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Atendimento aceito',
      });
      // Select the accepted ticket
      const ticket = tickets.find(t => t.id === ticketId);
      if (ticket) {
        setSelectedTicket({ ...ticket, status: 'open' });
      }
    }
  };

  // Close ticket from list (without selecting it)
  const handleCloseTicketFromList = async (ticketId: string) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: 'closed' })
      .eq('id', ticketId);

    if (error) {
      toast({
        title: 'Erro ao encerrar atendimento',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Atendimento encerrado',
      });
    }
  };

  const handleTicketCreated = (ticketId: string) => {
    // Find the ticket in the list and select it
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      setSelectedTicket(ticket);
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden gap-0 md:gap-4 p-2 md:p-4 bg-background">
      {/* Ticket List Panel - Hidden on mobile when a ticket is selected */}
      <div className={cn(
        "w-full md:w-[320px] flex-shrink-0 h-full min-h-0",
        selectedTicket ? "hidden md:block" : "block"
      )}>
        <TicketList
          tickets={tickets}
          selectedTicketId={selectedTicket?.id ?? null}
          onSelectTicket={setSelectedTicket}
          onNewTicket={() => setNewTicketModalOpen(true)}
          onAcceptTicket={handleAcceptTicketFromList}
          onCloseTicket={handleCloseTicketFromList}
          loading={loadingTickets}
        />
      </div>
      
      {/* Chat Panel - Hidden on mobile when no ticket is selected */}
      <div className={cn(
        "flex-1 min-w-0 h-full min-h-0 neu-raised rounded-2xl overflow-hidden",
        selectedTicket ? "block" : "hidden md:block"
      )}>
        <ChatArea
          ticket={selectedTicket}
          messages={messages}
          onSendMessage={handleSendMessage}
          onSendAttachment={handleSendAttachment}
          onSendAudio={handleSendAudio}
          onReactToMessage={handleReactToMessage}
          onCloseTicket={handleCloseTicket}
          onReturnToPending={handleReturnToPending}
          onTransfer={() => setTransferModalOpen(true)}
          onScheduleMessage={() => setScheduleModalOpen(true)}
          onViewContact={() => setContactSheetOpen(true)}
          onBack={() => setSelectedTicket(null)}
          loading={loadingMessages}
        />
      </div>
      {profile?.company_id && (
        <NewTicketModal
          open={newTicketModalOpen}
          onOpenChange={setNewTicketModalOpen}
          companyId={profile.company_id}
          onTicketCreated={handleTicketCreated}
        />
      )}
      {selectedTicket && (
        <>
          <TransferTicketModal
            open={transferModalOpen}
            onClose={() => setTransferModalOpen(false)}
            ticketId={selectedTicket.id}
            onTransferred={handleTransferred}
          />
          <ScheduleMessageModal
            open={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            contactId={selectedTicket.contact.id}
            contactName={selectedTicket.contact.name}
          />
          <ContactViewSheet
            open={contactSheetOpen}
            onClose={() => setContactSheetOpen(false)}
            ticket={selectedTicket}
          />
        </>
      )}
    </div>
  );
}
