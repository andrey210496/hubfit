import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Search,
  Filter,
  X,
  ChevronRight,
  Loader2,
  MessageSquare,
  Phone,
  Mail,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import ExcelJS from 'exceljs';

export interface DetailItem {
  id: string;
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'default' | 'info';
  };
  metadata?: Array<{ label: string; value: string }>;
  avatar?: string;
  icon?: React.ReactNode;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: (item: DetailItem) => void;
  variant?: 'default' | 'destructive' | 'success';
}

export interface CardDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'coral' | 'teal' | 'warning' | 'success' | 'default';
  items: DetailItem[];
  loading?: boolean;
  quickActions?: QuickAction[];
  onItemClick?: (item: DetailItem) => void;
  filterOptions?: Array<{ label: string; value: string }>;
  onFilterChange?: (filter: string) => void;
  exportFileName?: string;
  emptyMessage?: string;
}

const statusColors = {
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  default: 'bg-muted text-muted-foreground border-muted',
};

export function CardDetailModal({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  color = 'default',
  items,
  loading = false,
  quickActions = [],
  onItemClick,
  filterOptions,
  onFilterChange,
  exportFileName = 'dados',
  emptyMessage = 'Nenhum item encontrado',
}: CardDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.subtitle?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Dados');

    // Get all unique metadata keys for headers
    const metadataKeys = new Set<string>();
    filteredItems.forEach(item => {
      item.metadata?.forEach(m => metadataKeys.add(m.label));
    });

    // Define columns
    const columns: Partial<ExcelJS.Column>[] = [
      { header: 'Nome', key: 'nome', width: 30 },
      { header: 'Detalhes', key: 'detalhes', width: 30 },
      { header: 'Status', key: 'status', width: 15 },
      ...Array.from(metadataKeys).map(key => ({ header: key, key: key.toLowerCase(), width: 20 }))
    ];
    worksheet.columns = columns;

    // Add rows
    filteredItems.forEach((item) => {
      const row: Record<string, string> = {
        nome: item.title,
        detalhes: item.subtitle || '',
        status: item.status?.label || '',
      };
      item.metadata?.forEach(m => {
        row[m.label.toLowerCase()] = m.value;
      });
      worksheet.addRow(row);
    });

    // Style header row
    worksheet.getRow(1).font = { bold: true };

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName}-${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter);
    onFilterChange?.(filter);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 gap-0 overflow-hidden bg-card/95 backdrop-blur-xl border-border/50">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border/50 space-y-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  color === 'coral' && "gradient-coral shadow-glow-primary",
                  color === 'teal' && "gradient-teal shadow-glow-secondary",
                  color === 'warning' && "bg-amber-500/20",
                  color === 'success' && "bg-green-500/20",
                  color === 'default' && "neu-pressed"
                )}>
                  {icon}
                </div>
              )}
              <div>
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <Badge variant="outline" className="font-mono">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
            </Badge>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="p-3 border-b border-border/50 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-muted/50"
            />
          </div>

          {filterOptions && filterOptions.length > 0 && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={activeFilter === 'all' ? 'secondary' : 'ghost'}
                onClick={() => handleFilterChange('all')}
                className="h-8 text-xs"
              >
                Todos
              </Button>
              {filterOptions.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={activeFilter === opt.value ? 'secondary' : 'ghost'}
                  onClick={() => handleFilterChange(opt.value)}
                  className="h-8 text-xs"
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            className="h-8 gap-1.5"
            disabled={filteredItems.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Exportar
          </Button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 max-h-[calc(85vh-180px)]">
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                    className={cn(
                      "group p-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-all",
                      onItemClick && "cursor-pointer hover:border-primary/30"
                    )}
                    onClick={() => onItemClick?.(item)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar/Icon */}
                      {item.avatar ? (
                        <img
                          src={item.avatar}
                          alt={item.title}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : item.icon ? (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {item.icon}
                        </div>
                      ) : null}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          {item.status && (
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0", statusColors[item.status.variant])}
                            >
                              {item.status.label}
                            </Badge>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                        {item.metadata && item.metadata.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            {item.metadata.map((meta, idx) => (
                              <span key={idx} className="text-[10px] text-muted-foreground">
                                <span className="font-medium">{meta.label}:</span> {meta.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {quickActions.slice(0, 2).map((action) => (
                          <Button
                            key={action.id}
                            size="icon"
                            variant="ghost"
                            className={cn(
                              "h-8 w-8",
                              action.variant === 'destructive' && "hover:bg-destructive/10 hover:text-destructive",
                              action.variant === 'success' && "hover:bg-green-500/10 hover:text-green-500"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick(item);
                            }}
                          >
                            {action.icon}
                          </Button>
                        ))}
                        {quickActions.length > 2 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {quickActions.slice(2).map((action) => (
                                <DropdownMenuItem
                                  key={action.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    action.onClick(item);
                                  }}
                                  className={cn(
                                    action.variant === 'destructive' && "text-destructive focus:text-destructive"
                                  )}
                                >
                                  {action.icon}
                                  <span className="ml-2">{action.label}</span>
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        {onItemClick && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
