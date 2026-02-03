import { useEffect, useState } from 'react';
import { usePublicAnnouncements } from '@/hooks/useAnnouncements';
import { ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function LoginAnnouncementCarousel() {
  const { announcements, loading } = usePublicAnnouncements();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (announcements.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/10" />
          <div className="h-4 w-48 bg-white/10 rounded" />
        </div>
      </div>
    );
  }

  if (announcements.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-white/80 p-6 md:p-8">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center mb-5 md:mb-6">
          <Megaphone className="w-8 h-8 md:w-10 md:h-10" />
        </div>
        <h3 className="text-xl md:text-2xl font-bold mb-2">Bem-vindo ao HubFit</h3>
        <p className="text-white/60 text-center max-w-md text-sm md:text-base">
          Sua plataforma completa de atendimento e gestão de relacionamento com clientes.
        </p>
      </div>
    );
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="h-full flex flex-col p-6 md:p-8 relative">
      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {currentAnnouncement.media_path && (
          <div
            className="w-full max-w-lg h-40 md:h-64 mb-6 md:mb-8 rounded-2xl bg-white/10 bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentAnnouncement.media_path})`,
            }}
          />
        )}

        <div className="text-center max-w-xl px-6">
          <span
            className={cn(
              "inline-block px-3 py-1 rounded-full text-xs font-medium mb-4",
              currentAnnouncement.priority === 1
                ? "bg-red-500/20 text-red-300"
                : currentAnnouncement.priority === 2
                  ? "bg-yellow-500/20 text-yellow-300"
                  : "bg-blue-500/20 text-blue-300"
            )}
          >
            {currentAnnouncement.priority === 1
              ? 'Prioridade Alta'
              : currentAnnouncement.priority === 2
                ? 'Importante'
                : 'Novidade'}
          </span>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
            {currentAnnouncement.title}
          </h2>

          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            {currentAnnouncement.text}
          </p>
        </div>
      </div>

      {/* Navigation */}
      {announcements.length > 1 && (
        <>
          {/* Arrow controls */}
          <div className="absolute top-1/2 -translate-y-1/2 left-3 md:left-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevious}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>

          <div className="absolute top-1/2 -translate-y-1/2 right-3 md:right-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNext}
              className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Dots indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {announcements.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentIndex ? "w-8 bg-white" : "bg-white/30 hover:bg-white/50"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
