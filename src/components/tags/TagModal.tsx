import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Palette, Info } from 'lucide-react';
import { Tag, TagFormData } from '@/hooks/useTags';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const tagSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(50, 'Nome muito longo'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor inválida'),
  kanban: z.boolean().optional(),
  kanban_order: z.number().min(0).max(100).optional(),
  campaign_identifier: z.string().optional(),
  meta_pixel_id: z.string().optional(),
  meta_access_token: z.string().optional(),
});

type FormValues = z.infer<typeof tagSchema>;

const PREDEFINED_COLORS = [
  '#7C3AED', '#8B5CF6', '#A855F7', '#C026D3', '#D946EF',
  '#EC4899', '#F43F5E', '#EF4444', '#F97316', '#F59E0B',
  '#EAB308', '#84CC16', '#22C55E', '#10B981', '#14B8A6',
  '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#64748B',
];

interface TagModalProps {
  open: boolean;
  onClose: () => void;
  tag?: Tag | null;
  onSave: (data: TagFormData) => Promise<any>;
  onUpdate?: (tagId: string, data: TagFormData) => Promise<any>;
}

export function TagModal({ open, onClose, tag, onSave, onUpdate }: TagModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPixelConfig, setShowPixelConfig] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: {
      name: '',
      color: '#7C3AED',
      kanban: false,
      kanban_order: 0,
      campaign_identifier: '',
      meta_pixel_id: '',
      meta_access_token: '',
    },
  });

  const selectedColor = watch('color');
  const isKanban = watch('kanban');
  const metaPixelId = watch('meta_pixel_id');

  useEffect(() => {
    if (tag) {
      const hasPixelConfig = !!tag.meta_pixel_id || !!tag.campaign_identifier;
      setShowPixelConfig(hasPixelConfig);
      reset({
        name: tag.name,
        color: tag.color,
        kanban: tag.kanban === 1,
        kanban_order: tag.kanban_order ?? 0,
        campaign_identifier: tag.campaign_identifier || '',
        meta_pixel_id: tag.meta_pixel_id || '',
        meta_access_token: tag.meta_access_token || '',
      });
    } else {
      setShowPixelConfig(false);
      reset({
        name: '',
        color: '#7C3AED',
        kanban: false,
        kanban_order: 0,
        campaign_identifier: '',
        meta_pixel_id: '',
        meta_access_token: '',
      });
    }
  }, [tag, open, reset]);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      const formData: TagFormData = {
        name: data.name,
        color: data.color,
        kanban: data.kanban ? 1 : 0,
        kanban_order: data.kanban ? (data.kanban_order ?? 0) : 0,
        campaign_identifier: data.campaign_identifier || null,
        meta_pixel_id: data.meta_pixel_id || null,
        meta_access_token: data.meta_access_token || null,
      };

      if (tag && onUpdate) {
        await onUpdate(tag.id, formData);
      } else {
        await onSave(formData);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tag ? 'Editar Tag' : 'Nova Tag'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Nome da tag"
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cor *</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start gap-2"
                  >
                    <div
                      className="w-5 h-5 rounded"
                      style={{ backgroundColor: selectedColor }}
                    />
                    <span>{selectedColor}</span>
                    <Palette className="ml-auto h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64" align="start">
                  <div className="grid grid-cols-5 gap-2">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="w-8 h-8 rounded border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: color,
                          borderColor: selectedColor === color ? 'white' : 'transparent',
                          boxShadow: selectedColor === color ? '0 0 0 2px hsl(var(--primary))' : 'none',
                        }}
                        onClick={() => setValue('color', color)}
                      />
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Label htmlFor="custom-color" className="text-xs">Cor personalizada</Label>
                    <Input
                      id="custom-color"
                      type="text"
                      {...register('color')}
                      placeholder="#7C3AED"
                      className="mt-1"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            {errors.color && (
              <p className="text-sm text-destructive">{errors.color.message}</p>
            )}
          </div>

          <Separator />

          {/* Kanban Settings */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="kanban"
                checked={isKanban}
                onCheckedChange={(checked) => setValue('kanban', !!checked)}
              />
              <label
                htmlFor="kanban"
                className="text-sm font-medium leading-none cursor-pointer"
              >
                Exibir no Kanban
              </label>
            </div>

            {isKanban && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center gap-2">
                  <Label htmlFor="kanban_order" className="text-sm">Ordem da coluna</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[200px]">Define a posição da coluna no Kanban. Valores menores aparecem primeiro.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="kanban_order"
                  type="number"
                  min={0}
                  max={100}
                  {...register('kanban_order', { valueAsNumber: true })}
                  placeholder="0"
                  className="w-24"
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Meta Pixel Configuration */}
          <Collapsible open={showPixelConfig} onOpenChange={setShowPixelConfig}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                <span className="text-sm font-medium">Configuração de Tráfego Pago (Meta Pixel)</span>
                <span className="text-xs text-muted-foreground">
                  {showPixelConfig ? 'Ocultar' : 'Expandir'}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
                <p className="font-medium mb-1">Como funciona:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Configure um identificador único para a campanha (ex: [CAMPANHA_VERAO])</li>
                  <li>Use esse identificador no texto inicial do link do WhatsApp</li>
                  <li>Leads que enviarem mensagem com esse texto serão auto-tagueados</li>
                  <li>O evento de conversão será enviado para o Pixel automaticamente</li>
                </ol>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="campaign_identifier">Identificador da Campanha</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[250px]">Texto que será detectado na primeira mensagem. Ex: [CAMPANHA_VERAO]</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="campaign_identifier"
                  {...register('campaign_identifier')}
                  placeholder="Ex: [CAMPANHA_VERAO]"
                />
                <p className="text-xs text-muted-foreground">
                  Link do WhatsApp: wa.me/5511999999999?text=Olá!%20{encodeURIComponent('[CAMPANHA_VERAO]')}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="meta_pixel_id">Pixel ID</Label>
                <Input
                  id="meta_pixel_id"
                  {...register('meta_pixel_id')}
                  placeholder="Ex: 123456789012345"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="meta_access_token">Access Token (Conversions API)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-[250px]">Token gerado no Gerenciador de Eventos da Meta para enviar conversões via API.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="meta_access_token"
                  type="password"
                  {...register('meta_access_token')}
                  placeholder="Token de acesso"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {tag ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
