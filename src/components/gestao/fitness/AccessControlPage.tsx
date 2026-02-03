import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  QrCode, 
  UserCheck, 
  LogIn, 
  LogOut, 
  Clock, 
  Users,
  RefreshCw,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { useAccessLogs } from '@/hooks/useAccessLogs';
import { useMembers } from '@/hooks/useMembers';
import { format, parseISO, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHeader, EmptyState, SearchInput, StatsCard, DataCard, DataCardContent } from '@/components/gestao/ui';

export function AccessControlPage() {
  const today = new Date().toISOString().split('T')[0];
  const { accessLogs, checkedInMembers, isLoading, refetch, checkIn, checkOut } = useAccessLogs(today);
  const { members } = useMembers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  // Filter active members for check-in
  const activeMembers = members.filter(m => m.status === 'active');
  const checkedInMemberIds = checkedInMembers.map(log => log.member_id);
  const availableForCheckin = activeMembers.filter(m => !checkedInMemberIds.includes(m.id));

  const filteredLogs = accessLogs.filter(log =>
    log.member?.contact?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.member?.contact?.number.includes(searchTerm)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCheckin = async () => {
    if (!selectedMemberId) return;
    await checkIn.mutateAsync({ member_id: selectedMemberId, checkin_method: 'manual' });
    setIsCheckinDialogOpen(false);
    setSelectedMemberId('');
  };

  const isExpired = (expirationDate: string | null) => {
    if (!expirationDate) return false;
    return isBefore(parseISO(expirationDate), new Date());
  };

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
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <PageHeader
        title="Controle de Acesso"
        description={format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        icon={<Activity className="h-6 w-6" />}
        actions={
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => refetch()} 
              className="gap-2 rounded-xl flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            <Button 
              onClick={() => setIsCheckinDialogOpen(true)} 
              className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all flex-1 sm:flex-none"
            >
              <LogIn className="h-4 w-4" />
              Check-in Manual
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatsCard
          icon={<UserCheck className="h-5 w-5" />}
          value={checkedInMembers.length}
          label="No box agora"
          color="success"
        />
        <StatsCard
          icon={<LogIn className="h-5 w-5" />}
          value={accessLogs.length}
          label="Acessos hoje"
          color="primary"
        />
        <StatsCard
          icon={<Users className="h-5 w-5" />}
          value={activeMembers.length}
          label="Membros ativos"
          color="info"
        />
      </div>

      {/* Currently Checked In */}
      {checkedInMembers.length > 0 && (
        <DataCard className="mb-6" hover={false}>
          <DataCardContent>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-success/10">
                <UserCheck className="h-5 w-5 text-success" />
              </div>
              <h3 className="font-semibold">No Box Agora ({checkedInMembers.length})</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {checkedInMembers.map((log, index) => (
                <div 
                  key={log.id}
                  className="flex items-center gap-2 p-2.5 rounded-xl border bg-success/5 border-success/20 animate-fade-up group"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage src={log.member?.contact?.profile_pic_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs rounded-lg">
                      {getInitials(log.member?.contact?.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{log.member?.contact?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Desde {format(parseISO(log.checkin_at), 'HH:mm')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => checkOut.mutate(log.id)}
                    disabled={checkOut.isPending}
                    className="h-8 w-8 p-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </DataCardContent>
        </DataCard>
      )}

      {/* Access Logs */}
      <div className="space-y-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar nos acessos..."
          className="max-w-sm"
        />

        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-10 w-10" />}
            title="Nenhum acesso registrado hoje"
            description="Os check-ins e check-outs aparecerão aqui."
          />
        ) : (
          <div className="rounded-2xl border border-border/50 overflow-hidden bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Membro</TableHead>
                  <TableHead className="font-semibold">Plano</TableHead>
                  <TableHead className="font-semibold">Check-in</TableHead>
                  <TableHead className="font-semibold">Check-out</TableHead>
                  <TableHead className="font-semibold">Método</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log, index) => (
                  <TableRow 
                    key={log.id}
                    className="animate-fade-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarImage src={log.member?.contact?.profile_pic_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs rounded-lg">
                            {getInitials(log.member?.contact?.name || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{log.member?.contact?.name}</p>
                          <p className="text-xs text-muted-foreground">{log.member?.contact?.number}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.member?.fitness_plan?.name ? (
                        <Badge variant="outline" className="rounded-lg">
                          {log.member.fitness_plan.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {format(parseISO(log.checkin_at), 'HH:mm')}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {log.checkout_at ? (
                        format(parseISO(log.checkout_at), 'HH:mm')
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs rounded-lg gap-1">
                        {log.checkin_method === 'qr_code' ? (
                          <><QrCode className="h-3 w-3" /> QR Code</>
                        ) : (
                          'Manual'
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.status === 'checked_in' ? (
                        <Badge className="bg-success/15 text-success border-success/30 rounded-lg">
                          No box
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded-lg">Saiu</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Check-in Dialog */}
      <Dialog open={isCheckinDialogOpen} onOpenChange={setIsCheckinDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Check-in Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm font-medium">Selecione o membro</Label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Buscar membro..." />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {availableForCheckin.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <span>{member.contact?.name}</span>
                          {isExpired(member.expiration_date) && (
                            <AlertTriangle className="h-3 w-3 text-warning" />
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            {selectedMemberId && (() => {
              const member = members.find(m => m.id === selectedMemberId);
              if (member && isExpired(member.expiration_date)) {
                return (
                  <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 text-warning">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Plano vencido</span>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                      O plano deste membro está vencido. Considere renovar antes do check-in.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsCheckinDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={handleCheckin}
                disabled={!selectedMemberId || checkIn.isPending}
                className="rounded-xl gap-2"
              >
                <LogIn className="h-4 w-4" />
                Confirmar Check-in
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
