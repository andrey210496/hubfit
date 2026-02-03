import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarPreviewProps {
  src?: string;
  fallback: string;
  isGroup?: boolean;
  name?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

export function AvatarPreview({
  src,
  fallback,
  isGroup = false,
  name,
  className,
  size = "md",
}: AvatarPreviewProps) {
  const hasImage = !!src;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className={cn(
            "rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            hasImage && "cursor-pointer hover:opacity-80 transition-opacity"
          )}
          disabled={!hasImage}
        >
          <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarImage src={src} alt={name || "Avatar"} />
            <AvatarFallback className="bg-muted text-muted-foreground">
              {isGroup ? (
                <Users className="h-5 w-5" />
              ) : (
                fallback || <User className="h-5 w-5" />
              )}
            </AvatarFallback>
          </Avatar>
        </button>
      </DialogTrigger>
      {hasImage && (
        <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background/95 backdrop-blur">
          <div className="flex flex-col items-center p-6">
            <img
              src={src}
              alt={name || "Profile picture"}
              className="w-64 h-64 rounded-full object-cover shadow-lg"
            />
            {name && (
              <p className="mt-4 text-lg font-medium text-foreground">{name}</p>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
