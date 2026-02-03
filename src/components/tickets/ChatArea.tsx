import React, { useState, useRef, useEffect, type ChangeEvent, useMemo } from 'react';
import hubfitLogoIcon from '@/assets/logo.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { EmojiPicker } from '@/components/ui/emoji-picker';
import { MessageReactionPicker } from './MessageReactionPicker';
import { AudioRecorder } from './AudioRecorder';
import { AudioPlayer } from './AudioPlayer';
import { TemplateSelector } from '@/components/templates/TemplateSelector';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Send, 
  Paperclip, 
  MoreVertical, 
  User,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft,
  Search,
  Phone,
  UserPlus,
  Ban,
  RotateCcw,
  CalendarClock,
  Eye,
  Pencil,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Ticket } from './TicketList';
import { ContactTagsBar } from './ContactTagsBar';
import { EngagementScoreBadge } from '@/components/contacts/EngagementScoreBadge';

export interface Message {
  id: string;
  wid?: string | null;
  body: string;
  original_body?: string | null;
  from_me: boolean;
  is_read: boolean;
  ack: number;
  media_url?: string;
  media_type?: string;
  is_deleted?: boolean;
  is_edited?: boolean;
  created_at: string;
  updated_at?: string;
  participant?: string | null;
  data_json?: {
    senderName?: string | null;
    pushName?: string | null;
    messageType?: string | null;
    key?: {
      id?: string | null;
      fromMe?: boolean;
      remoteJid?: string | null;
      participant?: string | null;
    } | null;
    [key: string]: any;
  } | null;
}

export interface Reaction {
  emoji: string;
  senderName: string;
  participant: string;
}

interface ChatAreaProps {
  ticket: Ticket | null;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onSendAttachment?: (file: File) => void | Promise<void>;
  onSendAudio?: (audioBlob: Blob) => void | Promise<void>;
  onReactToMessage?: (messageWid: string, emoji: string) => void | Promise<void>;
  onCloseTicket?: () => void;
  onReturnToPending?: () => void;
  onTransfer?: () => void;
  onScheduleMessage?: () => void;
  onViewContact?: () => void;
  onBack?: () => void;
  loading?: boolean;
}

