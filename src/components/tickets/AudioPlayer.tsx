import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  fromMe?: boolean;
}

export function AudioPlayer({ src, fromMe = false }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [playSrc, setPlaySrc] = useState(src);
  const [playType, setPlayType] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Generate pseudo-random waveform bars based on src hash
  const waveformBars = useRef<number[]>(
    Array.from({ length: 32 }, (_, i) => {
      const safeLen = Math.max(src.length, 1);
      const seed = src.charCodeAt(i % safeLen) || 0;
      return 0.2 + (Math.sin(seed + i * 0.5) * 0.5 + 0.5) * 0.6;
    })
  ).current;

  // Load audio via fetch -> blob URL to avoid CORS/Range/metadata issues in some browsers
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const resetState = () => {
      setIsPlaying(false);
      setIsLoaded(false);
      setError(false);
      setDuration(0);
      setCurrentTime(0);
      setPlayType(null);
    };

    const cleanupBlobUrl = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };

    const load = async () => {
      resetState();
      cleanupBlobUrl();
      setPlaySrc(src);

      if (!src || !src.startsWith('http')) return;

      try {
        const resp = await fetch(src, { signal: controller.signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;

        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        setPlayType(blob.type || null);
        setPlaySrc(url);
      } catch (e) {
        // Fallback to direct URL (audio element will still try)
        setPlayType(null);
        console.warn('[AudioPlayer] fetch failed, using direct URL:', e);
      }
    };

    void load();

    return () => {
      active = false;
      controller.abort();
      cleanupBlobUrl();
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Force Safari to recalc metadata when changing source
    audio.load();

    const handleLoadedMetadata = () => {
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleCanPlay = () => {
      setIsLoaded(true);
      setError(false);
      if (isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    const handleError = () => {
      setError(true);
      setIsLoaded(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [playSrc]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio || error) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (e) {
      console.error('[AudioPlayer] play failed:', e);
    }
  };

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const progress = progressRef.current;
    if (!audio || !progress || !isLoaded) return;

    const rect = progress.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;

    // If duration is unknown (0), we can't seek reliably
    if (!duration || !isFinite(duration)) return;

    audio.currentTime = percentage * duration;
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time) || time < 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm py-2">
        <span>🎙️ Áudio não disponível</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
      >
        {/* iOS Safari workaround: prefer using <source> instead of setting audio.src directly */}
        <source src={playSrc} type={playType || undefined} />
      </audio>

      <button
        onClick={togglePlay}
        disabled={!isLoaded}
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all',
          fromMe
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
            : 'bg-primary/20 hover:bg-primary/30 text-primary',
          !isLoaded && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isPlaying ? (
          <Pause className="h-5 w-5" />
        ) : (
          <Play className="h-5 w-5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={progressRef}
          onClick={handleProgressClick}
          className={cn(
            'relative h-8 flex items-center gap-[2px]',
            duration > 0 && isLoaded ? 'cursor-pointer' : 'cursor-default'
          )}
        >
          {waveformBars.map((height, i) => {
            const barProgress = (i / waveformBars.length) * 100;
            const isPlayed = barProgress <= progress;

            return (
              <div
                key={i}
                className={cn(
                  'flex-1 rounded-full transition-colors duration-150',
                  fromMe
                    ? isPlayed
                      ? 'bg-primary-foreground'
                      : 'bg-primary-foreground/40'
                    : isPlayed
                      ? 'bg-primary'
                      : 'bg-primary/40'
                )}
                style={{
                  height: `${height * 100}%`,
                  minHeight: '4px',
                }}
              />
            );
          })}
        </div>

        <div
          className={cn(
            'text-[11px] font-medium',
            fromMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
          )}
        >
          {isPlaying || currentTime > 0
            ? formatTime(currentTime)
            : duration > 0
              ? formatTime(duration)
              : '—:—'}
        </div>
      </div>
    </div>
  );
}
