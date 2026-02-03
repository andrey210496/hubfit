import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { QuickMessage, QuickMessageFormData } from '@/hooks/useQuickMessages';
import { MessageVariablesPicker } from './MessageVariablesPicker';

const formSchema = z.object({
  shortcut: z.string().min(1, 'Atalho é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
});

interface QuickMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quickMessage: QuickMessage | null;
  onSave: (data: QuickMessageFormData) => Promise<boolean>;
}

export function QuickMessageModal({
  open,
  onOpenChange,
  quickMessage,
  onSave,
}: QuickMessageModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shortcut: '',
      message: '',
    },
  });

  useEffect(() => {
    if (quickMessage) {
      form.reset({
        shortcut: quickMessage.shortcut,
        message: quickMessage.message,
      });
    } else {
      form.reset({
        shortcut: '',
        message: '',
      });
    }
  }, [quickMessage, form]);

  const handleInsertVariable = (variable: string) => {
    const currentMessage = form.getValues('message');
    const textarea = textareaRef.current;
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newMessage = currentMessage.substring(0, start) + variable + currentMessage.substring(end);
      form.setValue('message', newMessage, { shouldValidate: true });
      
      // Reposiciona o cursor após a variável inserida
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      form.setValue('message', currentMessage + variable, { shouldValidate: true });
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    const success = await onSave({
      shortcut: data.shortcut,
      message: data.message,
    });
    if (success) {
      onOpenChange(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>
            {quickMessage ? 'Editar Resposta Rápida' : 'Nova Resposta Rápida'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="shortcut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Atalho</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: /saudacao" {...field} />
                  </FormControl>
                  <FormDescription>
                    Digite este atalho no chat para inserir a mensagem rapidamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Mensagem</FormLabel>
                    <MessageVariablesPicker onSelectVariable={handleInsertVariable} />
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a mensagem... Use variáveis como {{name}} para personalizar"
                      className="min-h-[150px] font-mono text-sm"
                      {...field}
                      ref={(e) => {
                        field.ref(e);
                        (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Use variáveis como <code className="bg-muted px-1 rounded text-xs">{'{{name}}'}</code> ou <code className="bg-muted px-1 rounded text-xs">{'{{greeting}}'}</code> para personalizar a mensagem automaticamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {quickMessage ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
