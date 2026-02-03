import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Palette, Bot } from 'lucide-react';
import { Queue, QueueFormData } from '@/hooks/useQueues';
import { SchedulesForm, Schedule } from './SchedulesForm';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const queueSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida'),
  greeting_message: z.string().optional(),
  out_of_hours_message: z.string().optional(),
  order_queue: z.number().nullable().optional(),
  ai_agent_id: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof queueSchema>;

interface AIAgent {
  id: string;
  name: string;
  status: string;
}

interface QueueModalProps {
  open: boolean;
  onClose: () => void;
  queue?: Queue | null;
  onSave: (data: QueueFormData) => Promise<any>;
}

const predefinedColors = [
  '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316',
  '#6366F1', '#14B8A6', '#22C55E', '#FBBF24', '#F43F5E',
];

export function QueueModal({ open, onClose, queue, onSave }: QueueModalProps) {
  const { profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('data');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [aiAgents, setAiAgents] = useState<AIAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(queueSchema),
    defaultValues: {
      name: '',
      color: '#7C3AED',
      greeting_message: '',
      out_of_hours_message: '',
      order_queue: null,
      ai_agent_id: null,
    },
  });

  const currentColor = watch('color');
  const currentAgentId = watch('ai_agent_id');

  // Fetch AI agents
  useEffect(() => {
    const fetchAgents = async () => {
      if (!profile?.company_id || !open) return;
      
      setLoadingAgents(true);
      try {
        const { data, error } = await supabase
          .from('ai_agents')
          .select('id, name, status')
          .eq('company_id', profile.company_id)
          .eq('status', 'active')
          .order('name');
        
        if (error) throw error;
        setAiAgents(data || []);
      } catch (error) {
        console.error('Error fetching AI agents:', error);
      } finally {
        setLoadingAgents(false);
      }
    };

    fetchAgents();
  }, [profile?.company_id, open]);

  useEffect(() => {
    if (queue) {
      reset({
        name: queue.name,
        color: queue.color,
        greeting_message: queue.greeting_message || '',
        out_of_hours_message: queue.out_of_hours_message || '',
        order_queue: queue.order_queue,
        ai_agent_id: (queue as any).ai_agent_id || null,
      });
      setSchedules(Array.isArray(queue.schedules) ? queue.schedules as unknown as Schedule[] : []);
    } else {
      reset({
        name: '',
        color: '#7C3AED',
        greeting_message: '',
        out_of_hours_message: '',
        order_queue: null,
        ai_agent_id: null,
      });
      setSchedules([]);
    }
    setActiveTab('data');
  }, [queue, open, reset]);

  const handleSaveSchedules = (newSchedules: Schedule[]) => {
    setSchedules(newSchedules);
    toast.success('Horários salvos! Clique em Salvar para aplicar as alterações.');
    setActiveTab('data');
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      await onSave({
        name: data.name,
        color: data.color,
        greeting_message: data.greeting_message,
        out_of_hours_message: data.out_of_hours_message,
        order_queue: data.order_queue,
        schedules: schedules.length > 0 ? schedules : undefined,
        ai_agent_id: data.ai_agent_id || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {queue ? 'Editar Fila' : 'Nova Fila'}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data">Dados da Fila</TabsTrigger>
            <TabsTrigger value="schedules">Horários de Atendimento</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-auto mt-4">
            <form onSubmit={handleSubmit(onSubmit)} id="queue-form">
              <TabsContent value="data" className="space-y-4 m-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Nome da fila"
                      autoFocus
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">Cor *</Label>
                    <div className="relative">
                      <Input
                        id="color"
                        {...register('color')}
                        placeholder="#7C3AED"
                        className="pl-10"
                      />
                      <div
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded cursor-pointer border"
                        style={{ backgroundColor: currentColor }}
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowColorPicker(!showColorPicker)}
                      >
                        <Palette className="h-4 w-4" />
                      </Button>
                    </div>
                    {showColorPicker && (
                      <div className="flex flex-wrap gap-2 p-2 bg-muted rounded-md">
                        {predefinedColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-md border-2 transition-all",
                              currentColor === color ? "border-foreground scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => {
                              setValue('color', color);
                              setShowColorPicker(false);
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {errors.color && (
                      <p className="text-sm text-destructive">{errors.color.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ai_agent_id" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Agente de IA
                  </Label>
                  <Select
                    value={currentAgentId || 'none'}
                    onValueChange={(value) => setValue('ai_agent_id', value === 'none' ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um agente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum agente</SelectItem>
                      {aiAgents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    O agente de IA responderá automaticamente às mensagens dos tickets nesta fila
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="order_queue">Ordem</Label>
                  <Input
                    id="order_queue"
                    type="number"
                    {...register('order_queue', { valueAsNumber: true })}
                    placeholder="Ordem de exibição"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="greeting_message">Mensagem de Saudação</Label>
                  <Textarea
                    id="greeting_message"
                    {...register('greeting_message')}
                    placeholder="Mensagem enviada quando o cliente é direcionado para esta fila"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="out_of_hours_message">Mensagem Fora do Expediente</Label>
                  <Textarea
                    id="out_of_hours_message"
                    {...register('out_of_hours_message')}
                    placeholder="Mensagem enviada fora do horário de atendimento"
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="schedules" className="m-0">
                <SchedulesForm
                  initialValues={schedules}
                  onSave={handleSaveSchedules}
                />
              </TabsContent>
            </form>
          </div>

          <DialogFooter className="mt-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" form="queue-form" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {queue ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
