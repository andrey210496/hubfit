import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  pulsePhase: number;
  type: 'normal' | 'data' | 'energy';
}

interface DataStream {
  x: number;
  y: number;
  length: number;
  speed: number;
  color: string;
  chars: string[];
}

interface NeuralParticlesProps {
  width: number;
  height: number;
  intensity?: 'low' | 'medium' | 'high';
}

export function NeuralParticles({ width, height, intensity = 'high' }: NeuralParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const dataStreamsRef = useRef<DataStream[]>([]);
  const animationRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = ['#8B5CF6', '#6366F1', '#3B82F6', '#10B981', '#06B6D4', '#EC4899'];
    const multiplier = intensity === 'high' ? 1.5 : intensity === 'medium' ? 1 : 0.5;
    const numParticles = Math.floor((width * height) / 8000 * multiplier);

    // Initialize particles with different types
    particlesRef.current = Array.from({ length: numParticles }, () => {
      const type = Math.random() > 0.7 ? 'energy' : Math.random() > 0.5 ? 'data' : 'normal';
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (type === 'energy' ? 0.8 : 0.4),
        vy: (Math.random() - 0.5) * (type === 'energy' ? 0.8 : 0.4),
        size: type === 'energy' ? Math.random() * 3 + 2 : Math.random() * 2 + 0.5,
        opacity: Math.random() * 0.6 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        type,
      };
    });

    // Initialize data streams (Matrix-like effect)
    const numStreams = Math.floor(width / 80 * multiplier);
    const matrixChars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
    
    dataStreamsRef.current = Array.from({ length: numStreams }, () => ({
      x: Math.random() * width,
      y: Math.random() * height - height,
      length: Math.floor(Math.random() * 15) + 5,
      speed: Math.random() * 2 + 1,
      color: Math.random() > 0.3 ? '#10B981' : '#8B5CF6',
      chars: Array.from({ length: 20 }, () => matrixChars[Math.floor(Math.random() * matrixChars.length)]),
    }));

    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;
      
      // Create fade effect instead of full clear
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, width, height);

      const particles = particlesRef.current;
      const dataStreams = dataStreamsRef.current;

      // Draw data streams
      dataStreams.forEach((stream) => {
        stream.y += stream.speed;
        
        if (stream.y > height + stream.length * 20) {
          stream.y = -stream.length * 20;
          stream.x = Math.random() * width;
        }

        stream.chars.forEach((char, idx) => {
          const charY = stream.y - idx * 15;
          if (charY < 0 || charY > height) return;
          
          const alpha = (1 - idx / stream.length) * 0.4;
          ctx.font = '12px monospace';
          ctx.fillStyle = idx === 0 ? '#ffffff' : stream.color;
          ctx.globalAlpha = alpha;
          ctx.fillText(char, stream.x, charY);
        });

        // Randomly change characters
        if (Math.random() > 0.95) {
          const idx = Math.floor(Math.random() * stream.chars.length);
          stream.chars[idx] = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        }
      });

      ctx.globalAlpha = 1;

      // Update and draw particles
      particles.forEach((p, i) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulsing effect
        const pulse = Math.sin(time * 3 + p.pulsePhase) * 0.3 + 0.7;
        const currentSize = p.size * (p.type === 'energy' ? pulse : 1);
        const currentOpacity = p.opacity * pulse;

        // Draw glow for energy particles
        if (p.type === 'energy') {
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, currentSize * 4);
          gradient.addColorStop(0, p.color);
          gradient.addColorStop(0.5, p.color + '40');
          gradient.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(p.x, p.y, currentSize * 4, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.globalAlpha = currentOpacity * 0.5;
          ctx.fill();
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentOpacity;
        ctx.fill();

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = p.type === 'energy' || p2.type === 'energy' ? 150 : 100;

          if (dist < maxDist) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Gradient line for energy connections
            if (p.type === 'energy' || p2.type === 'energy') {
              const gradient = ctx.createLinearGradient(p.x, p.y, p2.x, p2.y);
              gradient.addColorStop(0, p.color);
              gradient.addColorStop(1, p2.color);
              ctx.strokeStyle = gradient;
              ctx.globalAlpha = (1 - dist / maxDist) * 0.3;
              ctx.lineWidth = 1;
            } else {
              ctx.strokeStyle = p.color;
              ctx.globalAlpha = (1 - dist / maxDist) * 0.15;
              ctx.lineWidth = 0.5;
            }
            ctx.stroke();
          }
        }
      });

      // Draw occasional lightning/energy bursts
      if (Math.random() > 0.99) {
        const burstX = Math.random() * width;
        const burstY = Math.random() * height;
        const burstColor = colors[Math.floor(Math.random() * colors.length)];
        
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2;
          const length = Math.random() * 50 + 30;
          ctx.beginPath();
          ctx.moveTo(burstX, burstY);
          ctx.lineTo(burstX + Math.cos(angle) * length, burstY + Math.sin(angle) * length);
          ctx.strokeStyle = burstColor;
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, intensity]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.8 }}
    />
  );
}
