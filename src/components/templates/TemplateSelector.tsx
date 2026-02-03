import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { TemplatesList } from "./TemplatesList";

interface TemplateSelectorProps {
  contactId?: string;
  ticketId?: string;
  whatsappId?: string;
  onSent?: () => void;
}

export function TemplateSelector({ contactId, ticketId, whatsappId, onSent }: TemplateSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" title="Enviar Template">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Templates de Mensagem</DialogTitle>
          <DialogDescription>
            Selecione um template aprovado para enviar ao contato.
          </DialogDescription>
        </DialogHeader>
        <TemplatesList
          whatsappId={whatsappId}
          contactId={contactId}
          ticketId={ticketId}
        />
      </DialogContent>
    </Dialog>
  );
}
