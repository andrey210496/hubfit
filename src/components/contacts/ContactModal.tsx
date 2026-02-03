import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, Copy, Check } from 'lucide-react';
import { Contact, ContactFormData } from '@/hooks/useContacts';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ContactTagsSelect } from './ContactTagsSelect';
import { supabase } from '@/integrations/supabase/client';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(50, 'Nome muito longo'),
  number: z.string().min(8, 'Número deve ter pelo menos 8 caracteres').max(20, 'Número muito longo'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  extraInfo: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })).optional(),
});

type FormValues = z.infer<typeof contactSchema>;

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  contact?: Contact | null;
  onSave: (data: ContactFormData) => Promise<any>;
  onUpdate?: (contactId: string, data: ContactFormData) => Promise<any>;
}

function ContactIdDisplay({ contactId }: { contactId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(contactId);
    setCopied(true);
    toast.success('ID do contato copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Label>ID do Contato (API)</Label>
      <div className="flex items-center gap-2">
        <Input
          value={contactId}
          readOnly
          className="font-mono text-sm bg-muted"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="shrink-0"
        >
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

export function ContactModal({ open, onClose, contact, onSave, onUpdate }: ContactModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      number: '',
      email: '',
      extraInfo: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'extraInfo',
  });

  useEffect(() => {
    const loadContactTags = async () => {
      if (contact) {
        const { data } = await supabase
          .from('contact_tags')
          .select('tag_id')
          .eq('contact_id', contact.id);
        
        setSelectedTagIds(data?.map(ct => ct.tag_id) || []);
      } else {
        setSelectedTagIds([]);
      }
    };

    if (contact) {
      reset({
        name: contact.name,
        number: contact.number,
        email: contact.email || '',
        extraInfo: contact.contact_custom_fields?.map(cf => ({
          name: cf.name,
          value: cf.value || '',
        })) || [],
      });
      loadContactTags();
    } else {
      reset({
        name: '',
        number: '',
        email: '',
        extraInfo: [],
      });
      setSelectedTagIds([]);
    }
  }, [contact, open, reset]);

  const saveContactTags = async (contactId: string) => {
    // Remove existing tags
    await supabase
      .from('contact_tags')
      .delete()
      .eq('contact_id', contactId);

    // Add new tags
    if (selectedTagIds.length > 0) {
      const tagsToInsert = selectedTagIds.map(tagId => ({
        contact_id: contactId,
        tag_id: tagId,
      }));
      await supabase.from('contact_tags').insert(tagsToInsert);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData: ContactFormData = {
        name: data.name,
        number: data.number,
        email: data.email || null,
        extraInfo: data.extraInfo
          ?.filter((e): e is { name: string; value: string } => Boolean(e.name && e.value))
          || [],
      };

      if (contact && onUpdate) {
        await onUpdate(contact.id, formData);
        await saveContactTags(contact.id);
      } else {
        const newContact = await onSave(formData);
        if (newContact?.id) {
          await saveContactTags(newContact.id);
        }
      }
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
            {contact ? 'Editar Contato' : 'Novo Contato'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Show Contact ID when editing */}
          {contact && <ContactIdDisplay contactId={contact.id} />}

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Informações Principais</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Nome do contato"
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  {...register('number')}
                  placeholder="5511999999999"
                />
                {errors.number && (
                  <p className="text-sm text-destructive">{errors.number.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@exemplo.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <ContactTagsSelect
                contactId={contact?.id}
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <p className="text-sm font-medium text-muted-foreground">Informações Extras</p>
            
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  {...register(`extraInfo.${index}.name`)}
                  placeholder="Nome do campo"
                  className="flex-1"
                />
                <Input
                  {...register(`extraInfo.${index}.value`)}
                  placeholder="Valor"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => append({ name: '', value: '' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Campo Extra
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {contact ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
