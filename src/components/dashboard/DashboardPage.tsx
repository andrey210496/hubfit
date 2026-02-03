import { useState, useMemo, useCallback, forwardRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  Users,
  Send,
  UserCheck,
  Clock,
  RefreshCw,
  LayoutGrid,
  Zap,
  RotateCcw,
  Phone,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { WidgetWrapper } from './widgets/WidgetWrapper';
import { StatsWidget } from './widgets/StatsWidget';
import { ChartWidget } from './widgets/ChartWidget';
import { QuickActionsWidget } from './widgets/QuickActionsWidget';
import { ConnectionStatusWidget } from './widgets/ConnectionStatusWidget';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type WidgetId = 'tickets' | 'contacts' | 'messages' | 'connections' |
  'users' | 'tickets-today' | 'pie-chart' | 'bar-chart' | 'quick-actions';

interface Widget {
  id: WidgetId;
  title: string;
  icon: any;
  size: 'sm' | 'md' | 'lg';
  visible: boolean;
}

const defaultWidgets: Widget[] = [
  { id: 'tickets', title: 'Atendimentos', icon: MessageCircle, size: 'sm', visible: true },
  { id: 'tickets-today', title: 'Novos Hoje', icon: Clock, size: 'sm', visible: true },
  { id: 'contacts', title: 'Contatos', icon: Users, size: 'sm', visible: true },
  { id: 'users', title: 'Usuários', icon: UserCheck, size: 'sm', visible: true },
  { id: 'connections', title: 'Conexões WhatsApp', icon: Phone, size: 'md', visible: true },
  { id: 'quick-actions', title: 'Ações Rápidas', icon: Zap, size: 'md', visible: true },
  { id: 'pie-chart', title: 'Status dos Atendimentos', icon: LayoutGrid, size: 'md', visible: true },
  { id: 'bar-chart', title: 'Atendimentos (7 dias)', icon: LayoutGrid, size: 'lg', visible: true },
  { id: 'messages', title: 'Mensagens', icon: Send, size: 'sm', visible: false },
];

const STORAGE_KEY = 'dashboard-layout';

const loadLayoutFromStorage = (): Widget[] | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Array<{ id: WidgetId; visible: boolean }>;

    // Merge saved preferences with default widgets (preserving order and visibility)
    return parsed.map(saved => {
      const defaultWidget = defaultWidgets.find(w => w.id === saved.id);
      if (!defaultWidget) return null;
      return { ...defaultWidget, visible: saved.visible };
    }).filter(Boolean) as Widget[];
  } catch {
    return null;
  }
};

