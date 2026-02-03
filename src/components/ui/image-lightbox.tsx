import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageLightbox = ({ src, alt = "Imagem", isOpen, onClose }: ImageLightboxProps) => {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setScale(1);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 4));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 0.5));
  
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = src;
    link.download = alt || "imagem";
    link.target = "_blank";
    link.click();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Diminuir zoom"
        >
          <ZoomOut className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Aumentar zoom"
        >
          <ZoomIn className="h-5 w-5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); handleDownload(); }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Baixar imagem"
        >
          <Download className="h-5 w-5" />
        </button>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          title="Fechar (ESC)"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
        {Math.round(scale * 100)}%
      </div>

      {/* Image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "max-h-[90vh] max-w-[90vw] object-contain transition-transform duration-200 cursor-default"
        )}
        style={{ transform: `scale(${scale})` }}
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
};
