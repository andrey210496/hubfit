import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMemberAuth } from '@/hooks/useMemberAuth';
import { useMemberSchedule } from '@/hooks/useMemberSchedule';
import { useMemberAnnouncements } from '@/hooks/useMemberAnnouncements';
import { useMemberPayments } from '@/hooks/useMemberPayments';
import { useMemberHistory } from '@/hooks/useMemberHistory';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Loader2, 
  Dumbbell, 
  Calendar, 
  Bell, 
  CreditCard, 
  History, 
  LogOut, 
  User,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Megaphone
} from 'lucide-react';

export default function MemberDashboard() {
  const { user, loading, isMember, memberProfile, signOut } = useMemberAuth();
  const { sessions, bookings, isLoading: scheduleLoading, bookSession, cancelBooking, isSessionBooked, getBookingForSession } = useMemberSchedule(14);
  const { announcements, isLoading: announcementsLoading } = useMemberAnnouncements();
  const { payments, pendingPayments, overduePayments, isLoading: paymentsLoading } = useMemberPayments();
  const { accessHistory, thisMonthCheckins, isLoading: historyLoading } = useMemberHistory();
  
  const [activeTab, setActiveTab] = useState('agenda');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/aluno/login" replace />;
  }

  if (!isMember) {
    return <Navigate to="/aluno/login" replace />;
  }

  const formatSessionDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const groupSessionsByDate = () => {
    const grouped: { [key: string]: typeof sessions } = {};
    sessions.forEach(session => {
      if (!grouped[session.session_date]) {
        grouped[session.session_date] = [];
      }
      grouped[session.session_date].push(session);
    });
    return grouped;
  };

  const sessionsByDate = groupSessionsByDate();
  const myBookings = bookings.filter(b => b.status === 'confirmed' && b.class_session);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Dumbbell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-foreground">Olá, {memberProfile?.contact_name?.split(' ')[0]}!</h1>
              <p className="text-xs text-muted-foreground">{memberProfile?.fitness_plan_name || 'Sem plano ativo'}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Quick Stats */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-2xl p-4 border border-green-500/20">
            <div className="text-2xl font-bold text-green-500">{thisMonthCheckins}</div>
            <div className="text-xs text-muted-foreground">Check-ins este mês</div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-2xl p-4 border border-blue-500/20">
            <div className="text-2xl font-bold text-blue-500">{myBookings.length}</div>
            <div className="text-xs text-muted-foreground">Aulas agendadas</div>
          </div>
          <div className={`bg-gradient-to-br rounded-2xl p-4 border ${overduePayments.length > 0 ? 'from-red-500/10 to-red-500/5 border-red-500/20' : 'from-primary/10 to-primary/5 border-primary/20'}`}>
            <div className={`text-2xl font-bold ${overduePayments.length > 0 ? 'text-red-500' : 'text-primary'}`}>
              {pendingPayments.length + overduePayments.length}
            </div>
            <div className="text-xs text-muted-foreground">Pagamentos pendentes</div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-4xl mx-auto px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4 h-12 rounded-2xl bg-muted/50 p-1">
            <TabsTrigger value="agenda" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="avisos" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5 relative">
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Avisos</span>
              {announcements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {announcements.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Financeiro</span>
            </TabsTrigger>
            <TabsTrigger value="historico" className="rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-sm gap-1.5">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Histórico</span>
            </TabsTrigger>
          </TabsList>

          {/* Agenda Tab */}
          <TabsContent value="agenda" className="mt-6">
            <div className="space-y-6">
              {/* My Bookings */}
              {myBookings.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    Minhas Reservas
                  </h3>
                  <div className="space-y-2">
                    {myBookings.slice(0, 3).map((booking) => (
                      <div 
                        key={booking.id}
                        className="bg-gradient-to-r from-green-500/10 to-transparent rounded-xl p-4 border border-green-500/20 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-12 rounded-full"
                            style={{ backgroundColor: booking.class_session?.class_type?.color || '#7C3AED' }}
                          />
                          <div>
                            <div className="font-medium">{booking.class_session?.class_type?.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatSessionDate(booking.class_session?.session_date || '')} às {booking.class_session?.start_time?.slice(0, 5)}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => cancelBooking.mutate(booking.id)}
                          disabled={cancelBooking.isPending}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Sessions */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Aulas Disponíveis
                </h3>
                
                {scheduleLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : Object.keys(sessionsByDate).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhuma aula disponível no momento</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-6 pr-4">
                      {Object.entries(sessionsByDate).map(([date, daySessions]) => (
                        <div key={date}>
                          <div className="text-sm font-medium text-muted-foreground mb-3 capitalize">
                            {formatSessionDate(date)}
                          </div>
                          <div className="space-y-2">
                            {daySessions.map((session) => {
                              const isBooked = isSessionBooked(session.id);
                              const isFull = session.current_bookings >= session.max_capacity;
                              const spotsLeft = session.max_capacity - session.current_bookings;
                              
                              return (
                                <div
                                  key={session.id}
                                  className={`rounded-xl p-4 border transition-all ${
                                    isBooked 
                                      ? 'bg-green-500/10 border-green-500/30' 
                                      : isFull 
                                        ? 'bg-muted/30 border-border/30 opacity-60'
                                        : 'bg-background border-border/50 hover:border-primary/30 hover:shadow-md'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="w-3 h-12 rounded-full"
                                        style={{ backgroundColor: session.class_type?.color || '#7C3AED' }}
                                      />
                                      <div>
                                        <div className="font-medium">{session.class_type?.name}</div>
                                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                          <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5)}
                                          </span>
                                          <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {session.current_bookings}/{session.max_capacity}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    {isBooked ? (
                                      <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                        Confirmado
                                      </Badge>
                                    ) : isFull ? (
                                      <Badge variant="secondary" className="opacity-60">
                                        Lotada
                                      </Badge>
                                    ) : (
                                      <Button
                                        size="sm"
                                        className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
                                        onClick={() => bookSession.mutate(session.id)}
                                        disabled={bookSession.isPending}
                                      >
                                        {bookSession.isPending ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <>
                                            Check-in
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {!isBooked && !isFull && spotsLeft <= 3 && (
                                    <div className="mt-2 text-xs text-orange-500 flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      Apenas {spotsLeft} vaga{spotsLeft > 1 ? 's' : ''} restante{spotsLeft > 1 ? 's' : ''}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Avisos Tab */}
          <TabsContent value="avisos" className="mt-6">
            {announcementsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum aviso no momento</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((announcement) => (
                  <div 
                    key={announcement.id}
                    className="bg-background rounded-2xl p-5 border border-border/50 shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground mb-1">{announcement.title}</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.text}</p>
                        <div className="mt-3 text-xs text-muted-foreground">
                          {format(parseISO(announcement.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Financeiro Tab */}
          <TabsContent value="financeiro" className="mt-6">
            {paymentsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum registro financeiro</p>
              </div>
            ) : (
              <div className="space-y-4">
                {overduePayments.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-red-500 font-medium mb-2">
                      <AlertCircle className="w-5 h-5" />
                      Pagamentos Atrasados
                    </div>
                    {overduePayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-foreground">{payment.fitness_plan?.name || 'Mensalidade'}</div>
                          <div className="text-sm text-muted-foreground">
                            Venceu em {format(parseISO(payment.due_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-red-500">
                            R$ {payment.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {pendingPayments.length > 0 && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                    <div className="flex items-center gap-2 text-orange-500 font-medium mb-2">
                      <Clock className="w-5 h-5" />
                      Pagamentos Pendentes
                    </div>
                    {pendingPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="font-medium text-foreground">{payment.fitness_plan?.name || 'Mensalidade'}</div>
                          <div className="text-sm text-muted-foreground">
                            Vence em {format(parseISO(payment.due_date), 'dd/MM/yyyy')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-foreground">
                            R$ {payment.amount.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h4 className="font-semibold text-foreground mt-6 mb-3">Histórico de Pagamentos</h4>
                <div className="space-y-2">
                  {payments.filter(p => p.status === 'paid').slice(0, 10).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div>
                        <div className="font-medium text-foreground">{payment.fitness_plan?.name || 'Mensalidade'}</div>
                        <div className="text-sm text-muted-foreground">
                          Pago em {payment.paid_at ? format(parseISO(payment.paid_at), 'dd/MM/yyyy') : '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-500">
                          R$ {payment.amount.toFixed(2)}
                        </div>
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-500">
                          Pago
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Histórico Tab */}
          <TabsContent value="historico" className="mt-6">
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : accessHistory.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum registro de acesso</p>
              </div>
            ) : (
              <div className="space-y-2">
                {accessHistory.map((log) => (
                  <div 
                    key={log.id}
                    className="flex items-center justify-between py-3 px-4 bg-background rounded-xl border border-border/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        log.status === 'checked_in' ? 'bg-green-500/10' : 'bg-muted'
                      }`}>
                        {log.status === 'checked_in' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <LogOut className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {log.status === 'checked_in' ? 'Check-in' : 'Check-out'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(log.checkin_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {log.checkin_method || 'manual'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Bottom padding for mobile */}
      <div className="h-20" />
    </div>
  );
}