const saveLayoutToStorage = (widgets: Widget[]) => {
  try {
    const toSave = widgets.map(w => ({ id: w.id, visible: w.visible }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save layout:', e);
  }
};

const TICKET_COLORS = {
  open: '#22c55e',
  pending: '#f59e0b',
  closed: '#6b7280',
};

interface DashboardPageProps {
  onNavigate?: (path: string) => void;
}

export const DashboardPage = forwardRef<HTMLDivElement, DashboardPageProps>(function DashboardPage({ onNavigate }, ref) {
  const { stats, ticketsByDay, campaignShippings, loading, refetch } = useDashboardStats();
  const [widgets, setWidgets] = useState<Widget[]>(() => loadLayoutFromStorage() || defaultWidgets);
  const [editMode, setEditMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const visibleWidgets = useMemo(() =>
    widgets.filter(w => w.visible),
    [widgets]
  );

  const ticketPieData = stats ? [
    { name: 'Abertos', value: stats.tickets.open, color: TICKET_COLORS.open },
    { name: 'Pendentes', value: stats.tickets.pending, color: TICKET_COLORS.pending },
    { name: 'Fechados', value: stats.tickets.closed, color: TICKET_COLORS.closed },
  ] : [];

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleWidget = (id: WidgetId) => {
    setWidgets(prev => prev.map(w =>
      w.id === id ? { ...w, visible: !w.visible } : w
    ));
  };

  const saveLayout = useCallback(() => {
    saveLayoutToStorage(widgets);
    setEditMode(false);
    toast.success('Layout salvo com sucesso!');
  }, [widgets]);

  const resetLayout = useCallback(() => {
    setWidgets(defaultWidgets);
    localStorage.removeItem(STORAGE_KEY);
    toast.info('Layout restaurado ao padrão');
  }, []);

  const handleNavigate = useCallback((path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  }, [onNavigate]);

  const quickActions = [
    { icon: MessageCircle, label: 'Novo Atendimento', color: 'coral' as const, onClick: () => handleNavigate('/tickets') },
    { icon: Users, label: 'Adicionar Contato', color: 'teal' as const, onClick: () => handleNavigate('/contacts') },
    { icon: Zap, label: 'Respostas Rápidas', color: 'default' as const, onClick: () => handleNavigate('/quick-messages') },
  ];

  const mockConnections = [
    { name: 'WhatsApp Principal', status: 'connected' as const },
    { name: 'WhatsApp Suporte', status: 'connected' as const },
    { name: 'WhatsApp Vendas', status: 'warning' as const },
  ];

  const renderWidget = (widget: Widget) => {
    switch (widget.id) {
      case 'tickets':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-primary" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <StatsWidget
              value={stats?.tickets.total || 0}
              label="Total de atendimentos"
              icon={MessageCircle}
              color="coral"
              badges={[
                { label: 'abertos', value: stats?.tickets.open || 0, variant: 'success' },
                { label: 'hoje', value: `+${stats?.tickets.today || 0}`, variant: 'secondary' },
              ]}
            />
          </WidgetWrapper>
        );

      case 'contacts':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-muted-foreground" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <StatsWidget
              value={stats?.contacts.total || 0}
              label="Total de contatos"
              icon={Users}
              trend={{ value: stats?.contacts.today || 0, label: 'hoje', positive: true }}
            />
          </WidgetWrapper>
        );

      case 'users':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-muted-foreground" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <StatsWidget
              value={stats?.users.total || 0}
              label="Total de usuários"
              icon={UserCheck}
              badges={[
                { label: 'online', value: stats?.users.online || 0, variant: 'success' },
              ]}
            />
          </WidgetWrapper>
        );

      case 'connections':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-secondary" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <ConnectionStatusWidget
              connections={mockConnections}
              totalConnected={stats?.connections.connected || 0}
              total={stats?.connections.total || 1}
            />
          </WidgetWrapper>
        );

      case 'tickets-today':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-primary" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <StatsWidget
              value={stats?.tickets.today || 0}
              label="Novos tickets hoje"
              icon={Clock}
              color="coral"
            />
          </WidgetWrapper>
        );

      case 'pie-chart':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-muted-foreground" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <ChartWidget
              type="pie"
              data={ticketPieData}
              config={{ dataKey: 'value', nameKey: 'name' }}
            />
          </WidgetWrapper>
        );

      case 'bar-chart':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-muted-foreground" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <ChartWidget
              type="bar"
              data={ticketsByDay}
              config={{
                bars: [
                  { dataKey: 'open', name: 'Abertos', color: '#22c55e' },
                  { dataKey: 'closed', name: 'Fechados', color: '#6b7280' },
                ]
              }}
            />
          </WidgetWrapper>
        );

      case 'messages':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-muted-foreground" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <StatsWidget
              value={stats?.messages.total || 0}
              label="Total de mensagens"
              icon={Send}
              badges={[
                { label: 'enviadas', value: stats?.messages.sent || 0, variant: 'primary' },
                { label: 'recebidas', value: stats?.messages.received || 0, variant: 'secondary' },
              ]}
            />
          </WidgetWrapper>
        );

      case 'quick-actions':
        return (
          <WidgetWrapper
            id={widget.id}
            title={widget.title}
            icon={<widget.icon className="h-4 w-4 text-primary" />}
            size={widget.size}
            onRemove={editMode ? () => toggleWidget(widget.id) : undefined}
          >
            <QuickActionsWidget actions={quickActions} />
          </WidgetWrapper>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={ref} className="p-4 lg:p-6 space-y-4 bg-background min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-gradient-coral">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do atendimento
          </p>
        </div>
        <div className="flex items-center gap-2">
          {editMode && (
            <Button
              variant="outline"
              onClick={resetLayout}
              className="neu-button"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Resetar
            </Button>
          )}
          <Button
            variant="outline"
            onClick={editMode ? saveLayout : () => setEditMode(true)}
            className={cn(
              "neu-button",
              editMode && "gradient-teal text-white border-0"
            )}
          >
            <LayoutGrid className="mr-2 h-4 w-4" />
            {editMode ? 'Salvar Layout' : 'Editar Layout'}
          </Button>
          <Button
            variant="outline"
            onClick={refetch}
            disabled={loading}
            className="neu-button"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Widget Selector (Edit Mode) */}
      {editMode && (
        <div className="module-card animate-fade-in">
          <h3 className="text-sm font-semibold mb-3">Widgets Disponíveis</h3>
          <div className="flex flex-wrap gap-2">
            {widgets.map(widget => (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                  widget.visible
                    ? "gradient-coral text-white"
                    : "neu-pressed text-muted-foreground hover:text-foreground"
                )}
              >
                {widget.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modular Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={visibleWidgets.map(w => w.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {visibleWidgets.map(widget => (
              <div
                key={widget.id}
                className={
                  widget.size === 'lg' ? 'col-span-2' :
                    widget.size === 'md' ? 'col-span-1 md:col-span-1' :
                      'col-span-1'
                }
              >
                {renderWidget(widget)}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

DashboardPage.displayName = 'DashboardPage';
