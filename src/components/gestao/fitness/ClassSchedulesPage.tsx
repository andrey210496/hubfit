import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Calendar, Clock, Users, Copy, ChevronLeft, ChevronRight, CheckCircle2, Info, MapPin, ListPlus } from 'lucide-react';
import { useClassSchedules, dayOfWeekLabels, dayOfWeekShortLabels, type CreateClassScheduleData } from '@/hooks/useClassSchedules';
import { useClassTypes } from '@/hooks/useClassTypes';
import { useClassRooms } from '@/hooks/useClassRooms';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BulkScheduleModal } from './BulkScheduleModal';
import { toast } from 'sonner';

// Time slots from 5:00 to 23:00
const timeSlots = Array.from({ length: 19 }, (_, i) => {
  const hour = i + 5;
  return `${hour.toString().padStart(2, '0')}:00`;
});

export function ClassSchedulesPage() {
  const { schedules, isLoading, createSchedule, updateSchedule, deleteSchedule } = useClassSchedules();
  const { classTypes } = useClassTypes();
  const { activeRooms, rooms } = useClassRooms();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<typeof schedules[0] | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Multiple days selection
  const [formData, setFormData] = useState<Omit<CreateClassScheduleData, 'day_of_week'>>({
    class_type_id: '',
    instructor_id: null,
    room_id: null,
    start_time: '07:00',
    end_time: '08:00',
    max_capacity: null,
    is_active: true,
  });

  const handleBulkSubmit = async (schedulesList: CreateClassScheduleData[]) => {
    setIsBulkSubmitting(true);
    try {
      for (const schedule of schedulesList) {
        await createSchedule.mutateAsync(schedule);
      }
      toast.success(`${schedulesList.length} horário(s) criados com sucesso!`);
    } catch (error) {
      toast.error('Erro ao criar horários');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  // Group schedules by day of week
  const schedulesByDay = useMemo(() => 
    dayOfWeekLabels.map((_, dayIndex) => ({
      day: dayIndex,
      label: dayOfWeekLabels[dayIndex],
      shortLabel: dayOfWeekShortLabels[dayIndex],
      schedules: schedules
        .filter(s => s.day_of_week === dayIndex)
        .sort((a, b) => a.start_time.localeCompare(b.start_time)),
    })),
    [schedules]
  );

  // Get schedules organized by time slot for grid view
  const getScheduleAtTime = (dayIndex: number, timeSlot: string) => {
    const hour = parseInt(timeSlot.split(':')[0]);
    return schedules.filter(s => {
      const startHour = parseInt(s.start_time.split(':')[0]);
      const endHour = parseInt(s.end_time.split(':')[0]);
      return s.day_of_week === dayIndex && startHour <= hour && endHour > hour;
    });
  };

  const resetForm = () => {
    setFormData({
      class_type_id: '',
      instructor_id: null,
      room_id: null,
      start_time: '07:00',
      end_time: '08:00',
      max_capacity: null,
      is_active: true,
    });
    setSelectedDays([1]);
    setEditingSchedule(null);
  };

  const handleOpenDialog = (schedule?: typeof schedules[0], dayIndex?: number) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setSelectedDays([schedule.day_of_week]);
      setFormData({
        class_type_id: schedule.class_type_id,
        instructor_id: schedule.instructor_id,
        room_id: schedule.room_id,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        max_capacity: schedule.max_capacity,
        is_active: schedule.is_active,
      });
    } else {
      resetForm();
      if (dayIndex !== undefined) {
        setSelectedDays([dayIndex]);
      }
    }
    setIsDialogOpen(true);
  };

  const handleQuickAdd = (dayIndex: number, timeSlot: string) => {
    resetForm();
    setSelectedDays([dayIndex]);
    const endTime = calculateEndTime(timeSlot, 60);
    setFormData(prev => ({
      ...prev,
      start_time: timeSlot,
      end_time: endTime,
    }));
    setIsDialogOpen(true);
  };

  const handleDuplicateToDay = async (schedule: typeof schedules[0], targetDay: number) => {
    await createSchedule.mutateAsync({
      class_type_id: schedule.class_type_id,
      instructor_id: schedule.instructor_id,
      day_of_week: targetDay,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      max_capacity: schedule.max_capacity,
      is_active: schedule.is_active,
    });
  };

  const handleSubmit = async () => {
    if (!formData.class_type_id || selectedDays.length === 0) return;

    if (editingSchedule) {
      await updateSchedule.mutateAsync({ 
        id: editingSchedule.id, 
        ...formData,
        day_of_week: selectedDays[0], 
      });
    } else {
      // Create schedules for all selected days
      for (const day of selectedDays) {
        await createSchedule.mutateAsync({
          ...formData,
          day_of_week: day,
        });
      }
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const toggleDay = (day: number) => {
    if (editingSchedule) return; // Can't change days when editing
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const formatTime = (time: string) => {
    return time.slice(0, 5);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center shrink-0 pb-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Grade de Horários</h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-muted-foreground text-sm">Clique em um horário vazio para adicionar</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-xs text-success bg-success/10 px-2 py-1 rounded-full cursor-help">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Geração automática ativa</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>As aulas são geradas automaticamente para as próximas 8 semanas. Quando você altera a grade, as sessões futuras são atualizadas automaticamente.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)} 
            className="gap-2 rounded-xl"
          >
            <ListPlus className="h-4 w-4" />
            Cadastro em Massa
          </Button>
          <Button 
            onClick={() => handleOpenDialog()} 
            className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Plus className="h-4 w-4" />
            Novo Horário
          </Button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card">
        <ScrollArea className="h-full">
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-[70px_repeat(7,1fr)] sticky top-0 z-10 bg-muted/30 border-b backdrop-blur-sm">
              <div className="p-3 text-center text-xs font-semibold text-muted-foreground border-r border-border/50">
                Horário
              </div>
              {schedulesByDay.map(({ day, shortLabel, label }) => (
                <div 
                  key={day} 
                  className="p-3 text-center border-r border-border/50 last:border-r-0"
                >
                  <div className="font-semibold text-sm">{shortLabel}</div>
                  <div className="text-[10px] text-muted-foreground hidden md:block">{label}</div>
                </div>
              ))}
            </div>

            {/* Time slots grid */}
            <div className="divide-y divide-border/30">
              {timeSlots.map(timeSlot => (
                <div key={timeSlot} className="grid grid-cols-[70px_repeat(7,1fr)] min-h-[65px]">
                  <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border/50 flex items-start justify-center pt-2">
                    {timeSlot}
                  </div>
                  {schedulesByDay.map(({ day }) => {
                    const slotSchedules = getScheduleAtTime(day, timeSlot);
                    const isStartSlot = slotSchedules.filter(s => 
                      s.start_time.startsWith(timeSlot.split(':')[0])
                    );
                    
                      return (
                      <div 
                        key={`${day}-${timeSlot}`}
                        className={cn(
                          "border-r border-border/30 last:border-r-0 relative group cursor-pointer transition-colors",
                          slotSchedules.length === 0 && "hover:bg-primary/5"
                        )}
                        onClick={() => slotSchedules.length === 0 && handleQuickAdd(day, timeSlot)}
                      >
                        {isStartSlot.map((schedule, idx) => {
                          const startHour = parseInt(schedule.start_time.split(':')[0]);
                          const endHour = parseInt(schedule.end_time.split(':')[0]);
                          const endMin = parseInt(schedule.end_time.split(':')[1]);
                          const durationHours = endHour - startHour + (endMin > 0 ? 0.5 : 0);
                          const totalAtSlot = isStartSlot.length;
                          const slotWidth = totalAtSlot > 1 ? `calc(${100 / totalAtSlot}% - 4px)` : 'calc(100% - 8px)';
                          const slotLeft = totalAtSlot > 1 ? `calc(${(idx * 100) / totalAtSlot}% + 2px)` : '4px';
                          
                          return (
                            <div
                              key={schedule.id}
                              className="absolute top-1 z-10 rounded-xl p-1.5 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] hover:z-20 group/card overflow-hidden"
                              style={{
                                backgroundColor: schedule.class_type?.color || '#7C3AED',
                                height: `calc(${Math.max(durationHours, 1) * 65}px - 8px)`,
                                minHeight: '57px',
                                width: slotWidth,
                                left: slotLeft,
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDialog(schedule);
                              }}
                            >
                              <div className="text-[10px] font-medium text-white truncate leading-tight">
                                {schedule.class_type?.name}
                              </div>
                              <div className="text-[9px] text-white/80 flex items-center gap-0.5">
                                <Clock className="h-2 w-2 shrink-0" />
                                {formatTime(schedule.start_time)}-{formatTime(schedule.end_time)}
                              </div>
                              {schedule.room && (
                                <div className="text-[9px] text-white/80 flex items-center gap-0.5">
                                  <MapPin className="h-2 w-2 shrink-0" />
                                  <span className="truncate">{schedule.room.name}</span>
                                </div>
                              )}
                              <div className="text-[9px] text-white/80 flex items-center gap-0.5">
                                <Users className="h-2 w-2 shrink-0" />
                                {schedule.max_capacity || schedule.class_type?.max_capacity || 20}
                              </div>
                              {!schedule.is_active && (
                                <Badge variant="secondary" className="text-[7px] px-1 py-0 mt-0.5">
                                  Inativo
                                </Badge>
                              )}
                            </div>
                          );
                        })}

                        {/* Quick add button on hover */}
                        {slotSchedules.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Plus className="h-4 w-4 text-primary/50" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Dialog for adding/editing schedules */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingSchedule ? 'Editar Horário' : 'Novo Horário'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Day selection - multiple days when creating */}
            <div>
              <Label className="mb-2 block text-sm font-medium">
                {editingSchedule ? 'Dia da Semana' : 'Dias da Semana (selecione um ou mais)'}
              </Label>
              <div className="flex flex-wrap gap-2">
                {dayOfWeekLabels.map((label, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 px-4 rounded-xl transition-all",
                      selectedDays.includes(index) && "shadow-md",
                      editingSchedule && "pointer-events-none opacity-70"
                    )}
                    onClick={() => toggleDay(index)}
                  >
                    {dayOfWeekShortLabels[index]}
                  </Button>
                ))}
              </div>
              {!editingSchedule && selectedDays.length > 1 && (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  O horário será criado em {selectedDays.length} dias
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium">Modalidade *</Label>
              <Select
                value={formData.class_type_id}
                onValueChange={value => {
                  const classType = classTypes.find(ct => ct.id === value);
                  setFormData(prev => ({ 
                    ...prev, 
                    class_type_id: value,
                    end_time: classType ? calculateEndTime(prev.start_time, classType.duration_minutes) : prev.end_time,
                  }));
                }}
              >
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Selecione uma modalidade" />
                </SelectTrigger>
                <SelectContent>
                  {classTypes.filter(ct => ct.is_active).map(ct => (
                    <SelectItem key={ct.id} value={ct.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3.5 h-3.5 rounded-lg" 
                          style={{ backgroundColor: ct.color }} 
                        />
                        {ct.name} ({ct.duration_minutes}min)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Início *</Label>
                <Input
                  type="time"
                  value={formData.start_time}
                  className="mt-1.5 rounded-xl"
                  onChange={e => {
                    const classType = classTypes.find(ct => ct.id === formData.class_type_id);
                    setFormData(prev => ({ 
                      ...prev, 
                      start_time: e.target.value,
                      end_time: classType ? calculateEndTime(e.target.value, classType.duration_minutes) : prev.end_time,
                    }));
                  }}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Término *</Label>
                <Input
                  type="time"
                  value={formData.end_time}
                  className="mt-1.5 rounded-xl"
                  onChange={e => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Room selection */}
            {activeRooms.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Sala/Espaço (opcional)</Label>
                <Select
                  value={formData.room_id || 'none'}
                  onValueChange={value => setFormData(prev => ({ 
                    ...prev, 
                    room_id: value === 'none' ? null : value 
                  }))}
                >
                  <SelectTrigger className="mt-1.5 rounded-xl">
                    <SelectValue placeholder="Selecione uma sala" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Nenhuma sala</span>
                    </SelectItem>
                    {activeRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded" 
                            style={{ backgroundColor: room.color }} 
                          />
                          {room.name}
                          {room.capacity && <span className="text-muted-foreground text-xs">({room.capacity} vagas)</span>}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use salas para organizar aulas simultâneas no mesmo horário
                </p>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium">Capacidade (vagas)</Label>
              <Input
                type="number"
                min="1"
                value={formData.max_capacity ?? ''}
                className="mt-1.5 rounded-xl"
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  max_capacity: e.target.value ? parseInt(e.target.value) : null 
                }))}
                placeholder="Usar padrão da modalidade"
              />
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
              <Checkbox
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked as boolean }))}
                className="rounded"
              />
              <Label htmlFor="is_active" className="cursor-pointer font-normal">Horário ativo</Label>
            </div>

            {/* Delete button when editing */}
            {editingSchedule && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir horário
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        deleteSchedule.mutate(editingSchedule.id);
                        setIsDialogOpen(false);
                        resetForm();
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.class_type_id || selectedDays.length === 0 || createSchedule.isPending || updateSchedule.isPending}
                className="rounded-xl gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {editingSchedule ? 'Salvar' : `Criar${selectedDays.length > 1 ? ` (${selectedDays.length} dias)` : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Schedule Modal */}
      <BulkScheduleModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        classTypes={classTypes}
        rooms={rooms}
        onSubmit={handleBulkSubmit}
        isSubmitting={isBulkSubmitting}
      />
    </div>
  );
}

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}
