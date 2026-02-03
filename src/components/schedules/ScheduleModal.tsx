import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { Schedule, ScheduleFormData } from '@/hooks/useSchedules';
import { useContacts } from '@/hooks/useContacts';
import { format, addHours } from 'date-fns';

const scheduleSchema = z.object({
  body: z.string().min(5, 'Mensagem deve ter pelo menos 5 caracteres'),
  contact_id: z.string().min(1, 'Selecione um contato'),
  send_at: z.string().min(1, 'Data/hora é obrigatória'),
});

type FormValues = z.infer<typeof scheduleSchema>;

interface ScheduleModalProps {
  open: boolean;
  onClose: () => void;
  schedule?: Schedule | null;
  onSave: (data: ScheduleFormData) => Promise<any>;
  onUpdate?: (scheduleId: string, data: ScheduleFormData) => Promise<any>;
}

export function ScheduleModal({ open, onClose, schedule, onSave, onUpdate }: ScheduleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { contacts } = useContacts();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      body: '',
      contact_id: '',
      send_at: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const selectedContactId = watch('contact_id');

  useEffect(() => {
    if (schedule) {
      reset({
        body: schedule.body,
        contact_id: schedule.contact_id || '',
        send_at: format(new Date(schedule.send_at), "yyyy-MM-dd'T'HH:mm"),
      });
    } else {
      reset({
        body: '',
        contact_id: '',
        send_at: format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm"),
      });
    }
  }, [schedule, open, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData: ScheduleFormData = {
        body: data.body,
        contact_id: data.contact_id,
        send_at: new Date(data.send_at).toISOString(),
      };

      if (schedule && onUpdate) {
        await onUpdate(schedule.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSent = schedule?.sent_at !== null && schedule?.sent_at !== undefined;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {schedule ? (isSent ? 'Agendamento Enviado' : 'Editar Agendamento') : 'Novo Agendamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Contato *</Label>
            <Select
              value={selectedContactId}
              onValueChange={(value) => setValue('contact_id', value)}
              disabled={isSent}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um contato" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name} - {contact.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.contact_id && (
              <p className="text-sm text-destructive">{errors.contact_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Mensagem *</Label>
            <Textarea
              id="body"
              {...register('body')}
              placeholder="Digite a mensagem a ser enviada..."
              rows={5}
              disabled={isSent}
            />
            {errors.body && (
              <p className="text-sm text-destructive">{errors.body.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="send_at">Data e Hora do Envio *</Label>
            <Input
              id="send_at"
              type="datetime-local"
              {...register('send_at')}
              disabled={isSent}
            />
            {errors.send_at && (
              <p className="text-sm text-destructive">{errors.send_at.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {isSent ? 'Fechar' : 'Cancelar'}
            </Button>
            {!isSent && (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {schedule ? 'Salvar' : 'Agendar'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
