import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode, useState } from 'react';

interface WidgetWrapperProps {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onRemove?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function WidgetWrapper({ 
  id, 
  title, 
  icon, 
  children, 
  onRemove,
  className,
  size = 'md'
}: WidgetWrapperProps) {
  const [expanded, setExpanded] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "module-card group relative p-4",
        isDragging && "opacity-50 scale-105 z-50",
        expanded && "col-span-2 row-span-2",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="neu-icon w-8 h-8 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <h3 className="font-semibold text-sm text-foreground truncate">{title}</h3>
        </div>
        
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="neu-icon w-6 h-6 flex items-center justify-center hover:bg-muted transition-colors"
          >
            {expanded ? (
              <Minimize2 className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Maximize2 className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="neu-icon w-6 h-6 flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            {...attributes}
            {...listeners}
            className="neu-icon w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-muted transition-colors"
          >
            <GripVertical className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
