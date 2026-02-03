import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface OrbitalMenuItem {
  id: string;
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: number;
  isLocked?: boolean;
  children?: OrbitalMenuItem[];
}

export interface OrbitalMenuSection {
  id: string;
  title: string;
  items: OrbitalMenuItem[];
}

interface OrbitalMenuProps {
  sections: OrbitalMenuSection[];
  activeItem: string;
  onItemClick: (path: string) => void;
  collapsed?: boolean;
}

export function OrbitalMenu({ sections, activeItem, onItemClick, collapsed = false }: OrbitalMenuProps) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {sections.map((section, sectionIndex) => (
        <div key={section.id} className="relative">
          {/* Section Title */}
          {!collapsed && section.title && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: sectionIndex * 0.05 }}
              className="px-3 py-2 mb-1"
            >
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground/60">
                {section.title}
              </span>
            </motion.div>
          )}

          {/* Items */}
          <div className="space-y-0.5">
            {section.items.map((item, itemIndex) => (
              <OrbitalMenuItem
                key={item.id}
                item={item}
                isActive={activeItem === item.path || item.children?.some(c => c.path === activeItem)}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleExpanded(item.id)}
                onClick={onItemClick}
                collapsed={collapsed}
                delay={(sectionIndex * section.items.length + itemIndex) * 0.03}
                activeItem={activeItem}
              />
            ))}
          </div>

          {/* Section Divider */}
          {sectionIndex < sections.length - 1 && !collapsed && (
            <div className="mx-3 my-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          )}
        </div>
      ))}
    </nav>
  );
}

interface OrbitalMenuItemProps {
  item: OrbitalMenuItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onClick: (path: string) => void;
  collapsed: boolean;
  delay: number;
  activeItem: string;
}

function OrbitalMenuItem({ 
  item, 
  isActive, 
  isExpanded, 
  onToggle, 
  onClick, 
  collapsed, 
  delay,
  activeItem 
}: OrbitalMenuItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  const handleClick = () => {
    if (hasChildren) {
      onToggle();
    } else if (!item.isLocked) {
      onClick(item.path);
    }
  };

  return (
    <div>
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={item.isLocked}
        className={cn(
          "group relative w-full flex items-center gap-3 h-11 px-3 rounded-xl transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98]",
          collapsed && "justify-center px-2",
          item.isLocked && "opacity-40 cursor-not-allowed",
          isActive 
            ? "glass-card-active text-white" 
            : "text-sidebar-foreground hover:glass-card-hover"
        )}
      >
        {/* Glow Effect for Active */}
        {isActive && (
          <motion.div
            layoutId="activeGlow"
            className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent opacity-80"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {/* Active Indicator Bar */}
        {isActive && (
          <motion.span
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 24, opacity: 1 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-gradient-to-b from-primary via-primary to-primary/60"
            style={{
              boxShadow: '0 0 12px hsl(var(--primary) / 0.6), 0 0 24px hsl(var(--primary) / 0.3)'
            }}
          />
        )}

        {/* Icon Container with Orbital Effect */}
        <div className={cn(
          "relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-300",
          isActive 
            ? "bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg" 
            : "glass-icon group-hover:glass-icon-hover"
        )}
          style={{
            boxShadow: isActive ? '0 4px 15px hsl(var(--primary) / 0.4)' : undefined
          }}
        >
          {/* Orbital Ring on Hover */}
          <motion.div
            initial={false}
            animate={{
              scale: isHovered && !isActive ? 1.3 : 1,
              opacity: isHovered && !isActive ? 0.3 : 0
            }}
            className="absolute inset-0 rounded-lg border border-primary/50"
          />
          <Icon className="h-4 w-4 relative z-10" />
        </div>

        {/* Label */}
        {!collapsed && (
          <span className={cn(
            "flex-1 text-left text-sm font-medium transition-all duration-200",
            isActive ? "text-white" : "group-hover:text-foreground"
          )}>
            {item.label}
          </span>
        )}

        {/* Badge */}
        {!collapsed && item.badge !== undefined && item.badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-2 py-0.5 text-xs font-bold rounded-full bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg"
            style={{ boxShadow: '0 2px 8px hsl(var(--primary) / 0.4)' }}
          >
            {item.badge}
          </motion.span>
        )}

        {/* Expand Icon */}
        {!collapsed && hasChildren && (
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}

        {/* Locked Icon */}
        {item.isLocked && !collapsed && (
          <span className="text-xs text-muted-foreground">🔒</span>
        )}
      </motion.button>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && isExpanded && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border/30 pl-2">
              {item.children!.map((child, idx) => (
                <motion.button
                  key={child.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onClick(child.path)}
                  className={cn(
                    "w-full flex items-center gap-2 h-9 px-3 rounded-lg transition-all duration-200",
                    "hover:scale-[1.01] active:scale-[0.99]",
                    activeItem === child.path
                      ? "glass-card-active text-white"
                      : "text-sidebar-foreground/80 hover:text-foreground hover:bg-white/5"
                  )}
                >
                  <child.icon className="h-3.5 w-3.5" />
                  <span className="text-sm">{child.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OrbitalMenu;
