import { useEffect, useRef } from 'react';

interface CyberpunkGridProps {
  width: number;
  height: number;
}

export function CyberpunkGrid({ width, height }: CyberpunkGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gridSize = 40;
    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.01;

      // Perspective grid floor
      ctx.save();
      ctx.translate(width / 2, height);
      
      // Draw horizontal lines with perspective
      for (let y = 0; y < 20; y++) {
        const perspY = Math.pow(y / 20, 2) * height * 0.6;
        const lineWidth = (20 - y) / 20;
        const alpha = 0.1 + (y / 20) * 0.15;
        const hue = (time * 30 + y * 5) % 360;
        
        ctx.beginPath();
        ctx.moveTo(-width, -perspY);
        ctx.lineTo(width, -perspY);
        ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }

      // Draw vertical lines with perspective
      for (let x = -20; x <= 20; x++) {
        const startX = x * gridSize * 2;
        const endX = x * gridSize * 0.2;
        const alpha = 0.08 + Math.abs(x) / 40 * 0.1;
        const hue = (time * 20 + Math.abs(x) * 10) % 360;
        
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(endX, -height * 0.6);
        ctx.strokeStyle = `hsla(${hue}, 60%, 50%, ${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      ctx.restore();

      // Animated scan line
      const scanY = ((time * 100) % (height * 2)) - height * 0.5;
      const scanGradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50);
      scanGradient.addColorStop(0, 'rgba(139, 92, 246, 0)');
      scanGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.15)');
      scanGradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
      ctx.fillStyle = scanGradient;
      ctx.fillRect(0, scanY - 50, width, 100);

      // Corner brackets
      const bracketSize = 60;
      const bracketThickness = 2;
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.lineWidth = bracketThickness;

      // Top-left
      ctx.beginPath();
      ctx.moveTo(20, 20 + bracketSize);
      ctx.lineTo(20, 20);
      ctx.lineTo(20 + bracketSize, 20);
      ctx.stroke();

      // Top-right
      ctx.beginPath();
      ctx.moveTo(width - 20 - bracketSize, 20);
      ctx.lineTo(width - 20, 20);
      ctx.lineTo(width - 20, 20 + bracketSize);
      ctx.stroke();

      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(20, height - 20 - bracketSize);
      ctx.lineTo(20, height - 20);
      ctx.lineTo(20 + bracketSize, height - 20);
      ctx.stroke();

      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(width - 20 - bracketSize, height - 20);
      ctx.lineTo(width - 20, height - 20);
      ctx.lineTo(width - 20, height - 20 - bracketSize);
      ctx.stroke();

      // Floating data streams
      for (let i = 0; i < 5; i++) {
        const streamX = (time * 50 + i * width / 5) % width;
        const streamHeight = 100 + Math.sin(time + i) * 50;
        const gradient = ctx.createLinearGradient(streamX, 0, streamX, streamHeight);
        gradient.addColorStop(0, 'rgba(16, 185, 129, 0)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.3)');
        gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(streamX - 1, 0, 2, streamHeight);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}
