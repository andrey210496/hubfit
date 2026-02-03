import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sun, Moon, RefreshCw, Bell, Search, Settings } from 'lucide-react';
import { useState } from 'react';

interface PremiumHeaderProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onRefresh: () => void;
}

export function PremiumHeader({
  userName = 'Usuário',
  userEmail,
  userAvatar,
  darkMode,
  onToggleDarkMode,
  onRefresh
}: PremiumHeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        "h-16 flex-shrink-0 flex items-center justify-between px-6",
        "glass-header border-b border-white/5"
      )}
    >
      {/* Left Side - Welcome + Search */}
      <div className="flex items-center gap-6">
        {/* Welcome Message */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden md:block"
        >
          <h1 className="text-sm text-muted-foreground">
            Bem-vindo de volta,
          </h1>
          <p className="text-lg font-semibold text-foreground tracking-tight">
            {userName}
          </p>
        </motion.div>

        {/* Search Bar - Glassmorphism */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "relative hidden lg:flex items-center",
            "w-80 h-10 px-4 rounded-xl",
            "bg-white/5 backdrop-blur-md border transition-all duration-300",
            searchFocused 
              ? "border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]"
              : "border-white/10 hover:border-white/20"
          )}
        >
          <Search className="h-4 w-4 text-muted-foreground mr-3" />
          <input
            type="text"
            placeholder="Buscar..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden md:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </motion.div>
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-xl glass-button hover:glass-button-hover"
          >
            <Bell className="h-4 w-4" />
            {/* Notification Dot */}
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
          </Button>
        </motion.div>

        {/* Theme Toggle */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleDarkMode}
            className="h-10 w-10 rounded-xl glass-button hover:glass-button-hover"
          >
            <motion.div
              initial={false}
              animate={{ rotate: darkMode ? 180 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.div>
          </Button>
        </motion.div>

        {/* Refresh */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            className="h-10 w-10 rounded-xl glass-button hover:glass-button-hover"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </motion.div>

        {/* Divider */}
        <div className="w-px h-8 bg-border/50 mx-2" />

        {/* User Avatar */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative">
            <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-300">
              {userAvatar ? (
                <AvatarImage src={userAvatar} alt={userName} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {/* Online Status */}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
          </div>
        </motion.div>
      </div>
    </motion.header>
  );
}

export default PremiumHeader;