export function ChatArea({ 
  ticket, 
  messages, 
  onSendMessage,
  onSendAttachment,
  onSendAudio,
  onReactToMessage,
  onCloseTicket, 
  onReturnToPending,
  onTransfer,
  onScheduleMessage,
  onViewContact,
  onBack, 
  loading 
}: ChatAreaProps) {
  const [inputMessage, setInputMessage] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process messages to separate reactions and group them by target message
  const { displayMessages, reactionsMap } = useMemo(() => {
    const reactions: Message[] = [];
    const regularMessages: Message[] = [];
    const reactionsByMessageId = new Map<string, Reaction[]>();

    // First pass: separate reactions from regular messages
    messages.forEach(msg => {
      const isReactionMessage =
        msg.data_json?.messageType === 'reactionMessage' ||
        /^\[Reação:\s*/.test(msg.body);

      if (isReactionMessage) {
        reactions.push(msg);
      } else {
        regularMessages.push(msg);
      }
    });

    // Second pass: group reactions by target message wid
    reactions.forEach(reaction => {
      const targetWid = reaction.data_json?.key?.id;
      if (!targetWid) return;

      // Extract emoji from body like "[Reação: ❤️]"
      const emojiMatch = reaction.body.match(/\[Reação:\s*(.+?)\]/);
      const emoji = emojiMatch ? emojiMatch[1].trim() : '👍';
      
      const senderName = reaction.data_json?.senderName || 
                         reaction.data_json?.pushName || 
                         reaction.participant?.replace(/@.*$/, '') || 
                         'Alguém';

      const existingReactions = reactionsByMessageId.get(targetWid) || [];
      existingReactions.push({
        emoji,
        senderName,
        participant: reaction.participant || '',
      });
      reactionsByMessageId.set(targetWid, existingReactions);
    });

    return { displayMessages: regularMessages, reactionsMap: reactionsByMessageId };
  }, [messages]);

  const handleEmojiSelect = (emoji: string) => {
    setInputMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSendAttachment) {
      void onSendAttachment(file);
    }
    // Reset input to allow selecting same file again
    e.target.value = '';
  };

  // Scroll to bottom when messages change or ticket changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    };
    // Small delay to ensure DOM is updated
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, ticket?.id]);

  useEffect(() => {
    if (ticket && inputRef.current) {
      inputRef.current.focus();
    }
  }, [ticket?.id]);

  const handleSend = () => {
    if (inputMessage.trim()) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSendErrorSummary = (message: Message) => {
    const body = message?.data_json?.send_error?.body;
    if (typeof body !== 'string') return null;

    try {
      const parsed = JSON.parse(body);
      const msg = parsed?.response?.message;
      if (Array.isArray(msg) && msg.length > 0) {
        const first = msg[0];
        return Array.isArray(first) ? String(first[0]) : String(first);
      }
    } catch {
      // ignore
    }

    const lowered = body.toLowerCase();
    if (lowered.includes('not-acceptable') || lowered.includes('not acceptable')) return 'not-acceptable';

    return null;
  };

  const getAckIcon = (message: Message) => {
    switch (message.ack) {
      case -1: {
        const summary = getSendErrorSummary(message);
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="flex flex-col gap-0.5">
                <span>Falha no envio</span>
                {summary && <span className="text-muted-foreground">{summary}</span>}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      }
      case 0:
        return <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />;
      case 1:
        return <Check className="h-3.5 w-3.5 text-muted-foreground/70" />;
      case 2:
        return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/70" />;
      case 3:
      case 4:
        return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />;
      default:
        return null;
    }
  };

  if (!ticket) {
    return (
      <div className="flex h-full items-center justify-center chat-background rounded-2xl">
        <div className="text-center space-y-6 p-8 animate-fade-up">
          <div className="w-40 h-40 mx-auto neu-pressed rounded-3xl flex items-center justify-center">
            <img src={hubfitLogoIcon} alt="HubFit" className="w-28 h-28 object-contain opacity-80" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Bem-vindo ao Chat</h3>
            <p className="text-muted-foreground max-w-sm">
              Selecione um atendimento na lista ao lado para iniciar a conversa
            </p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary/50 animate-pulse" />
            <div className="h-2 w-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="h-2 w-2 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden rounded-2xl">
      {/* Chat Header - Premium Glassmorphism style */}
      <div className="relative px-5 py-4 flex items-center gap-4 chat-header-glass">
        {/* Gradient accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 gradient-coral" />
        
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden rounded-xl hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        {/* Avatar with premium glow effect */}
        <div className="relative group">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Avatar className="h-12 w-12 ring-2 ring-primary/30 shadow-lg relative">
            <AvatarImage src={ticket.contact.profile_pic_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold">
              {getInitials(ticket.contact.name)}
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-success ring-2 ring-card shadow-lg status-dot-online" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-foreground truncate text-lg tracking-tight">{ticket.contact.name}</h3>
            <EngagementScoreBadge 
              level={ticket.contact.engagement_level} 
              score={ticket.contact.engagement_score}
              size="sm"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium">{ticket.contact.number}</span>
        </div>

        <div className="flex items-center gap-2">
          {ticket.queue && (
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  className="hidden sm:flex px-3 py-1 rounded-lg font-medium"
                  style={{ 
                    backgroundColor: `${ticket.queue.color}20`,
                    color: ticket.queue.color,
                    border: `1px solid ${ticket.queue.color}40`
                  }}
                >
                  {ticket.queue.name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Fila: {ticket.queue.name}</TooltipContent>
            </Tooltip>
          )}
          
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50">
            <Search className="h-5 w-5" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1">
              <DropdownMenuItem onClick={onViewContact} className="rounded-lg">
                <User className="mr-2 h-4 w-4" />
                Ver contato
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem onClick={onTransfer} className="rounded-lg">
                <UserPlus className="mr-2 h-4 w-4" />
                Transferir
              </DropdownMenuItem>
              {ticket.status === 'open' && (
                <DropdownMenuItem onClick={onReturnToPending} className="rounded-lg">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Devolver para pendentes
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onScheduleMessage} className="rounded-lg">
                <CalendarClock className="mr-2 h-4 w-4" />
                Agendar mensagem
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive rounded-lg"
                onClick={onCloseTicket}
              >
                <Ban className="mr-2 h-4 w-4" />
                Encerrar atendimento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact Tags Bar */}
      <ContactTagsBar contactId={ticket.contact.id} />

      {/* Messages Area - Enhanced background */}
      <ScrollArea className="flex-1 min-h-0 chat-background" ref={scrollRef}>
        <div className="p-4 pr-4 pb-8 min-h-full">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className={cn("flex animate-fade-up", i % 2 === 0 ? "justify-end" : "justify-start")} style={{ animationDelay: `${i * 100}ms` }}>
                  <div className={cn(
                    "max-w-[65%] rounded-2xl p-4 animate-pulse",
                    i % 2 === 0 ? "bg-[hsl(var(--chat-bubble-sent))]" : "bg-[hsl(var(--chat-bubble-received))]"
                  )}>
                    <div className="h-4 w-32 bg-muted/50 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <div className="neu-flat px-6 py-3 rounded-2xl">
                <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda</p>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {displayMessages.map((message, index) => {
                const showDate = index === 0 || 
                  !isSameDay(parseISO(message.created_at), parseISO(displayMessages[index - 1].created_at));
                
                // Get reactions for this message
                const messageReactions = message.wid ? reactionsMap.get(message.wid) : undefined;
                const hasReactions = messageReactions && messageReactions.length > 0;
                
                // Group reactions by emoji to show count
                const groupedReactions = hasReactions 
                  ? messageReactions.reduce((acc, r) => {
                      const existing = acc.find(g => g.emoji === r.emoji);
                      if (existing) {
                        existing.count++;
                        existing.senders.push(r.senderName);
                      } else {
                        acc.push({ emoji: r.emoji, count: 1, senders: [r.senderName] });
                      }
                      return acc;
                    }, [] as { emoji: string; count: number; senders: string[] }[])
                  : [];

                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="date-separator text-muted-foreground text-xs px-4 py-1.5 rounded-full font-medium">
                          {format(parseISO(message.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    )}
                    <div 
                      className={cn(
                        "flex mb-1 group relative px-1 sm:px-2",
                        message.from_me ? "justify-end" : "justify-start",
                        hasReactions && "mb-4" // Extra margin for reactions
                      )}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => setHoveredMessageId(null)}
                    >
                      <div className={cn(
                        // Balão de mensagem - padding mais confortável (texto menos “colado” à esquerda)
                        "max-w-[75%] md:max-w-[70%] rounded-lg px-4 pr-14 pt-2 shadow-sm relative",
                        message.original_body && (message.is_edited || message.is_deleted) ? "pb-7" : "pb-5",
                        message.from_me 
                          ? "chat-bubble-sent rounded-br-md" 
                          : "chat-bubble-received rounded-bl-md",
                        message.is_deleted && "italic opacity-70"
                      )}>
                        {/* Reaction button - appears on hover */}
                        {onReactToMessage && message.wid && !message.is_deleted && ticket.status !== 'closed' && (
                          <div className={cn(
                            "absolute top-0 z-10 transition-opacity duration-150",
                            hoveredMessageId === message.id ? "opacity-100" : "opacity-0 pointer-events-none",
                            message.from_me ? "right-full mr-2" : "left-full ml-2"
                          )}>
                            <MessageReactionPicker
                              onReact={(emoji) => onReactToMessage(message.wid!, emoji)}
                            />
                          </div>
                        )}

                        {/* Show sender name for group messages */}
                        {ticket.is_group && !message.from_me && (
                          <p className="text-xs font-semibold text-primary mb-0.5">
                            {message.data_json?.senderName ||
                              message.data_json?.pushName ||
                              (message.participant ? message.participant.replace(/@.*$/, '') : 'Participante')}
                          </p>
                        )}
                        {message.media_url && (message.media_type === 'image' || message.media_type?.startsWith('image')) && (
                          <img 
                            src={message.media_url} 
                            alt="Imagem" 
                            className="rounded-lg mb-2 max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setLightboxImage(message.media_url!)}
                          />
                        )}
                        {message.media_url && (message.media_type === 'video' || message.media_type?.startsWith('video')) && (
                          <video 
                            src={message.media_url} 
                            controls
                            className="rounded-lg mb-2 max-w-full"
                          />
                        )}
                        {message.media_url && (message.media_type === 'audio' || message.media_type === 'ptt' || message.media_type?.startsWith('audio')) && (
                          <AudioPlayer 
                            src={message.media_url} 
                            fromMe={message.from_me}
                          />
                        )}
                        {message.media_url && (message.media_type === 'document') && (
                          <a 
                            href={message.media_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary underline text-sm mb-2 block"
                          >
                            📎 Abrir arquivo
                          </a>
                        )}
                        {message.media_url && (message.media_type === 'sticker') && (
                          <img
                            src={message.media_url}
                            alt="Figurinha"
                            className="mb-2 max-w-[160px] rounded-md"
                          />
                        )}
                        {/* Message body */}
                        <p className={cn(
                          "text-sm whitespace-pre-wrap break-words",
                          message.is_deleted && "text-muted-foreground italic"
                        )}>
                          {message.is_deleted ? (
                            <span className="inline-flex items-center gap-1">
                              <Ban className="h-3 w-3 shrink-0" />
                              Mensagem apagada
                            </span>
                          ) : message.body}
                        </p>
                        
                        {/* Show original message for edited/deleted messages */}
                        {message.original_body && (message.is_edited || message.is_deleted) && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="mt-1.5 pt-1.5 border-t border-border/30 cursor-help">
                                <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70 mb-0.5">
                                  {message.is_deleted ? (
                                    <>
                                      <Eye className="h-3 w-3" />
                                      <span>Mensagem original:</span>
                                    </>
                                  ) : (
                                    <>
                                      <Pencil className="h-3 w-3" />
                                      <span>Antes da edição:</span>
                                    </>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground/80 italic line-clamp-2">
                                  {message.original_body}
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p className="text-sm whitespace-pre-wrap">{message.original_body}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        
                        {/* Timestamp row - positioned at bottom right */}
                        <span className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] text-muted-foreground whitespace-nowrap">
                          {message.is_edited && !message.is_deleted && (
                            <span className="text-muted-foreground/70">Editada</span>
                          )}
                          {/* Indicator for messages sent from phone (from_me but without sentFromSystem flag) */}
                          {message.from_me && !message.data_json?.sentFromSystem && message.wid && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Phone className="h-3 w-3 text-muted-foreground/70" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Enviado pelo celular
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {format(parseISO(message.created_at), 'HH:mm')}
                          {message.from_me && getAckIcon(message)}
                        </span>

                        {/* Reactions - WhatsApp style at bottom right corner, outside bubble */}
                        {hasReactions && (
                          <div className={cn(
                            "absolute -bottom-3 flex items-center gap-0.5",
                            message.from_me ? "right-1" : "left-1"
                          )}>
                            {groupedReactions.map((reaction, idx) => (
                              <Tooltip key={idx}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center bg-card border border-border rounded-full px-1.5 py-0.5 shadow-sm cursor-default hover:scale-105 transition-transform">
                                    <span className="text-sm">{reaction.emoji}</span>
                                    {reaction.count > 1 && (
                                      <span className="text-[10px] text-muted-foreground ml-0.5">{reaction.count}</span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p className="text-sm font-medium mb-1">{reaction.emoji} Reações</p>
                                  <p className="text-xs text-muted-foreground">
                                    {reaction.senders.slice(0, 5).join(', ')}
                                    {reaction.senders.length > 5 && ` e mais ${reaction.senders.length - 5}`}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Reference element for scroll to bottom */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area - Premium style */}
      <div className="p-4 chat-input-area">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <EmojiPicker 
              onEmojiSelect={handleEmojiSelect} 
              disabled={ticket.status === 'closed'}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
              onClick={() => fileInputRef.current?.click()}
              disabled={ticket.status === 'closed' || !onSendAttachment}
              title={!onSendAttachment ? 'Envio de anexos ainda não configurado' : 'Anexar'}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Template Selector for Cloud API */}
          <TemplateSelector
            contactId={ticket.contact?.id}
            ticketId={ticket.id}
          />
          
          
          {/* Show audio recorder or text input based on whether there's text */}
          {inputMessage.trim() ? (
            <>
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Digite uma mensagem..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-11 rounded-2xl chat-input-field pl-4 pr-4 text-sm"
                  disabled={ticket.status === 'closed'}
                />
              </div>
              <Button 
                size="icon" 
                className="h-11 w-11 rounded-xl flex-shrink-0 send-button-glow"
                onClick={handleSend}
                disabled={!inputMessage.trim() || ticket.status === 'closed'}
              >
                <Send className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  placeholder="Digite uma mensagem..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="h-11 rounded-2xl chat-input-field pl-4 pr-4 text-sm"
                  disabled={ticket.status === 'closed'}
                />
              </div>
              {onSendAudio ? (
                <AudioRecorder 
                  onSend={async (blob) => {
                    await onSendAudio(blob);
                  }}
                  disabled={ticket.status === 'closed'}
                />
              ) : (
                <Button 
                  size="icon" 
                  className="h-10 w-10 rounded-full flex-shrink-0"
                  onClick={handleSend}
                  disabled={!inputMessage.trim() || ticket.status === 'closed'}
                >
                  <Send className="h-5 w-5" />
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Image Lightbox */}
      <ImageLightbox
        src={lightboxImage || ''}
        isOpen={!!lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
