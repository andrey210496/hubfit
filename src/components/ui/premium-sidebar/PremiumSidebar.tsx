import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  Sparkles,
  Crown
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  badge?: number;
  feature?: string;
}

export interface MenuSection {
  label?: string;
  items: MenuItem[];
  collapsible?: boolean;
  collapsibleIcon?: any;
  collapsibleLabel?: string;
}

interface PremiumSidebarProps {
  logo: string;
  logoIcon: string;
  sections: MenuSection[];
  activeItem: string;
  onItemClick: (path: string) => void;
  isLocked?: (item: MenuItem) => boolean;
  planName?: string;
  showUpgrade?: boolean;
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
}

export function PremiumSidebar({
  logo,
  logoIcon,
  sections,
  activeItem,
  onItemClick,
  isLocked = () => false,
  planName = 'Free',
  showUpgrade = true,
  headerContent,
  footerContent,
}: PremiumSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeIndicatorY, setActiveIndicatorY] = useState(0);
  const [collapsibleStates, setCollapsibleStates] = useState<Record<string, boolean>>({});
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const hoverTimeoutRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // Debounced hover handlers with native timeout
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => setIsExpanded(true), 30);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = window.setTimeout(() => setIsExpanded(false), 80);
  }, []);

  // Optimized indicator position update using RAF
  const updateIndicatorPosition = useCallback(() => {
    if (rafRef.current) return; // Debounce with RAF

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const activeButton = itemRefs.current.get(activeItem);
      const sidebar = navRef.current?.closest('aside');
      if (activeButton && sidebar) {
        const sidebarRect = sidebar.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const newY = buttonRect.top - sidebarRect.top + (buttonRect.height / 2) - 24;
        setActiveIndicatorY(newY);
      }
    });
  }, [activeItem]);

  // Update indicator when activeItem or collapsible states change
  useEffect(() => {
    const timeout = window.setTimeout(updateIndicatorPosition, 80);
    return () => window.clearTimeout(timeout);
  }, [activeItem, collapsibleStates, updateIndicatorPosition]);

  // Update on expansion change with longer delay for transition
  useEffect(() => {
    const timeout = window.setTimeout(updateIndicatorPosition, 150);
    return () => window.clearTimeout(timeout);
  }, [isExpanded, updateIndicatorPosition]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (hoverTimeoutRef.current) window.clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const toggleCollapsible = useCallback((key: string) => {
    setCollapsibleStates(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Memoize menu item renderer to prevent re-renders
  const renderMenuItem = useCallback((item: MenuItem) => {
    const locked = isLocked(item);
    const isActive = activeItem === item.path;

    if (locked) {
      return (
        <Tooltip key={item.path} delayDuration={0} open={isExpanded ? false : undefined}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "sidebar-item relative flex items-center h-12 px-3 rounded-xl opacity-40 cursor-not-allowed",
                isExpanded ? "gap-3" : "justify-center px-2"
              )}
            >
              <div className="sidebar-icon flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-muted/50">
                <item.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              {isExpanded && (
                <span
                  className="sidebar-label flex-1 min-w-0 truncate text-sm text-muted-foreground whitespace-nowrap"
                  aria-hidden={false}
                >
                  {item.label}
                </span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="premium-dropdown bg-popover border border-border shadow-xl z-[9999]"
          >
            <p className="flex items-center gap-2">
              <Crown className="h-3 w-3 text-amber-500" />
              Disponível no plano superior
            </p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Tooltip key={item.path} delayDuration={!isExpanded ? 0 : 1000} open={isExpanded ? false : undefined}>
        <TooltipTrigger asChild>
          <button
            ref={(el) => {
              if (el) itemRefs.current.set(item.path, el);
            }}
            className={cn(
              "sidebar-item relative w-full flex items-center h-12 px-3 rounded-xl group",
              isExpanded ? "gap-3" : "justify-center px-2",
              isActive ? "bg-primary/12 glass-card-active" : "hover:bg-muted/40"
            )}
            onClick={() => onItemClick(item.path)}
          >
            {/* Icon Container */}
            <div
              className={cn(
                "sidebar-icon flex-shrink-0 relative flex items-center justify-center w-10 h-10 rounded-xl",
                isActive
                  ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30"
                  : "bg-muted/50 group-hover:bg-muted/80"
              )}
            >
              {isActive && <div className="absolute inset-0 rounded-xl animate-pulse-glow" />}
              <item.icon
                className={cn(
                  "h-5 w-5 relative z-10",
                  isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                )}
              />
            </div>

            {/* Label - Only render when expanded */}
            {isExpanded && (
              <div className="sidebar-label flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span
                    className={cn(
                      "text-sm font-semibold whitespace-nowrap truncate tracking-tight",
                      isActive ? "text-gradient-hubfit" : "text-foreground/90"
                    )}
                  >
                    {item.label}
                  </span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="flex-shrink-0 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-xs px-2.5 py-0.5 rounded-full font-bold shadow-lg shadow-primary/25">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            )}
          </button>
        </TooltipTrigger>
        {!isExpanded && (
          <TooltipContent
            side="right"
            className="premium-dropdown bg-popover border border-border shadow-xl z-[9999]"
          >
            {item.label}
          </TooltipContent>
        )}
      </Tooltip>
    );
  }, [activeItem, isExpanded, isLocked, onItemClick]);

  // Memoize sections rendering
  const renderedSections = useMemo(() => {
    return sections.map((section, sectionIndex) => (
      <div key={sectionIndex} className="space-y-1">
        {/* Section Label - Only render when expanded */}
        {section.label && isExpanded && (
          <div className="sidebar-section-label pt-4 pb-2 px-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
              {section.label}
            </span>
          </div>
        )}

        {!section.label && sectionIndex > 0 && (
          <div className={cn(
            "border-t border-border/30 my-2",
            !isExpanded && "mx-2"
          )} />
        )}

        {/* Collapsible Section */}
        {section.collapsible && section.collapsibleIcon && section.collapsibleLabel ? (
          <Collapsible
            open={collapsibleStates[`section-${sectionIndex}`]}
            onOpenChange={() => toggleCollapsible(`section-${sectionIndex}`)}
          >
            <Tooltip delayDuration={!isExpanded ? 0 : 1000} open={isExpanded ? false : undefined}>
              <TooltipTrigger asChild>
                <CollapsibleTrigger asChild>
                  <button
                    className={cn(
                      "sidebar-item relative w-full flex items-center h-12 px-3 rounded-xl group",
                      isExpanded ? "gap-3" : "justify-center px-2",
                      section.items.some(item => item.path === activeItem)
                        ? "bg-primary/10"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn(
                      "sidebar-icon flex-shrink-0 relative flex items-center justify-center w-9 h-9 rounded-xl",
                      section.items.some(item => item.path === activeItem)
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg"
                        : "bg-muted/60 group-hover:bg-muted"
                    )}>
                      <section.collapsibleIcon className="h-5 w-5" />
                    </div>
                    {isExpanded && (
                      <div className="sidebar-label flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <span className="text-sm font-medium whitespace-nowrap truncate">{section.collapsibleLabel}</span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 flex-shrink-0 transition-transform duration-200",
                              collapsibleStates[`section-${sectionIndex}`] && "rotate-180"
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </button>
                </CollapsibleTrigger>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent
                  side="right"
                  className="premium-dropdown bg-popover border border-border shadow-xl z-[9999]"
                >
                  {section.collapsibleLabel}
                </TooltipContent>
              )}
            </Tooltip>

            <CollapsibleContent className="pl-4 space-y-1 mt-1 overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
              {isExpanded && section.items.map((item) => renderMenuItem(item))}
            </CollapsibleContent>
          </Collapsible>
        ) : (
          section.items.map((item) => renderMenuItem(item))
        )}
      </div>
    ));
  }, [sections, isExpanded, collapsibleStates, activeItem, toggleCollapsible, renderMenuItem]);

  // Sidebar Placeholder to prevent layout shift
  return (
    <div className="w-[68px] h-full flex-shrink-0 relative z-50">
      <aside
        data-expanded={isExpanded ? "true" : "false"}
        className={cn(
          "sidebar-rail h-[100dvh] flex flex-col premium-rail-sidebar absolute top-0 left-0 will-change-[width]",
          isExpanded ? "sidebar-expanded shadow-2xl" : "sidebar-collapsed"
        )}
        style={{
          width: isExpanded ? 248 : 68,
          overflow: 'hidden',
          transition: 'width 0.18s ease-out'
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Glows - CSS only */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="sidebar-glow-top absolute -top-20 -left-20 w-40 h-40 bg-primary/15 rounded-full blur-3xl" />
          <div className="sidebar-glow-bottom absolute -bottom-20 -right-20 w-40 h-40 bg-secondary/15 rounded-full blur-3xl" />
        </div>

        {/* Active Item Indicator - Pure CSS transition instead of Framer Motion */}
        <div
          className="absolute left-0 w-1.5 h-12 z-20 pointer-events-none rounded-r-full transition-all duration-300 ease-out will-change-transform"
          style={{
            transform: `translateY(${activeIndicatorY}px)`,
            opacity: activeIndicatorY > 0 ? 1 : 0
          }}
        >
          <div className="w-full h-full bg-gradient-to-b from-primary via-secondary to-secondary/60 rounded-r-full shadow-[0_0_20px_hsl(var(--primary)/0.7),0_0_40px_hsl(var(--primary)/0.4)]" />
        </div>

        {/* Logo Section */}
        <div className="h-16 flex-shrink-0 flex items-center justify-center border-b border-border/50 relative overflow-hidden">
          <div className="relative">
            <div className="sidebar-logo-glow absolute inset-0 bg-primary/20 rounded-full blur-xl" />
            <img
              src={isExpanded ? logo : logoIcon}
              alt="Logo"
              className={cn(
                "sidebar-logo object-contain relative z-10 transition-all duration-200",
                isExpanded ? "w-44 h-12" : "w-10 h-10"
              )}
            />
          </div>
        </div>

        {/* Header Content */}
        <div className={cn(
          "sidebar-header border-b border-border/50 overflow-hidden transition-all duration-200",
          isExpanded ? "p-3 max-h-20 opacity-100" : "p-0 max-h-0 opacity-0"
        )}>
          {headerContent}
        </div>

        {/* Navigation */}
        <nav ref={navRef} className="flex-1 py-3 px-2 space-y-1 overflow-y-auto scrollbar-premium relative z-10">
          {renderedSections}
        </nav>

        {/* Pro Badge / Upgrade CTA */}
        <div className={cn(
          "sidebar-upgrade border-t border-border/40 overflow-hidden transition-all duration-200",
          showUpgrade && isExpanded && planName !== 'Enterprise'
            ? "p-4 max-h-28 opacity-100"
            : "p-0 max-h-0 opacity-0"
        )}>
          <button className="w-full p-4 rounded-2xl bg-gradient-to-br from-primary/15 via-secondary/10 to-primary/5 border border-primary/25 group hover:border-primary/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-primary/20">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30 flex-shrink-0">
                <Crown className="h-5 w-5 text-white drop-shadow-sm" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Hubfit Pro</span>
                  <Sparkles className="h-3.5 w-3.5 text-secondary animate-pulse flex-shrink-0" />
                </div>
                <span className="text-xs text-muted-foreground">Desbloqueie tudo</span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer Content */}
        {footerContent && (
          <div className="border-t border-border/50 p-3 relative z-10">
            {footerContent}
          </div>
        )}
      </aside>
    </div >
  );
}
