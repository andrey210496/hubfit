import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Webhook, WEBHOOK_EVENTS } from '@/hooks/useWebhooks';

const webhookSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  url: z.string().url('URL inválida'),
  secret: z.string().optional(),
  events: z.array(z.string()).min(1, 'Selecione pelo menos um evento'),
  is_active: z.boolean(),
  headers: z.record(z.string()).optional(),
});

type WebhookFormData = z.infer<typeof webhookSchema>;

interface WebhookFormProps {
  open: boolean;
  onClose: () => void;
  webhook: Webhook | null;
  onSave: (data: WebhookFormData) => Promise<void>;
}

export function WebhookForm({ open, onClose, webhook, onSave }: WebhookFormProps) {
  const form = useForm<WebhookFormData>({
    resolver: zodResolver(webhookSchema),
    defaultValues: {
      name: '',
      url: '',
      secret: '',
      events: [],
      is_active: true,
      headers: {},
    },
  });

  useEffect(() => {
    if (webhook) {
      form.reset({
        name: webhook.name,
        url: webhook.url,
        secret: webhook.secret || '',
        events: webhook.events,
        is_active: webhook.is_active,
        headers: webhook.headers || {},
      });
    } else {
      form.reset({
        name: '',
        url: '',
        secret: '',
        events: [],
        is_active: true,
        headers: {},
      });
    }
  }, [webhook, form]);

  const handleSubmit = async (data: WebhookFormData) => {
    await onSave({
      ...data,
      secret: data.secret || null,
      headers: Object.keys(data.headers || {}).length > 0 ? data.headers : null,
    } as WebhookFormData);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {webhook ? 'Editar Webhook' : 'Novo Webhook'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Meu Webhook" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/webhook" {...field} />
                  </FormControl>
                  <FormDescription>
                    URL que receberá os eventos via POST
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Secret (opcional)</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Chave secreta para assinatura HMAC" 
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Usado para assinar as requisições com HMAC-SHA256
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="events"
              render={() => (
                <FormItem>
                  <FormLabel>Eventos</FormLabel>
                  <FormDescription>
                    Selecione os eventos que acionarão este webhook
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {WEBHOOK_EVENTS.map((event) => (
                      <FormField
                        key={event.value}
                        control={form.control}
                        name="events"
                        render={({ field }) => (
                          <FormItem
                            key={event.value}
                            className="flex flex-row items-start space-x-2 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(event.value)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, event.value])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== event.value
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {event.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
