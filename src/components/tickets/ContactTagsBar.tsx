import { useState, useEffect } from 'react';
import { X, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Tag as TagType } from '@/hooks/useTags';
import { toast } from 'sonner';
import { sendMetaConversion } from '@/lib/metaConversions';

interface ContactTagsBarProps {
  contactId: string;
  ticketId?: string;
}

export function ContactTagsBar({ contactId, ticketId }: ContactTagsBarProps) {
  const { profile } = useAuth();
  const [tags, setTags] = useState<TagType[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.company_id || !contactId) return;
      
      setLoading(true);
      try {
        // Fetch all tags
        const { data: allTags } = await supabase
          .from('tags')
          .select('*')
          .eq('company_id', profile.company_id)
          .order('name');
        
        if (allTags) setTags(allTags);

        // Fetch contact's tags
        const { data: contactTags } = await supabase
          .from('contact_tags')
          .select('tag_id')
          .eq('contact_id', contactId);
        
        if (contactTags) {
          setSelectedTagIds(contactTags.map(ct => ct.tag_id));
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [profile?.company_id, contactId]);

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  const toggleTag = async (tagId: string) => {
    const isSelected = selectedTagIds.includes(tagId);
    
    try {
      if (isSelected) {
        // Remove tag
        await supabase
          .from('contact_tags')
          .delete()
          .eq('contact_id', contactId)
          .eq('tag_id', tagId);
        
        setSelectedTagIds(prev => prev.filter(id => id !== tagId));
      } else {
        // Add tag
        await supabase
          .from('contact_tags')
          .insert({ contact_id: contactId, tag_id: tagId });
        
        setSelectedTagIds(prev => [...prev, tagId]);

        // Send Meta Conversion event if configured
        if (profile?.company_id) {
          sendMetaConversion({
            tagId,
            contactId,
            ticketId,
            companyId: profile.company_id,
            eventName: 'Lead',
          }).catch(err => console.error('Meta conversion failed:', err));
        }
      }
    } catch (error) {
      console.error('Error toggling tag:', error);
      toast.error('Erro ao atualizar tag');
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      await supabase
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);
      
      setSelectedTagIds(prev => prev.filter(id => id !== tagId));
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Erro ao remover tag');
    }
  };

  if (loading) return null;

  return (
    <div className="px-4 py-2 bg-card/80 border-b border-border flex items-center gap-2 flex-wrap">
      {selectedTags.map(tag => (
        <Badge
          key={tag.id}
          style={{ backgroundColor: tag.color }}
          className="text-white flex items-center gap-1 px-2 py-0.5 text-xs"
        >
          {tag.name.toUpperCase()}
          <X
            className="h-3 w-3 cursor-pointer hover:opacity-70"
            onClick={() => removeTag(tag.id)}
          />
        </Badge>
      ))}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Tag className="h-3 w-3 mr-1" />
            Tags
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1 max-h-[250px] overflow-y-auto">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhuma tag cadastrada
              </p>
            ) : (
              tags.map(tag => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                  onClick={() => toggleTag(tag.id)}
                >
                  <Checkbox
                    checked={selectedTagIds.includes(tag.id)}
                    onCheckedChange={() => toggleTag(tag.id)}
                  />
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm flex-1 truncate">{tag.name}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
