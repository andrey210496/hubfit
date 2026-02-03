import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Loader2, ListPlus } from 'lucide-react';
import { dayOfWeekLabels, dayOfWeekShortLabels, type CreateClassScheduleData } from '@/hooks/useClassSchedules';
import { cn } from '@/lib/utils';
import type { ClassType } from '@/hooks/useClassTypes';
import type { ClassRoom } from '@/hooks/useClassRooms';

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  classTypes: ClassType[];
  rooms: ClassRoom[];
  onSubmit: (schedules: CreateClassScheduleData[]) => Promise<void>;
  isSubmitting?: boolean;
}

// Time slots from 5:00 to 22:00
const availableTimeSlots = Array.from({ length: 18 }, (_, i) => {
  const hour = i + 5;
  return `${hour.toString().padStart(2, '0')}:00`;
});

function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
}

export function BulkScheduleModal({ 
  isOpen, 
  onClose, 
  classTypes, 
  rooms, 
  onSubmit,
  isSubmitting = false 
}: BulkScheduleModalProps) {
  const [selectedClassType, setSelectedClassType] = useState<string>('');
  const [selectedRoom, setSelectedRoom] = useState<string>('none');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);

  const activeClassTypes = classTypes.filter(ct => ct.is_active);
  const activeRooms = rooms.filter(r => r.is_active);

  const selectedClassTypeData = useMemo(() => 
    classTypes.find(ct => ct.id === selectedClassType),
    [classTypes, selectedClassType]
  );

  const totalSchedules = selectedDays.length * selectedTimes.length;

  const resetForm = () => {
    setSelectedClassType('');
    setSelectedRoom('none');
    setSelectedDays([]);
    setSelectedTimes([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    );
  };

  const toggleTime = (time: string) => {
    setSelectedTimes(prev => 
      prev.includes(time) 
        ? prev.filter(t => t !== time)
        : [...prev, time].sort()
    );
  };

  const selectAllDays = () => {
    if (selectedDays.length === 7) {
      setSelectedDays([]);
    } else {
      setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const selectWeekdays = () => {
    setSelectedDays([1, 2, 3, 4, 5]);
  };

  const handleSubmit = async () => {
    if (!selectedClassType || selectedDays.length === 0 || selectedTimes.length === 0) return;

    const schedules: CreateClassScheduleData[] = [];
    const duration = selectedClassTypeData?.duration_minutes || 60;

    for (const day of selectedDays) {
      for (const time of selectedTimes) {
        schedules.push({
          class_type_id: selectedClassType,
          room_id: selectedRoom === 'none' ? null : selectedRoom,
          instructor_id: null,
          day_of_week: day,
          start_time: time,
          end_time: calculateEndTime(time, duration),
          max_capacity: null,
          is_active: true,
        });
      }
    }

    await onSubmit(schedules);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg rounded-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-primary" />
            Cadastro em Massa
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5 py-2">
            {/* Modality Selection */}
            <div>
              <Label className="text-sm font-medium">Modalidade *</Label>
              <Select value={selectedClassType} onValueChange={setSelectedClassType}>
                <SelectTrigger className="mt-1.5 rounded-xl">
                  <SelectValue placeholder="Selecione uma modalidade" />
                </SelectTrigger>
                <SelectContent>
                  {activeClassTypes.map(ct => (
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

            {/* Room Selection */}
            {activeRooms.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Sala/Espaço</Label>
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
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
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Days Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Dias da Semana *</Label>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={selectWeekdays}
                  >
                    Seg-Sex
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={selectAllDays}
                  >
                    {selectedDays.length === 7 ? 'Limpar' : 'Todos'}
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {dayOfWeekLabels.map((_, index) => (
                  <Button
                    key={index}
                    type="button"
                    variant={selectedDays.includes(index) ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-10 px-4 rounded-xl transition-all",
                      selectedDays.includes(index) && "shadow-md"
                    )}
                    onClick={() => toggleDay(index)}
                  >
                    {dayOfWeekShortLabels[index]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Horários *</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedTimes.length} selecionado(s)
                </span>
              </div>
              <div className="grid grid-cols-6 gap-2 p-3 rounded-xl bg-muted/30 border">
                {availableTimeSlots.map(time => (
                  <Button
                    key={time}
                    type="button"
                    variant={selectedTimes.includes(time) ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-9 px-2 text-xs rounded-lg transition-all",
                      selectedTimes.includes(time) && "shadow-sm"
                    )}
                    onClick={() => toggleTime(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </div>

            {/* Summary */}
            {totalSchedules > 0 && (
              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="font-medium">
                    {totalSchedules} horário(s) serão criados
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedDays.length} dia(s) × {selectedTimes.length} horário(s)
                  {selectedClassTypeData && ` • ${selectedClassTypeData.name}`}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2 justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={
              !selectedClassType || 
              selectedDays.length === 0 || 
              selectedTimes.length === 0 ||
              isSubmitting
            }
            className="rounded-xl gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Criar {totalSchedules > 0 ? `(${totalSchedules})` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
