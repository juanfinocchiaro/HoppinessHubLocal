import { useState, useEffect, useRef } from 'react';
import { BRAND } from './brand-tokens';
import logoSrc from '@/assets/logo-hoppiness-loader.png';

interface SplashLoaderProps {
  onComplete: () => void;
  navLogoPosition?: { top: number; left: number };
  navLogoSize?: number;
}

export function SplashLoader({
  onComplete,
  navLogoPosition = { top: 18, left: 40 },
  navLogoSize = 32,
}: SplashLoaderProps) {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 150),
      setTimeout(() => setStep(2), 650),
      setTimeout(() => setStep(3), 1100),
      setTimeout(() => setStep(4), 1800),
      setTimeout(() => onComplete?.(), 2100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';

    const cx = W / 2;
    const cy = H / 2;
    let startTime: number | null = null;

    const particles = Array.from({ length: 24 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 200 + Math.random() * 400;
      const colors = [BRAND.naranja, BRAND.amarillo, '#ffffff', BRAND.naranja, BRAND.amarillo];
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 1.5 + Math.random() * 1,
      };
    });

    const hexToRgb = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const draw = (now: number) => {
      if (!startTime) startTime = now;
      const t = (now - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);

      [
        {
          delay: 0,
          maxR: Math.max(W, H) * 0.5,
          dur: 0.6,
          color: '255,82,29',
          width: 3,
        },
        {
          delay: 0.05,
          maxR: Math.max(W, H) * 0.55,
          dur: 0.7,
          color: '255,212,31',
          width: 2,
        },
        {
          delay: 0.1,
          maxR: Math.max(W, H) * 0.6,
          dur: 0.8,
          color: '255,255,255',
          width: 1.5,
        },
      ].forEach((ring) => {
        const rt = t - ring.delay;
        if (rt < 0 || rt > ring.dur) return;
        const progress = rt / ring.dur;
        const eased = 1 - Math.pow(1 - progress, 3);
        ctx.beginPath();
        ctx.arc(cx, cy, eased * ring.maxR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${ring.color},${(1 - progress) * 0.6})`;
        ctx.lineWidth = ring.width * (1 - progress);
        ctx.stroke();
      });

      if (t < 0.25) {
        const a = (1 - t / 0.25) * 0.4;
        const r = 60 + (t / 0.25) * 150;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, `rgba(255,255,255,${a})`);
        grad.addColorStop(0.4, `rgba(255,82,29,${a * 0.5})`);
        grad.addColorStop(1, 'rgba(255,82,29,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      particles.forEach((p) => {
        if (p.life <= 0) return;
        p.x += p.vx * 0.016;
        p.y += p.vy * 0.016;
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.life -= 0.016 * p.decay;
        if (p.life > 0) {
          const { r, g, b } = hexToRgb(p.color);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.life})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${p.life * 0.15})`;
          ctx.fill();
        }
      });

      if (t < 1.5) animRef.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, W, H);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const logoStyle = ((): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'fixed',
      zIndex: 20,
      willChange: 'transform, width, height, top, left',
    };
    if (step === 0)
      return {
        ...base,
        width: '160px',
        height: '160px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(0)',
        opacity: 0,
        transition: 'none',
      };
    if (step === 1)
      return {
        ...base,
        width: '160px',
        height: '160px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1,
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease',
        filter:
          'drop-shadow(0 0 40px rgba(255,82,29,0.4)) drop-shadow(0 0 80px rgba(255,212,31,0.15))',
      };
    if (step === 2)
      return {
        ...base,
        width: '160px',
        height: '160px',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) scale(1)',
        opacity: 1,
        transition: 'filter 0.4s ease',
        filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.1))',
      };
    return {
      ...base,
      width: `${navLogoSize}px`,
      height: `${navLogoSize}px`,
      top: `${navLogoPosition.top}px`,
      left: `${navLogoPosition.left}px`,
      transform: 'translate(0, 0) scale(1)',
      opacity: step >= 4 ? 0 : 1,
      transition: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease 0.5s',
      filter: 'none',
    };
  })();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: BRAND.heroBg,
        opacity: step >= 3 ? 0 : 1,
        transition: step >= 3 ? 'opacity 0.7s cubic-bezier(0.4,0,0.2,1)' : 'none',
        pointerEvents: step >= 4 ? 'none' : 'auto',
      }}
    >
      <canvas
        ref={canvasRef}
        data-step={step}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 16,
          pointerEvents: 'none',
        }}
      />
      <img src={logoSrc} alt="Hoppiness Club" style={logoStyle} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
          opacity: step >= 3 ? 0 : 0.5,
          transition: 'opacity 0.5s ease',
        }}
      />
    </div>
  );
}
