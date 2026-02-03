import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, RefreshCw, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WebcamCaptureProps {
  onCapture: (photoBlob: Blob) => void;
  onCancel?: () => void;
  capturedPhoto?: Blob | null;
  onClear?: () => void;
  className?: string;
}

export function WebcamCapture({ 
  onCapture, 
  onCancel, 
  capturedPhoto, 
  onClear,
  className 
}: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }

      setStream(mediaStream);
      setIsLoading(false);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setIsLoading(false);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Permissão de câmera negada. Por favor, permita o acesso à câmera.');
        } else if (err.name === 'NotFoundError') {
          setError('Nenhuma câmera encontrada. Conecte uma webcam.');
        } else {
          setError('Erro ao acessar a câmera. Verifique as permissões.');
        }
      } else {
        setError('Erro desconhecido ao acessar a câmera.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (!capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (capturedPhoto) {
      const url = URL.createObjectURL(capturedPhoto);
      setPhotoPreview(url);
      stopCamera();
      return () => URL.revokeObjectURL(url);
    } else {
      setPhotoPreview(null);
    }
  }, [capturedPhoto, stopCamera]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add timestamp overlay
    const now = new Date();
    const timestamp = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.fillText(`PAR-Q - ${timestamp}`, 10, canvas.height - 10);

    canvas.toBlob((blob) => {
      if (blob) {
        onCapture(blob);
        stopCamera();
      }
    }, 'image/jpeg', 0.85);
  }, [onCapture, stopCamera]);

  const startCountdown = useCallback(() => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (prev === 1) {
            setTimeout(capturePhoto, 100);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [capturePhoto]);

  const handleRetake = useCallback(() => {
    onClear?.();
    setPhotoPreview(null);
    startCamera();
  }, [onClear, startCamera]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          {/* Loading state */}
          {isLoading && !photoPreview && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Iniciando câmera...</p>
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3 p-4">
                <AlertCircle className="h-10 w-10 mx-auto text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={startCamera}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </Button>
              </div>
            </div>
          )}

          {/* Video preview */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              (isLoading || error || photoPreview) && "hidden"
            )}
          />

          {/* Captured photo preview */}
          {photoPreview && (
            <img
              src={photoPreview}
              alt="Foto capturada"
              className="w-full h-full object-cover"
            />
          )}

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Countdown overlay */}
          <AnimatePresence>
            {countdown !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <motion.span
                  key={countdown}
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="text-7xl font-bold text-white"
                >
                  {countdown}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Photo captured indicator */}
          {photoPreview && (
            <div className="absolute top-3 right-3">
              <div className="bg-success/90 text-white px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium">
                <Check className="h-4 w-4" />
                Foto capturada
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-3 mt-4">
          {!photoPreview ? (
            <>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
              <Button
                onClick={startCountdown}
                disabled={isLoading || !!error || countdown !== null}
                className="gap-2"
              >
                <Camera className="h-4 w-4" />
                {countdown !== null ? 'Preparando...' : 'Tirar Foto'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleRetake}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Nova foto
              </Button>
              <Button variant="default" className="gap-2 bg-success hover:bg-success/90">
                <Check className="h-4 w-4" />
                Foto confirmada
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          A foto será salva junto com o PAR-Q para comprovação legal
        </p>
      </CardContent>
    </Card>
  );
}
