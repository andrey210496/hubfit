import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  MessageCircle,
  Send,
  ExternalLink,
  Clock,
  CheckCheck,
  Check,
  Image as ImageIcon,
  FileText,
  Mic,
  Video,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Message {
  id: string;
  body: string;
  from_me: boolean;
  media_type: string | null;
  media_url: string | null;
  created_at: string;
  ack: number | null;
  is_deleted: boolean | null;
}

interface CommunicationTabProps {
  contactId: string;
  contactName: string;
  contactNumber: string;
  contactPicUrl?: string | null;
}

export function CommunicationTab({ 
  contactId, 
  contactName, 
  contactNumber,
  contactPicUrl 
}: CommunicationTabProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
  }, [contactId]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    setIsLoading(true);
    try {
      // Fetch messages for this contact
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, body, from_me, media_type, media_url, created_at, ack, is_deleted')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Check if there's an existing ticket for this contact
      const { data: ticketData } = await supabase
        .from('tickets')
        .select('id')
        .eq('contact_id', contactId)
        .in('status', ['open', 'pending'])
        .limit(1)
        .single();

      setTicketId(ticketData?.id || null);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenTicket = () => {
    // Navigate to tickets page with contactId to open/create conversation
    navigate(`/atendimento?contactId=${contactId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatMessageDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return format(date, "dd 'de' MMMM", { locale: ptBR });
  };

  const formatMessageTime = (dateStr: string) => {
    return format(parseISO(dateStr), 'HH:mm');
  };

  const getAckIcon = (ack: number | null) => {
    if (ack === null || ack === 0) return <Clock className="h-3 w-3 text-muted-foreground" />;
    if (ack === 1) return <Check className="h-3 w-3 text-muted-foreground" />;
    if (ack === 2) return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    if (ack === 3) return <CheckCheck className="h-3 w-3 text-blue-500" />;
    return null;
  };

  const getMediaIcon = (mediaType: string | null) => {
    if (!mediaType) return null;
    if (mediaType.includes('image')) return <ImageIcon className="h-4 w-4" />;
    if (mediaType.includes('video')) return <Video className="h-4 w-4" />;
    if (mediaType.includes('audio')) return <Mic className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  
  messages.forEach(msg => {
    const msgDate = formatMessageDate(msg.created_at);
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={contactPicUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{contactName}</p>
                <p className="text-sm text-muted-foreground">{contactNumber}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchMessages}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={handleOpenTicket} size="sm">
                <Send className="h-4 w-4 mr-2" />
                {ticketId ? 'Abrir Conversa' : 'Iniciar Atendimento'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Histórico de Conversas
            </CardTitle>
            <Badge variant="outline" className="bg-muted">
              {messages.length} mensagens
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Nenhuma conversa ainda</p>
              <p className="text-sm">Inicie um atendimento para conversar com este cliente</p>
              <Button className="mt-4" onClick={handleOpenTicket}>
                <Send className="h-4 w-4 mr-2" />
                Iniciar Atendimento
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
              <div className="space-y-4">
                {groupedMessages.map((group, groupIdx) => (
                  <div key={groupIdx}>
                    {/* Date Divider */}
                    <div className="flex items-center justify-center my-4">
                      <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal">
                        {group.date}
                      </Badge>
                    </div>

                    {/* Messages */}
                    <div className="space-y-2">
                      {group.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.from_me ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-lg px-3 py-2 ${
                              msg.from_me
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            } ${msg.is_deleted ? 'opacity-50 italic' : ''}`}
                          >
                            {msg.media_type && (
                              <div className="flex items-center gap-2 mb-1 opacity-80">
                                {getMediaIcon(msg.media_type)}
                                <span className="text-xs">Mídia</span>
                              </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">
                              {msg.is_deleted ? 'Mensagem apagada' : msg.body}
                            </p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              msg.from_me ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              <span className="text-xs">{formatMessageTime(msg.created_at)}</span>
                              {msg.from_me && getAckIcon(msg.ack)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions / Automations Hint */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Sparkles className="h-5 w-5" />
            <div>
              <p className="font-medium text-foreground">Automações disponíveis</p>
              <p className="text-sm">
                Configure mensagens automáticas para vencimentos, aniversários e boas-vindas em Configurações → Automações
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
