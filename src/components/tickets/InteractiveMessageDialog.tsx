import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useSendInteractiveMessage } from '@/hooks/useWhatsappAnalytics';

interface InteractiveMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  onSuccess?: () => void;
}

export function InteractiveMessageDialog({
  open,
  onOpenChange,
  ticketId,
  onSuccess,
}: InteractiveMessageDialogProps) {
  const [tab, setTab] = useState<'buttons' | 'list'>('buttons');
  const { loading, sendButtonMessage, sendListMessage } = useSendInteractiveMessage();

  // Button message state
  const [buttonBody, setButtonBody] = useState('');
  const [buttonHeader, setButtonHeader] = useState('');
  const [buttonFooter, setButtonFooter] = useState('');
  const [buttons, setButtons] = useState<Array<{ id: string; title: string }>>([
    { id: 'btn_1', title: '' },
  ]);

  // List message state
  const [listBody, setListBody] = useState('');
  const [listHeader, setListHeader] = useState('');
  const [listFooter, setListFooter] = useState('');
  const [listButtonText, setListButtonText] = useState('Ver opções');
  const [sections, setSections] = useState<Array<{
    title: string;
    rows: Array<{ id: string; title: string; description: string }>;
  }>>([
    { title: 'Opções', rows: [{ id: 'opt_1', title: '', description: '' }] },
  ]);

  const addButton = () => {
    if (buttons.length < 3) {
      setButtons([...buttons, { id: `btn_${buttons.length + 1}`, title: '' }]);
    }
  };

  const removeButton = (index: number) => {
    if (buttons.length > 1) {
      setButtons(buttons.filter((_, i) => i !== index));
    }
  };

  const updateButton = (index: number, title: string) => {
    const updated = [...buttons];
    updated[index].title = title;
    setButtons(updated);
  };

  const addSection = () => {
    setSections([
      ...sections,
      { title: `Seção ${sections.length + 1}`, rows: [{ id: `opt_${Date.now()}`, title: '', description: '' }] },
    ]);
  };

  const addRowToSection = (sectionIndex: number) => {
    const updated = [...sections];
    updated[sectionIndex].rows.push({ id: `opt_${Date.now()}`, title: '', description: '' });
    setSections(updated);
  };

  const updateSectionTitle = (index: number, title: string) => {
    const updated = [...sections];
    updated[index].title = title;
    setSections(updated);
  };

  const updateRow = (sectionIndex: number, rowIndex: number, field: 'title' | 'description', value: string) => {
    const updated = [...sections];
    updated[sectionIndex].rows[rowIndex][field] = value;
    setSections(updated);
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const updated = [...sections];
    if (updated[sectionIndex].rows.length > 1) {
      updated[sectionIndex].rows = updated[sectionIndex].rows.filter((_, i) => i !== rowIndex);
      setSections(updated);
    }
  };

  const handleSendButtons = async () => {
    const validButtons = buttons.filter(b => b.title.trim());
    if (!buttonBody.trim() || validButtons.length === 0) return;

    const result = await sendButtonMessage(
      ticketId,
      buttonBody,
      validButtons,
      { header: buttonHeader || undefined, footer: buttonFooter || undefined }
    );

    if (result) {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    }
  };

  const handleSendList = async () => {
    const validSections = sections
      .map(s => ({
        ...s,
        rows: s.rows.filter(r => r.title.trim()),
      }))
      .filter(s => s.rows.length > 0);

    if (!listBody.trim() || validSections.length === 0) return;

    const result = await sendListMessage(
      ticketId,
      listBody,
      listButtonText,
      validSections,
      { header: listHeader || undefined, footer: listFooter || undefined }
    );

    if (result) {
      onOpenChange(false);
      resetForm();
      onSuccess?.();
    }
  };

  const resetForm = () => {
    setButtonBody('');
    setButtonHeader('');
    setButtonFooter('');
    setButtons([{ id: 'btn_1', title: '' }]);
    setListBody('');
    setListHeader('');
    setListFooter('');
    setListButtonText('Ver opções');
    setSections([{ title: 'Opções', rows: [{ id: 'opt_1', title: '', description: '' }] }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mensagem Interativa</DialogTitle>
          <DialogDescription>
            Envie mensagens com botões ou listas de opções
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'buttons' | 'list')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buttons">Botões</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>

          <TabsContent value="buttons" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cabeçalho (opcional)</Label>
              <Input
                placeholder="Título da mensagem"
                value={buttonHeader}
                onChange={(e) => setButtonHeader(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Texto principal da mensagem"
                value={buttonBody}
                onChange={(e) => setButtonBody(e.target.value)}
                maxLength={1024}
              />
            </div>

            <div className="space-y-2">
              <Label>Rodapé (opcional)</Label>
              <Input
                placeholder="Texto do rodapé"
                value={buttonFooter}
                onChange={(e) => setButtonFooter(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label>Botões (máx. 3)</Label>
              {buttons.map((button, index) => (
                <div key={button.id} className="flex gap-2">
                  <Input
                    placeholder={`Botão ${index + 1}`}
                    value={button.title}
                    onChange={(e) => updateButton(index, e.target.value)}
                    maxLength={20}
                  />
                  {buttons.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeButton(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {buttons.length < 3 && (
                <Button type="button" variant="outline" size="sm" onClick={addButton}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar botão
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="list" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cabeçalho (opcional)</Label>
              <Input
                placeholder="Título da mensagem"
                value={listHeader}
                onChange={(e) => setListHeader(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Texto principal da mensagem"
                value={listBody}
                onChange={(e) => setListBody(e.target.value)}
                maxLength={1024}
              />
            </div>

            <div className="space-y-2">
              <Label>Texto do botão</Label>
              <Input
                placeholder="Ver opções"
                value={listButtonText}
                onChange={(e) => setListButtonText(e.target.value)}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label>Rodapé (opcional)</Label>
              <Input
                placeholder="Texto do rodapé"
                value={listFooter}
                onChange={(e) => setListFooter(e.target.value)}
                maxLength={60}
              />
            </div>

            <div className="space-y-4">
              <Label>Seções e Opções</Label>
              {sections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="border rounded-lg p-3 space-y-2">
                  <Input
                    placeholder="Título da seção"
                    value={section.title}
                    onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                    maxLength={24}
                    className="font-medium"
                  />
                  {section.rows.map((row, rowIndex) => (
                    <div key={row.id} className="flex gap-2 items-start">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Título da opção"
                          value={row.title}
                          onChange={(e) => updateRow(sectionIndex, rowIndex, 'title', e.target.value)}
                          maxLength={24}
                        />
                        <Input
                          placeholder="Descrição (opcional)"
                          value={row.description}
                          onChange={(e) => updateRow(sectionIndex, rowIndex, 'description', e.target.value)}
                          maxLength={72}
                          className="text-sm"
                        />
                      </div>
                      {section.rows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(sectionIndex, rowIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addRowToSection(sectionIndex)}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar opção
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar seção
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={tab === 'buttons' ? handleSendButtons : handleSendList}
            disabled={loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
