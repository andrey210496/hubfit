import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { SmilePlus } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

interface MessageReactionPickerProps {
  onReact: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export function MessageReactionPicker({ onReact, disabled, className }: MessageReactionPickerProps) {
  const [open, setOpen] = useState(false);

  const handleReactionClick = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 rounded-full bg-card/90 shadow-sm hover:bg-card border border-border/50",
            className
          )}
          disabled={disabled}
        >
          <SmilePlus className="h-4 w-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1.5"
        side="top"
        align="center"
        sideOffset={4}
      >
        <div className="flex items-center gap-0.5">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReactionClick(emoji)}
              className="w-8 h-8 flex items-center justify-center text-xl hover:bg-muted rounded-full transition-all hover:scale-125"
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
