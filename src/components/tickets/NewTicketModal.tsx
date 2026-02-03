import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Loader2, Plus, ArrowLeft, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  name: string;
  number: string;
  profile_pic_url?: string | null;
}

interface Queue {
  id: string;
  name: string;
  color: string;
}

interface User {
  id: string;
  user_id: string;
  name: string;
}

interface NewTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onTicketCreated: (ticketId: string) => void;
}

export function NewTicketModal({ open, onOpenChange, companyId, onTicketCreated }: NewTicketModalProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [showNewContactForm, setShowNewContactForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', number: '', email: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [hasActiveWhatsApp, setHasActiveWhatsApp] = useState<boolean | null>(null);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numbers = e.target.value.replace(/\D/g, '').slice(0, 13);
    setNewContact(prev => ({ ...prev, number: numbers }));
  };

  useEffect(() => {
    if (!open) {
      setShowNewContactForm(false);
      setNewContact({ name: '', number: '', email: '' });
      setSearch('');
      setSelectedQueueId(null);
      setSelectedUserId(null);
      return;
    }
    if (!companyId) return;

    fetchContacts();
    fetchQueues();
    fetchUsers();
    checkActiveWhatsApp();
  }, [open, companyId]);

  const checkActiveWhatsApp = async () => {
    const { data, error } = await supabase
      .from('whatsapps')
      .select('id')
      .eq('company_id', companyId)
      .eq('status', 'CONNECTED')
      .limit(1);

    setHasActiveWhatsApp(!error && data && data.length > 0);
  };

  const fetchContacts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, number, profile_pic_url')
      .eq('company_id', companyId)
      .eq('is_group', false) // Only show individual contacts, not groups
      .order('name');

    if (!error && data) {
      setContacts(data);
    }
    setLoading(false);
  };

  const fetchQueues = async () => {
    const { data, error } = await supabase
      .from('queues')
      .select('id, name, color')
      .eq('company_id', companyId)
      .order('name');

    if (!error && data) {
      setQueues(data);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_id, name')
      .eq('company_id', companyId)
      .order('name');

    if (!error && data) {
      setUsers(data);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(search.toLowerCase()) ||
    contact.number.includes(search)
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch WhatsApp profile picture (non-blocking)
  const fetchAndUpdateProfilePic = async (contactId: string, phoneNumber: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await supabase.functions.invoke('whatsapp-manager', {
        body: {
          action: 'updateContactProfilePic',
          contactId,
          phoneNumber,
        },
      });

      if (response.data?.profilePicUrl) {
        console.log('Profile pic updated for contact:', contactId);
      }
    } catch (error) {
      console.error('Failed to fetch profile pic:', error);
      // Non-blocking, don't show error to user
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    setCreating(contact.id);

    // Check if there's already an open ticket for this contact
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('company_id', companyId)
      .eq('contact_id', contact.id)
      .in('status', ['open', 'pending'])
      .single();

    if (existingTicket) {
      onTicketCreated(existingTicket.id);
      onOpenChange(false);
      setCreating(null);
      return;
    }

    // Create new ticket
    const { data: newTicket, error } = await supabase
      .from('tickets')
      .insert({
        company_id: companyId,
        contact_id: contact.id,
        status: 'open',
        unread_messages: 0,
        queue_id: selectedQueueId || null,
        user_id: selectedUserId || null,
      })
      .select('id')
      .single();

    if (!error && newTicket) {
      onTicketCreated(newTicket.id);
      onOpenChange(false);
    }
    setCreating(null);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newContact.name.trim() || !newContact.number.trim()) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Nome e número são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\d\s+()-]{8,20}$/;
    if (!phoneRegex.test(newContact.number)) {
      toast({
        title: 'Número inválido',
        description: 'Digite um número de telefone válido',
        variant: 'destructive',
      });
      return;
    }

    setSavingContact(true);

    // Check if contact with same number already exists
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, name')
      .eq('company_id', companyId)
      .eq('number', newContact.number.trim())
      .single();

    if (existingContact) {
      toast({
        title: 'Contato já existe',
        description: `O número já está cadastrado como "${existingContact.name}"`,
        variant: 'destructive',
      });
      setSavingContact(false);
      return;
    }

    // Create new contact
    const { data: createdContact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        company_id: companyId,
        name: newContact.name.trim(),
        number: newContact.number.trim(),
        email: newContact.email.trim() || null,
      })
      .select('id, name, number, profile_pic_url')
      .single();

    if (contactError || !createdContact) {
      toast({
        title: 'Erro ao criar contato',
        description: contactError?.message || 'Tente novamente',
        variant: 'destructive',
      });
      setSavingContact(false);
      return;
    }

    // Create pre-registration in members (pré-cadastro)
    // Check if member already exists for this contact
    const { data: existingMember } = await supabase
      .from('members')
      .select('id')
      .eq('contact_id', createdContact.id)
      .maybeSingle();

    if (!existingMember) {
      await supabase.from('members').insert({
        company_id: companyId,
        contact_id: createdContact.id,
        status: 'inactive',
        enrollment_date: new Date().toISOString().split('T')[0],
      });
    }

    // Fetch WhatsApp profile picture in background (non-blocking)
    fetchAndUpdateProfilePic(createdContact.id, createdContact.number);

    // Create ticket for new contact
    const { data: newTicket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        company_id: companyId,
        contact_id: createdContact.id,
        status: 'open',
        unread_messages: 0,
        queue_id: selectedQueueId || null,
        user_id: selectedUserId || null,
      })
      .select('id')
      .single();

    setSavingContact(false);

    if (ticketError || !newTicket) {
      toast({
        title: 'Erro ao criar atendimento',
        description: ticketError?.message || 'Tente novamente',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Contato criado',
      description: `Atendimento iniciado com ${createdContact.name}`,
    });

    onTicketCreated(newTicket.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showNewContactForm && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowNewContactForm(false)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {showNewContactForm ? 'Novo Contato' : 'Novo Atendimento'}
          </DialogTitle>
        </DialogHeader>

        {hasActiveWhatsApp === false && (
          <Alert variant="default" className="border-amber-500/50 bg-amber-500/10">
            <WifiOff className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400 text-sm">
              Nenhuma conexão WhatsApp ativa. A foto de perfil não será buscada automaticamente.
            </AlertDescription>
          </Alert>
        )}

        {showNewContactForm ? (
          <form onSubmit={handleCreateContact} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                placeholder="Nome do contato"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                maxLength={100}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="number">Número *</Label>
              <Input
                id="number"
                placeholder="5511999999999"
                value={newContact.number}
                onChange={handlePhoneChange}
                maxLength={13}
                required
              />
              <p className="text-xs text-muted-foreground">
                Código do país + DDD + número (apenas números)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@exemplo.com"
                value={newContact.email}
                onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                maxLength={255}
              />
            </div>

            {queues.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="queue">Fila/Setor</Label>
                <Select value={selectedQueueId || 'none'} onValueChange={(val) => setSelectedQueueId(val === 'none' ? null : val)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione uma fila (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {queues.map((queue) => (
                      <SelectItem key={queue.id} value={queue.id}>
                        <div className="flex items-center gap-2">
                          <span 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: queue.color }} 
                          />
                          {queue.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {users.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="user">Atendente</Label>
                <Select value={selectedUserId || 'none'} onValueChange={(val) => setSelectedUserId(val === 'none' ? null : val)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione um atendente (opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="none">Nenhum</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.user_id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowNewContactForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={savingContact}>
                {savingContact && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar e Iniciar
              </Button>
            </div>
          </form>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contato..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {queues.length > 0 && (
              <Select value={selectedQueueId || 'none'} onValueChange={(val) => setSelectedQueueId(val === 'none' ? null : val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione uma fila (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Nenhuma fila</SelectItem>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: queue.color }} 
                        />
                        {queue.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {users.length > 0 && (
              <Select value={selectedUserId || 'none'} onValueChange={(val) => setSelectedUserId(val === 'none' ? null : val)}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione um atendente (opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="none">Nenhum atendente</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.user_id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-primary"
              onClick={() => setShowNewContactForm(true)}
            >
              <Plus className="h-4 w-4" />
              Criar novo contato
            </Button>

            <ScrollArea className="h-[250px] -mx-6 px-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum contato encontrado</p>
                  <Button
                    variant="link"
                    className="mt-2"
                    onClick={() => setShowNewContactForm(true)}
                  >
                    Criar novo contato
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredContacts.map((contact) => (
                    <Button
                      key={contact.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2 px-2"
                      onClick={() => handleSelectContact(contact)}
                      disabled={creating !== null}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={contact.profile_pic_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-sm">
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="font-medium text-foreground">{contact.name}</div>
                        <div className="text-sm text-muted-foreground">{contact.number}</div>
                      </div>
                      {creating === contact.id && (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
