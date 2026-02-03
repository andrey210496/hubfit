import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { Profile, UserFormData } from '@/hooks/useUsers';
import { useQueues } from '@/hooks/useQueues';
import { useWhatsappConnections } from '@/hooks/useWhatsappConnections';
import { ScrollArea } from '@/components/ui/scroll-area';

const userSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
  email: z.string().email('Email inválido'),
  profile: z.string().optional(),
  all_ticket: z.string().optional(),
  whatsapp_id: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof userSchema>;

interface UserModalProps {
  open: boolean;
  onClose: () => void;
  user?: Profile | null;
  onSave: (userId: string, data: UserFormData) => Promise<any>;
}

export function UserModal({ open, onClose, user, onSave }: UserModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const { queues } = useQueues();
  const { connections } = useWhatsappConnections();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      profile: 'user',
      all_ticket: 'disabled',
      whatsapp_id: null,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        profile: user.profile || 'user',
        all_ticket: user.all_ticket || 'disabled',
        whatsapp_id: user.whatsapp_id || null,
      });
      setSelectedQueueIds(user.user_queues?.map(uq => uq.queue_id) || []);
    } else {
      reset({
        name: '',
        email: '',
        profile: 'user',
        all_ticket: 'disabled',
        whatsapp_id: null,
      });
      setSelectedQueueIds([]);
    }
  }, [user, open, reset]);

  const handleQueueToggle = (queueId: string, checked: boolean) => {
    if (checked) {
      setSelectedQueueIds(prev => [...prev, queueId]);
    } else {
      setSelectedQueueIds(prev => prev.filter(id => id !== queueId));
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      await onSave(user.user_id, {
        name: data.name,
        email: data.email,
        profile: data.profile,
        all_ticket: data.all_ticket,
        whatsapp_id: data.whatsapp_id,
        queue_ids: selectedQueueIds,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {user ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Nome do usuário"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@exemplo.com"
                disabled={!!user}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={watch('profile')}
                onValueChange={(value) => setValue('profile', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conexão WhatsApp</Label>
              <Select
                value={watch('whatsapp_id') || 'none'}
                onValueChange={(value) => setValue('whatsapp_id', value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conexão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      {conn.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ver Todos os Tickets</Label>
            <Select
              value={watch('all_ticket')}
              onValueChange={(value) => setValue('all_ticket', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="enabled">Habilitado</SelectItem>
                <SelectItem value="disabled">Desabilitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Filas de Atendimento</Label>
            <ScrollArea className="h-32 rounded-md border p-3">
              <div className="space-y-2">
                {queues.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma fila cadastrada</p>
                ) : (
                  queues.map((queue) => (
                    <div key={queue.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`queue-${queue.id}`}
                        checked={selectedQueueIds.includes(queue.id)}
                        onCheckedChange={(checked) => handleQueueToggle(queue.id, !!checked)}
                      />
                      <label
                        htmlFor={`queue-${queue.id}`}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: queue.color }}
                        />
                        {queue.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !user}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
