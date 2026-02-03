import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AudioRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  disabled?: boolean;
}

export function AudioRecorder({ onSend, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;
      
      // Prefer formats with best cross-device playback.
      // iPhone Safari usually needs audio/mp4, while Chrome/Android work well with ogg/webm.
      const preferredMimeTypes = [
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/webm;codecs=opus',
        'audio/webm',
      ];

      const mimeType =
        preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mimeType || mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      setDuration(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    
    setIsSending(true);
    try {
      await onSend(audioBlob);
      cancelRecording();
    } catch (error) {
      console.error('Error sending audio:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Recording in progress
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 text-destructive hover:text-destructive"
          onClick={cancelRecording}
          title="Cancelar gravação"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        
        <div className="flex-1 flex items-center justify-center gap-2 bg-destructive/10 rounded-full h-10 px-4">
          <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
          <span className="text-sm font-medium text-destructive">
            Gravando {formatDuration(duration)}
          </span>
        </div>
        
        <Button
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0"
          onClick={stopRecording}
          title="Parar gravação"
        >
          <Square className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  // Audio recorded, ready to send
  if (audioBlob && audioUrl) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 flex-shrink-0 text-destructive hover:text-destructive"
          onClick={cancelRecording}
          title="Descartar áudio"
          disabled={isSending}
        >
          <Trash2 className="h-5 w-5" />
        </Button>
        
        <div className="flex-1">
          <audio src={audioUrl} controls className="w-full h-10" />
        </div>
        
        <Button
          size="icon"
          className="h-10 w-10 rounded-full flex-shrink-0"
          onClick={handleSend}
          disabled={isSending}
          title="Enviar áudio"
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    );
  }

  // Default state - show mic button
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-10 w-10 flex-shrink-0 text-muted-foreground",
        "hover:text-primary hover:bg-primary/10"
      )}
      onClick={startRecording}
      disabled={disabled}
      title="Gravar áudio"
    >
      <Mic className="h-6 w-6" />
    </Button>
  );
}
