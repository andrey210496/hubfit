import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export type Contact = Tables<'contacts'> & {
  contact_custom_fields?: { id: string; name: string; value: string | null }[];
};

export interface ContactFormData {
  name: string;
  number: string;
  email?: string | null;
  is_group?: boolean;
  extraInfo?: { name: string; value: string }[];
}

export function useContacts() {
  const { profile } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = async (searchParam?: string) => {
    if (!profile?.company_id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('contacts')
        .select('*, contact_custom_fields(*)')
        .eq('company_id', profile.company_id)
        .eq('is_group', false) // Only show individual contacts, not groups
        .order('name', { ascending: true });

      if (searchParam) {
        query = query.or(`name.ilike.%${searchParam}%,number.ilike.%${searchParam}%,email.ilike.%${searchParam}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setContacts(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar contatos:', error);
      toast.error('Erro ao carregar contatos');
    } finally {
      setLoading(false);
    }
  };

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
        // Garante refresh imediato da lista (caso realtime não esteja ativo)
        await fetchContacts();
      }
    } catch (error) {
      // Não bloqueante: se falhar, apenas mantém o contato sem foto.
      console.debug('Falha ao buscar foto de perfil do WhatsApp:', error);
    }
  };

  const createContact = async (data: ContactFormData, createMemberPreRegistration = true) => {
    if (!profile?.company_id) {
      toast.error('Empresa não encontrada');
      return null;
    }

    try {
      const { data: contact, error } = await supabase
        .from('contacts')
        .insert({
          name: data.name,
          number: data.number,
          email: data.email || null,
          is_group: data.is_group || false,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add custom fields if provided
      if (data.extraInfo && data.extraInfo.length > 0 && contact) {
        const customFields = data.extraInfo
          .filter(info => info.name && info.value)
          .map(info => ({
            contact_id: contact.id,
            name: info.name,
            value: info.value,
          }));

        if (customFields.length > 0) {
          await supabase.from('contact_custom_fields').insert(customFields);
        }
      }

      // Create pre-registration in members (pré-cadastro) - only for individual contacts
      if (createMemberPreRegistration && contact && !data.is_group) {
        // Check if member already exists for this contact
        const { data: existingMember } = await supabase
          .from('members')
          .select('id')
          .eq('contact_id', contact.id)
          .maybeSingle();

        if (!existingMember) {
          await supabase.from('members').insert({
            company_id: profile.company_id,
            contact_id: contact.id,
            status: 'inactive',
            enrollment_date: new Date().toISOString().split('T')[0],
          });
        }
      }

      // Buscar foto em background (não bloqueante)
      if (contact?.id && contact?.number) {
        void fetchAndUpdateProfilePic(contact.id, contact.number);
      }

      toast.success('Contato criado com sucesso');
      await fetchContacts();
      return contact;
    } catch (error: any) {
      console.error('Erro ao criar contato:', error);
      toast.error('Erro ao criar contato');
      throw error;
    }
  };

  const updateContact = async (contactId: string, data: ContactFormData) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          name: data.name,
          number: data.number,
          email: data.email || null,
          is_group: data.is_group || false,
        })
        .eq('id', contactId);

      if (error) throw error;

      // Update custom fields
      await supabase.from('contact_custom_fields').delete().eq('contact_id', contactId);

      if (data.extraInfo && data.extraInfo.length > 0) {
        const customFields = data.extraInfo
          .filter(info => info.name && info.value)
          .map(info => ({
            contact_id: contactId,
            name: info.name,
            value: info.value,
          }));

        if (customFields.length > 0) {
          await supabase.from('contact_custom_fields').insert(customFields);
        }
      }

      toast.success('Contato atualizado com sucesso');
      await fetchContacts();

      // Tentar (em background) atualizar a foto do WhatsApp após salvar
      void fetchAndUpdateProfilePic(contactId, data.number);
    } catch (error: any) {
      console.error('Erro ao atualizar contato:', error);
      toast.error('Erro ao atualizar contato');
      throw error;
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      // Delete custom fields first
      await supabase.from('contact_custom_fields').delete().eq('contact_id', contactId);

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;
      toast.success('Contato excluído com sucesso');
      await fetchContacts();
    } catch (error: any) {
      console.error('Erro ao excluir contato:', error);
      toast.error('Erro ao excluir contato');
      throw error;
    }
  };

  useEffect(() => {
    fetchContacts();

    if (!profile?.company_id) return;

    // Subscribe to realtime changes
    const channel = supabase
      .channel('contacts-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'contacts',
          filter: `company_id=eq.${profile.company_id}`
        },
        () => {
          fetchContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.company_id]);

  return {
    contacts,
    loading,
    fetchContacts,
    createContact,
    updateContact,
    deleteContact,
  };
}
