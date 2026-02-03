import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Clock, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Schedule {
  weekday: string;
  weekdayEn: string;
  startTime: string;
  endTime: string;
  enabled?: boolean;
}

const defaultSchedules: Schedule[] = [
  { weekday: 'Segunda-feira', weekdayEn: 'monday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Terça-feira', weekdayEn: 'tuesday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Quarta-feira', weekdayEn: 'wednesday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Quinta-feira', weekdayEn: 'thursday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Sexta-feira', weekdayEn: 'friday', startTime: '08:00', endTime: '18:00', enabled: true },
  { weekday: 'Sábado', weekdayEn: 'saturday', startTime: '08:00', endTime: '12:00', enabled: false },
  { weekday: 'Domingo', weekdayEn: 'sunday', startTime: '', endTime: '', enabled: false },
];

interface SchedulesFormProps {
  initialValues?: Schedule[] | null;
  onSave: (schedules: Schedule[]) => void;
  loading?: boolean;
}

export function SchedulesForm({ initialValues, onSave, loading }: SchedulesFormProps) {
  const [schedules, setSchedules] = useState<Schedule[]>(defaultSchedules);

  useEffect(() => {
    if (initialValues && Array.isArray(initialValues) && initialValues.length > 0) {
      // Merge with defaults to ensure all days are present
      const merged = defaultSchedules.map(defaultDay => {
        const found = initialValues.find(s => s.weekdayEn === defaultDay.weekdayEn);
        if (found) {
          return {
            ...defaultDay,
            ...found,
            enabled: found.enabled ?? (found.startTime && found.endTime ? true : false),
          };
        }
        return defaultDay;
      });
      setSchedules(merged);
    }
  }, [initialValues]);

  const handleTimeChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    // Format time input
    let formatted = value.replace(/[^\d]/g, '');
    if (formatted.length >= 2) {
      formatted = formatted.slice(0, 2) + ':' + formatted.slice(2, 4);
    }
    if (formatted.length > 5) {
      formatted = formatted.slice(0, 5);
    }

    setSchedules(prev => prev.map((s, i) => 
      i === index ? { ...s, [field]: formatted } : s
    ));
  };

  const handleToggle = (index: number, enabled: boolean) => {
    setSchedules(prev => prev.map((s, i) => 
      i === index ? { 
        ...s, 
        enabled,
        startTime: enabled && !s.startTime ? '08:00' : s.startTime,
        endTime: enabled && !s.endTime ? '18:00' : s.endTime,
      } : s
    ));
  };

  const handleSave = () => {
    onSave(schedules);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Clock className="h-4 w-4" />
        <span>Configure os horários de atendimento para cada dia da semana</span>
      </div>

      <div className="space-y-3">
        {schedules.map((schedule, index) => (
          <div 
            key={schedule.weekdayEn}
            className={cn(
              "flex items-center gap-4 p-3 rounded-lg border transition-colors",
              schedule.enabled ? "bg-card" : "bg-muted/30"
            )}
          >
            <div className="flex items-center gap-3 min-w-[180px]">
              <Switch
                checked={schedule.enabled}
                onCheckedChange={(checked) => handleToggle(index, checked)}
              />
              <Label className={cn(
                "font-medium",
                !schedule.enabled && "text-muted-foreground"
              )}>
                {schedule.weekday}
              </Label>
            </div>

            <div className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Início:</Label>
                <Input
                  type="text"
                  placeholder="08:00"
                  value={schedule.startTime}
                  onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                  disabled={!schedule.enabled}
                  className="w-20 text-center"
                  maxLength={5}
                />
              </div>

              <span className="text-muted-foreground">-</span>

              <div className="flex items-center gap-2">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Fim:</Label>
                <Input
                  type="text"
                  placeholder="18:00"
                  value={schedule.endTime}
                  onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                  disabled={!schedule.enabled}
                  className="w-20 text-center"
                  maxLength={5}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Horários
        </Button>
      </div>
    </div>
  );
}
