'use client';

import { useEffect, useRef } from 'react';

interface Beam {
  x: number;
  y: number;
  width: number;
  length: number;
  angle: number;
  speed: number;
  opacity: number;
  hue: number;
  pulse: number;
  pulseSpeed: number;
}

/**
 * Feixes de luz laranja/âmbar do hero (decorativo).
 * Otimizado: 30fps, devicePixelRatio limitado a 1.25, ~24 feixes,
 * pausa via IntersectionObserver quando o hero sai da viewport.
 */
export default function HeroBeams() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    if (!ctx || !host) return;

    const MIN = 16;
    const hueBase = 12;
    const hueRange = 26;
    const opacity = 1; // intensity: strong
    let beams: Beam[] = [];
    let rafId = 0;

    const createBeam = (w: number, h: number): Beam => {
      const angle = -35 + Math.random() * 10;
      return {
        x: Math.random() * w * 1.5 - w * 0.25,
        y: Math.random() * h * 1.5 - h * 0.25,
        width: 30 + Math.random() * 60,
        length: h * 2.5,
        angle,
        speed: 0.6 + Math.random() * 1.2,
        opacity: 0.12 + Math.random() * 0.16,
        hue: hueBase + Math.random() * hueRange,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      };
    };

    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
      const w = host.offsetWidth;
      const h = host.offsetHeight;
      if (!w || !h) return;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      beams = Array.from({ length: Math.floor(MIN * 1.5) }, () =>
        createBeam(canvas.width, canvas.height)
      );
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    let ro: ResizeObserver | undefined;
    try {
      ro = new ResizeObserver(updateSize);
      ro.observe(host);
    } catch {}

    const resetBeam = (beam: Beam, index: number, total: number) => {
      const column = index % 3;
      const spacing = canvas.width / 3;
      beam.y = canvas.height + 100;
      beam.x = column * spacing + spacing / 2 + (Math.random() - 0.5) * spacing * 0.5;
      beam.width = 100 + Math.random() * 100;
      beam.speed = 0.5 + Math.random() * 0.4;
      beam.hue = hueBase + (index * hueRange) / total;
      beam.opacity = 0.2 + Math.random() * 0.1;
      return beam;
    };

    const drawBeam = (beam: Beam) => {
      ctx.save();
      ctx.translate(beam.x, beam.y);
      ctx.rotate((beam.angle * Math.PI) / 180);
      const po = beam.opacity * (0.8 + Math.sin(beam.pulse) * 0.2) * opacity;
      const g = ctx.createLinearGradient(0, 0, 0, beam.length);
      g.addColorStop(0, 'hsla(' + beam.hue + ', 85%, 62%, 0)');
      g.addColorStop(0.1, 'hsla(' + beam.hue + ', 85%, 62%, ' + po * 0.5 + ')');
      g.addColorStop(0.4, 'hsla(' + beam.hue + ', 85%, 62%, ' + po + ')');
      g.addColorStop(0.6, 'hsla(' + beam.hue + ', 85%, 62%, ' + po + ')');
      g.addColorStop(0.9, 'hsla(' + beam.hue + ', 85%, 62%, ' + po * 0.5 + ')');
      g.addColorStop(1, 'hsla(' + beam.hue + ', 85%, 62%, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(-beam.width / 2, 0, beam.width, beam.length);
      ctx.restore();
    };

    let last = 0;
    const frameMs = 1000 / 30;
    const animate = (t: number) => {
      rafId = requestAnimationFrame(animate);
      if (t - last < frameMs) return;
      last = t;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const total = beams.length;
      beams.forEach((beam, i) => {
        beam.y -= beam.speed;
        beam.pulse += beam.pulseSpeed;
        if (beam.y + beam.length < -100) resetBeam(beam, i, total);
        drawBeam(beam);
      });
    };

    const startLoop = () => {
      if (!rafId) {
        last = 0;
        rafId = requestAnimationFrame(animate);
      }
    };
    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    startLoop();
    let io: IntersectionObserver | undefined;
    try {
      io = new IntersectionObserver(
        (es) => {
          if (es[0].isIntersecting) startLoop();
          else stopLoop();
        },
        { threshold: 0 }
      );
      io.observe(host);
    } catch {}

    return () => {
      stopLoop();
      window.removeEventListener('resize', updateSize);
      try { ro?.disconnect(); } catch {}
      try { io?.disconnect(); } catch {}
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        filter: 'blur(22px)',
        transform: 'translateZ(0)',
        pointerEvents: 'none',
      }}
    />
  );
}
