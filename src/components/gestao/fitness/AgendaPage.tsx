import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  UserCheck,
  RefreshCw,
  MoreHorizontal,
  Ban,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { useAgendaSessions, type AgendaSession, type SessionBooking } from '@/hooks/useAgendaSessions';
import { format, addDays, subDays, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader, EmptyState, StatsCard, DataCard, DataCardContent } from '@/components/gestao/ui';
import { cn } from '@/lib/utils';

export function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { sessions, isLoading, refetch, markAttended, markNoShow, cancelSession } = useAgendaSessions(selectedDate);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const toggleSession = (sessionId: string) => {
    setExpandedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const goToPreviousDay = () => setSelectedDate(prev => subDays(prev, 1));
  const goToNextDay = () => setSelectedDate(prev => addDays(prev, 1));
  const goToToday = () => setSelectedDate(new Date());

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusBadge = (booking: SessionBooking) => {
    switch (booking.status) {
      case 'attended':
        return (
          <Badge className="bg-success/15 text-success border-success/30 rounded-lg gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Presente
          </Badge>
        );
      case 'no_show':
        return (
          <Badge className="bg-destructive/15 text-destructive border-destructive/30 rounded-lg gap-1">
            <XCircle className="h-3 w-3" />
            Faltou
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="rounded-lg gap-1">
            <Clock className="h-3 w-3" />
            Reservado
          </Badge>
        );
    }
  };

  const totalSessions = sessions.filter(s => !s.is_cancelled).length;
  const totalBookings = sessions.reduce((acc, s) => acc + (s.bookings?.length || 0), 0);
  const totalAttended = sessions.reduce(
    (acc, s) => acc + (s.bookings?.filter(b => b.status === 'attended').length || 0),
    0
  );
  const isPastDate = isBefore(startOfDay(selectedDate), startOfDay(new Date()));

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Agenda"
        description="Visualize as aulas e presenças do dia"
        icon={<Calendar className="h-6 w-6" />}
        actions={
          <Button 
            variant="outline" 
            onClick={() => refetch()} 
            className="gap-2 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
        }
      />

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-2xl bg-card border border-border/50">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousDay}
          className="rounded-xl"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <h2 className="text-xl font-semibold">
              {format(selectedDate, "EEEE", { locale: ptBR })}
            </h2>
            <p className="text-muted-foreground">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          {!isToday(selectedDate) && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="rounded-xl"
            >
              Hoje
            </Button>
          )}
          {isToday(selectedDate) && (
            <Badge className="bg-primary/15 text-primary border-primary/30 rounded-lg">
              Hoje
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextDay}
          className="rounded-xl"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<Calendar className="h-5 w-5" />}
          value={totalSessions}
          label="Aulas programadas"
          color="primary"
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          value={totalBookings}
          label="Reservas"
          color="info"
        />
        <StatsCard
          icon={<UserCheck className="h-5 w-5" />}
          value={totalAttended}
          label="Presenças confirmadas"
          color="success"
        />
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <EmptyState
            icon={<Calendar className="h-10 w-10" />}
            title="Nenhuma aula programada"
            description="Não há aulas agendadas para este dia."
          />
        ) : (
          sessions.map((session, index) => (
            <Collapsible
              key={session.id}
              open={expandedSessions.has(session.id)}
              onOpenChange={() => toggleSession(session.id)}
            >
              <DataCard 
                className={cn(
                  "animate-fade-up",
                  session.is_cancelled && "opacity-60"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                hover={false}
              >
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-2xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Time */}
                        <div className="text-center min-w-[60px]">
                          <p className="text-2xl font-bold font-mono">
                            {session.start_time.slice(0, 5)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            até {session.end_time.slice(0, 5)}
                          </p>
                        </div>

                        {/* Divider */}
                        <div 
                          className="w-1 h-12 rounded-full"
                          style={{ backgroundColor: session.class_type?.color || '#7C3AED' }}
                        />

                        {/* Class Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {session.class_type?.name || 'Aula'}
                            </h3>
                            {session.is_cancelled && (
                              <Badge variant="destructive" className="rounded-lg gap-1">
                                <Ban className="h-3 w-3" />
                                Cancelada
                              </Badge>
                            )}
                          </div>
                          {session.instructor && (
                            <p className="text-sm text-muted-foreground">
                              Prof. {session.instructor.name}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Capacity Badge */}
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "rounded-lg gap-1",
                              session.current_bookings >= session.max_capacity && "border-warning text-warning"
                            )}
                          >
                            <Users className="h-3 w-3" />
                            {session.bookings?.length || 0} / {session.max_capacity}
                          </Badge>
                        </div>

                        {/* Expand Icon */}
                        <ChevronDown 
                          className={cn(
                            "h-5 w-5 text-muted-foreground transition-transform duration-200",
                            expandedSessions.has(session.id) && "rotate-180"
                          )} 
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="border-t border-border/50 p-4 space-y-3">
                    {(!session.bookings || session.bookings.length === 0) ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma reserva para esta aula</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-sm text-muted-foreground">
                            Alunos inscritos ({session.bookings.length})
                          </h4>
                          {!session.is_cancelled && !isPastDate && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4" />
                                  Ações
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => cancelSession.mutate(session.id)}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Cancelar aula
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        <div className="grid gap-2">
                          {session.bookings.map((booking) => {
                            // Get name from member or contact (for trial bookings)
                            const contactName = booking.member?.contact?.name || booking.contact?.name || 'Sem nome';
                            const profilePic = booking.member?.contact?.profile_pic_url || booking.contact?.profile_pic_url;
                            const planName = booking.member?.fitness_plan?.name;
                            
                            return (
                              <div 
                                key={booking.id}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-xl border border-border/30",
                                  booking.is_trial 
                                    ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30" 
                                    : "bg-muted/30"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-10 w-10 rounded-lg">
                                    <AvatarImage src={profilePic || undefined} />
                                    <AvatarFallback className={cn(
                                      "text-xs rounded-lg",
                                      booking.is_trial 
                                        ? "bg-amber-500/20 text-amber-600" 
                                        : "bg-primary/10 text-primary"
                                    )}>
                                      {getInitials(contactName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium">{contactName}</p>
                                      {booking.is_trial && (
                                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 rounded-lg gap-1 text-xs">
                                          <Sparkles className="h-3 w-3" />
                                          Experimental
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {booking.is_trial ? 'Aula experimental' : (planName || 'Sem plano')}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  {getStatusBadge(booking)}

                                  {!session.is_cancelled && booking.status === 'confirmed' && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-success/10 hover:text-success"
                                        onClick={() => markAttended.mutate(booking.id)}
                                        disabled={markAttended.isPending}
                                        title="Confirmar presença"
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                        onClick={() => markNoShow.mutate(booking.id)}
                                        disabled={markNoShow.isPending}
                                        title="Marcar falta"
                                      >
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </CollapsibleContent>
              </DataCard>
            </Collapsible>
          ))
        )}
      </div>
    </div>
  );
}
