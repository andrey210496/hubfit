import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
import { Tag } from '@/hooks/useTags';

interface ContactTagsSelectProps {
  contactId?: string;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export function ContactTagsSelect({ contactId, selectedTagIds, onTagsChange }: ContactTagsSelectProps) {
  const { profile } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const fetchTags = async () => {
      if (!profile?.company_id) return;
      
      const { data } = await supabase
        .from('tags')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');
      
      if (data) setTags(data);
    };
    
    fetchTags();
  }, [profile?.company_id]);

  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[32px]">
        {selectedTags.map(tag => (
          <Badge
            key={tag.id}
            style={{ backgroundColor: tag.color }}
            className="text-white flex items-center gap-1 px-2 py-1"
          >
            {tag.name}
            <X
              className="h-3 w-3 cursor-pointer hover:opacity-70"
              onClick={() => removeTag(tag.id)}
            />
          </Badge>
        ))}
        
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
              + Tags
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1 max-h-[200px] overflow-y-auto">
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
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm flex-1">{tag.name}</span>
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
