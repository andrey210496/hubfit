import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface DraggableDashboardSectionProps {
  id: string;
  children: ReactNode;
  className?: string;
}

export function DraggableDashboardSection({ id, children, className }: DraggableDashboardSectionProps) {
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
        'relative group',
        isDragging && 'opacity-50 z-50',
        className
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
        title="Arraste para reorganizar"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>
      {children}
    </div>
  );
}
