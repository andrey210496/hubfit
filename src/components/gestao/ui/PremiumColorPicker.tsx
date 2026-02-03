import { cn } from '@/lib/utils';
import { Palette, Check } from 'lucide-react';

interface PremiumColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  colors: string[];
  className?: string;
}

export function PremiumColorPicker({
  label,
  value,
  onChange,
  colors,
  className,
}: PremiumColorPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Palette className="h-4 w-4" />
        {label}
      </div>
      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "relative w-10 h-10 rounded-xl transition-all duration-300",
              "hover:scale-110 hover:shadow-lg",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              value === color && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110 shadow-lg"
            )}
            style={{ 
              backgroundColor: color,
              boxShadow: value === color ? `0 4px 20px ${color}50` : undefined
            }}
          >
            {value === color && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Check className="h-5 w-5 text-white drop-shadow-md" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
