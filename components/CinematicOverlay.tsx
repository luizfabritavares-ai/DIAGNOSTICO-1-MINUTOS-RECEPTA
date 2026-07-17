'use client';

/* =========================================================================
   CinematicOverlay — experiência full-screen do diagnóstico
   - stage 'processing': tela de loading (animação da marca ou asset do
     cliente em /brand/loading.[json|webm|mp4|gif]) + mensagens de progresso
   - stage 'reveal': cortina preta → diagnóstico em tela cheia estilo
     stories (páginas do PDF renderizadas em imagem via pdf.js/CDN)
   Sem dependências no bundle: pdf.js e lottie entram sob demanda via cdnjs.
   ========================================================================= */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export type OverlayStage = 'hidden' | 'processing' | 'reveal';

/* pdf.js self-hosted (public/vendor/pdfjs/): sem depender de CDN externo,
   funciona até em rede que bloqueia cdnjs. Lazy: só baixa durante a geração. */
const PDFJS_URL = '/vendor/pdfjs/pdf.min.js';
const PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.min.js';
const LOTTIE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js';

/* Asset de loading do cliente: primeiro que existir em public/brand/ E que o
   navegador saiba tocar (canPlayType) vence. webm → Chrome/Android; mp4 → iPhone. */
const LOADER_CANDIDATES: Array<{ url: string; kind: 'lottie' | 'video' | 'gif'; mime?: string }> = [
  { url: '/brand/loading.json', kind: 'lottie' },
  { url: '/brand/loading.webm', kind: 'video', mime: 'video/webm; codecs="vp9"' },
  { url: '/brand/loading.mp4', kind: 'video', mime: 'video/mp4; codecs="avc1.42E01E"' },
  { url: '/brand/loading.gif', kind: 'gif' },
];

const AUTO_ADVANCE_MS = 6500;

declare global {
  interface Window {
    pdfjsLib?: {
      GlobalWorkerOptions: { workerSrc: string };
      getDocument: (src: unknown) => { promise: Promise<PdfDoc> };
    };
    lottie?: {
      loadAnimation: (cfg: Record<string, unknown>) => { destroy: () => void };
    };
  }
}

interface PdfPage {
  getViewport: (o: { scale: number }) => { width: number; height: number };
  render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  cleanup?: () => void;
}
interface PdfDoc {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
  destroy: () => Promise<void>;
}

/* ---------- carregadores de script (cacheados por módulo) ---------- */
const scriptPromises: Record<string, Promise<void> | undefined> = {};
function loadScript(src: string): Promise<void> {
  const cached = scriptPromises[src];
  if (cached) return cached;
  const p = new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      delete scriptPromises[src];
      reject(new Error('script fail: ' + src));
    };
    document.head.appendChild(s);
  });
  scriptPromises[src] = p;
  return p;
}

/** Pré-carrega o pdf.js (chamado quando a geração começa, pra já estar pronto no reveal). */
export function preloadPdfEngine() {
  try {
    loadScript(PDFJS_URL).catch(() => {});
  } catch {}
}

/* ---------- detecção do asset de loading do cliente ---------- */
let loaderAssetPromise: Promise<{ url: string; kind: 'lottie' | 'video' | 'gif' } | null> | null = null;
function detectLoaderAsset() {
  if (loaderAssetPromise) return loaderAssetPromise;
  loaderAssetPromise = (async () => {
    const probe = typeof document !== 'undefined' ? document.createElement('video') : null;
    for (const cand of LOADER_CANDIDATES) {
      /* pula formato de vídeo que este navegador não decodifica */
      if (cand.kind === 'video' && cand.mime && probe && probe.canPlayType(cand.mime) === '') continue;
      try {
        const r = await fetch(cand.url, { method: 'HEAD' });
        if (r.ok) {
          const ct = (r.headers.get('content-type') || '').toLowerCase();
          /* Next devolve HTML (404 soft) com ok? Não: 404 real. Só filtra HTML por segurança. */
          if (ct.indexOf('text/html') === -1) return cand;
        }
      } catch {}
    }
    return null;
  })();
  return loaderAssetPromise;
}

/* ---------- base64 → bytes (em chunks, sem estourar a stack) ---------- */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/* ---------- render do PDF em imagens ---------- */
async function renderPdfToImages(pdfDataUri: string): Promise<string[]> {
  await loadScript(PDFJS_URL);
  const lib = window.pdfjsLib;
  if (!lib) throw new Error('pdfjs indisponível');
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const b64 = pdfDataUri.slice(pdfDataUri.indexOf(',') + 1);
  const doc: PdfDoc = await lib.getDocument({ data: base64ToBytes(b64) }).promise;

  /* Resolução alvo: nítido em retina sem matar celular fraco. */
  const cssW = Math.min(typeof window !== 'undefined' ? window.innerWidth : 420, 520);
  const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2.5);
  const targetW = Math.min(Math.ceil(cssW * dpr), 1300);

  const out: string[] = [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('canvas 2d indisponível');

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const scale = targetW / base.width;
    const vp = page.getViewport({ scale });
    canvas.width = Math.ceil(vp.width);
    canvas.height = Math.ceil(vp.height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    out.push(canvas.toDataURL('image/jpeg', 0.92));
    page.cleanup?.();
  }
  canvas.width = 0;
  canvas.height = 0;
  try {
    await doc.destroy();
  } catch {}
  return out;
}

/* ---------- loader visual (asset do cliente ou fallback da marca) ---------- */
function BrandLoader() {
  const [asset, setAsset] = useState<{ url: string; kind: 'lottie' | 'video' | 'gif' } | null | 'pending'>('pending');
  const lottieBox = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* alguns navegadores ignoram o atributo autoPlay em vídeo criado via JS — força o play;
     se mesmo assim não tocar (autoplay bloqueado), cai pro loader CSS da marca */
  useEffect(() => {
    if (asset !== 'pending' && asset && asset.kind === 'video') {
      const t1 = setTimeout(() => {
        try {
          videoRef.current?.play().catch(() => {});
        } catch {}
      }, 60);
      const t2 = setTimeout(() => {
        const v = videoRef.current;
        if (v && (v.paused || v.currentTime === 0)) setAsset(null);
      }, 1200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [asset]);

  useEffect(() => {
    let alive = true;
    detectLoaderAsset().then((a) => {
      if (alive) setAsset(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  /* Lottie: injeta player só se o cliente tiver loading.json */
  useEffect(() => {
    if (asset === 'pending' || !asset || asset.kind !== 'lottie') return;
    let anim: { destroy: () => void } | null = null;
    let alive = true;
    loadScript(LOTTIE_URL)
      .then(() => {
        if (!alive || !window.lottie || !lottieBox.current) return;
        anim = window.lottie.loadAnimation({
          container: lottieBox.current,
          renderer: 'svg',
          loop: true,
          autoplay: true,
          path: asset.url,
        });
      })
      .catch(() => {
        if (alive) setAsset(null); /* CDN falhou → fallback da marca */
      });
    return () => {
      alive = false;
      try {
        anim?.destroy();
      } catch {}
    };
  }, [asset]);

  if (asset !== 'pending' && asset) {
    if (asset.kind === 'lottie') {
      return <div ref={lottieBox} style={{ width: 180, height: 180 }} aria-hidden />;
    }
    if (asset.kind === 'video') {
      /* máscara radial: funde o fundo do vídeo no fundo escuro do overlay */
      return (
        <video
          ref={videoRef}
          src={asset.url}
          autoPlay
          muted
          loop
          playsInline
          disablePictureInPicture
          style={{
            width: 210,
            height: 210,
            objectFit: 'contain',
            WebkitMaskImage: 'radial-gradient(circle, #000 58%, transparent 76%)',
            maskImage: 'radial-gradient(circle, #000 58%, transparent 76%)',
          }}
          aria-hidden
        />
      );
    }
    /* eslint-disable-next-line @next/next/no-img-element */
    return <img src={asset.url} alt="" style={{ width: 180, height: 180, objectFit: 'contain' }} aria-hidden />;
  }

  /* Fallback da marca: logo pulsando + radar + arco girando (CSS puro) */
  return (
    <div style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }} aria-hidden>
      <div className="lp-radar" style={{ animationDelay: '0s' }} />
      <div className="lp-radar" style={{ animationDelay: '1.1s' }} />
      <div
        className="lp-arc"
        style={{
          position: 'absolute',
          inset: 14,
          borderRadius: '50%',
          background: 'conic-gradient(from 0deg, rgba(212,67,44,0) 0deg, #D4432C 105deg, rgba(212,67,44,0) 130deg)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3.5px))',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 30,
          borderRadius: '50%',
          background: 'rgba(212,67,44,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-reduzida-laranja.svg" alt="" className="lp-pulse" style={{ width: 44, height: 'auto' }} />
      </div>
    </div>
  );
}

/* ========================================================================= */

export interface CinematicOverlayProps {
  stage: OverlayStage;
  procMsg: string;
  pdfSrc: string;
  pdfFilename: string;
  farmaciaDone: string;
  onClose: () => void;
}

type RevealPhase = 'waiting' | 'curtain' | 'story';

export default function CinematicOverlay(props: CinematicOverlayProps) {
  const { stage, procMsg, pdfSrc, pdfFilename, farmaciaDone, onClose } = props;

  const [pages, setPages] = useState<string[]>([]);
  const [renderFail, setRenderFail] = useState(false);
  const [revealPhase, setRevealPhase] = useState<RevealPhase>('waiting');
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [seenOnce, setSeenOnce] = useState(false);

  const renderedFor = useRef('');
  const advTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advStart = useRef(0);
  const advLeft = useRef(AUTO_ADVANCE_MS);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActive = useRef(false);
  const touchX = useRef<number | null>(null);
  const navLock = useRef(0);

  const visible = stage !== 'hidden';

  /* ---------- renderiza o PDF assim que ele chega (mesmo ainda no loading) ---------- */
  useEffect(() => {
    if (!pdfSrc || renderedFor.current === pdfSrc) return;
    renderedFor.current = pdfSrc;
    setPages([]);
    setRenderFail(false);
    let alive = true;
    renderPdfToImages(pdfSrc)
      .then((imgs) => {
        if (!alive) return;
        setPages(imgs);
      })
      .catch(() => {
        if (alive) setRenderFail(true);
      });
    return () => {
      alive = false;
    };
  }, [pdfSrc]);

  /* ---------- coreografia: reveal esperando páginas → cortina → story ---------- */
  useEffect(() => {
    if (stage !== 'reveal') {
      setRevealPhase('waiting');
      return;
    }
    if (renderFail) {
      setRevealPhase('story'); /* story mostra o cartão-fim (fallback) */
      setEnded(true);
      return;
    }
    if (!pages.length) return; /* segue no visual de loading até renderizar */
    if (seenOnce) {
      /* reabriu o viewer: sem cortina longa, entra direto */
      setRevealPhase('story');
      return;
    }
    setRevealPhase('curtain');
    const t1 = setTimeout(() => {
      setRevealPhase('story');
      setSeenOnce(true);
    }, 620);
    return () => clearTimeout(t1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, pages.length, renderFail]);

  /* reset ao reabrir */
  useEffect(() => {
    if (stage === 'reveal' && seenOnce) {
      setIdx(0);
      setEnded(false);
      setPaused(false);
    }
    if (stage === 'hidden') {
      setPaused(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  /* ---------- auto-advance ---------- */
  const clearAdv = useCallback(() => {
    if (advTimer.current) {
      clearTimeout(advTimer.current);
      advTimer.current = null;
    }
  }, []);

  const goTo = useCallback(
    (n: number) => {
      clearAdv();
      if (n >= pages.length) {
        setEnded(true);
        return;
      }
      const clamped = Math.max(0, n);
      setEnded(false);
      setIdx(clamped);
      advLeft.current = AUTO_ADVANCE_MS;
    },
    [pages.length, clearAdv]
  );

  useEffect(() => {
    clearAdv();
    if (revealPhase !== 'story' || ended || paused || !pages.length || stage !== 'reveal') return;
    advStart.current = Date.now();
    advTimer.current = setTimeout(() => {
      goTo(idx + 1);
    }, advLeft.current);
    return clearAdv;
  }, [revealPhase, idx, paused, ended, pages.length, stage, goTo, clearAdv]);

  /* pausa preservando o tempo restante do segmento */
  const pause = useCallback(() => {
    if (paused) return;
    advLeft.current = Math.max(600, advLeft.current - (Date.now() - advStart.current));
    setPaused(true);
  }, [paused]);

  const resume = useCallback(() => setPaused(false), []);

  /* ---------- gestos: tap esquerda/direita, segurar pra pausar, swipe ---------- */
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      touchX.current = e.clientX;
      holdActive.current = false;
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = setTimeout(() => {
        holdActive.current = true;
        pause();
      }, 220);
    },
    [pause]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      const startX = touchX.current;
      touchX.current = null;
      if (holdActive.current) {
        holdActive.current = false;
        resume();
        return;
      }
      if (Date.now() - navLock.current < 250) return;
      navLock.current = Date.now();
      const w = window.innerWidth || 400;
      const dx = startX == null ? 0 : e.clientX - startX;
      if (Math.abs(dx) > 44) {
        if (dx < 0) goTo(idx + 1);
        else goTo(idx - 1);
        return;
      }
      if (e.clientX < w * 0.32) goTo(idx - 1);
      else goTo(idx + 1);
    },
    [goTo, idx, resume]
  );

  const onPointerCancel = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    touchX.current = null;
    if (holdActive.current) {
      holdActive.current = false;
      resume();
    }
  }, [resume]);

  /* teclado (desktop) */
  useEffect(() => {
    if (stage !== 'reveal' || revealPhase !== 'story') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') goTo(idx + 1);
      else if (e.key === 'ArrowLeft') goTo(idx - 1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage, revealPhase, idx, goTo, onClose]);

  if (!visible) return null;

  const showLoadingVisual = stage === 'processing' || (stage === 'reveal' && revealPhase === 'waiting');
  const inStory = stage === 'reveal' && revealPhase !== 'waiting';

  /* ---------- estilos base ---------- */
  const shell: CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    background: '#0E0D0B',
    overflow: 'hidden',
    fontFamily: 'Montserrat, sans-serif',
    touchAction: 'none',
    overscrollBehavior: 'contain',
  };

  return (
    <div style={shell} className="lp-ov-in" role="dialog" aria-modal="true" aria-label="Diagnóstico da sua farmácia">
      {/* glow ambiente */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(90% 62% at 50% 0%, rgba(212,67,44,0.16) 0%, rgba(14,13,11,0) 60%)',
        }}
        className={showLoadingVisual ? 'lp-breathe' : undefined}
      />

      {/* ===================== LOADING ===================== */}
      {showLoadingVisual && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 22,
            padding: '0 28px',
            textAlign: 'center',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-h-dark-bege.svg"
            alt="Recepta Plus"
            style={{ position: 'absolute', top: 'calc(22px + env(safe-area-inset-top))', height: 20, opacity: 0.85 }}
          />
          <BrandLoader />
          <div style={{ fontSize: 20, fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px' }}>
            Gerando seu diagnóstico…
          </div>
          <div
            key={procMsg}
            className="lp-msg-in"
            style={{ fontSize: 15.5, color: '#CFC8BD', minHeight: 24, maxWidth: 340, lineHeight: 1.45 }}
          >
            {procMsg}
          </div>
          <div style={{ width: '100%', maxWidth: 300, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #D4432C, #F0673F)',
                borderRadius: 999,
                animation: 'lpBar 140s cubic-bezier(0.2,0.8,0.2,1) forwards',
              }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: '#8A8172' }}>Pode levar 1–2 minutos. Não feche esta tela.</div>
        </div>
      )}

      {/* ===================== STORY / CINEMA ===================== */}
      {inStory && !ended && pages.length > 0 && (
        <div
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          {/* barras de progresso */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(10px + env(safe-area-inset-top))',
              left: 10,
              right: 10,
              zIndex: 6,
              display: 'flex',
              gap: 5,
            }}
          >
            {pages.map((_, i) => (
              <div key={i} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.28)', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  key={i === idx ? 'seg-' + idx + '-' + (paused ? 'p' : 'r') : 'seg-' + i}
                  style={{
                    height: '100%',
                    background: '#FFFFFF',
                    borderRadius: 999,
                    width: i < idx ? '100%' : i > idx ? '0%' : undefined,
                    animation: i === idx ? `lpSeg ${AUTO_ADVANCE_MS}ms linear forwards` : undefined,
                    animationPlayState: i === idx && paused ? 'paused' : undefined,
                  }}
                />
              </div>
            ))}
          </div>

          {/* topo: logo + fechar */}
          <div
            style={{
              position: 'absolute',
              top: 'calc(24px + env(safe-area-inset-top))',
              left: 14,
              right: 8,
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pointerEvents: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-h-dark-bege.svg" alt="Recepta Plus" style={{ height: 16, opacity: 0.9 }} />
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.14)',
                color: '#FFFFFF',
                fontSize: 20,
                lineHeight: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>

          {/* páginas empilhadas com crossfade + zoom */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {pages.map((src, i) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={i}
                src={src}
                alt={'Página ' + (i + 1) + ' do diagnóstico'}
                draggable={false}
                className={i === idx ? 'lp-page lp-page-on' : 'lp-page'}
                style={{
                  position: 'absolute',
                  maxWidth: 'min(100%, 520px)',
                  maxHeight: 'calc(100dvh - 118px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  borderRadius: 10,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.55)',
                  userSelect: 'none',
                }}
              />
            ))}
          </div>

          {/* vinheta cinematográfica */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,0) 82%, rgba(0,0,0,0.6) 100%)',
            }}
          />

          {/* rodapé: whats + baixar */}
          <div
            style={{
              position: 'absolute',
              left: 12,
              right: 12,
              bottom: 'calc(14px + env(safe-area-inset-bottom))',
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(20,18,16,0.72)',
                border: '1px solid rgba(255,255,255,0.14)',
                color: '#DFF5E6',
                borderRadius: 999,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#3FC06A" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
              Cópia no seu WhatsApp
            </div>
            <a
              href={pdfSrc}
              download={pdfFilename}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FFFFFF',
                borderRadius: 999,
                padding: '9px 14px',
                fontSize: 12.5,
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
              }}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              </svg>
              Baixar PDF
            </a>
          </div>

          {/* dica de navegação (só na 1ª página) */}
          {idx === 0 && (
            <div
              className="lp-hint"
              style={{
                position: 'absolute',
                bottom: 'calc(64px + env(safe-area-inset-bottom))',
                left: 0,
                right: 0,
                zIndex: 5,
                textAlign: 'center',
                fontSize: 12,
                color: 'rgba(255,255,255,0.75)',
                pointerEvents: 'none',
              }}
            >
              Toque pra avançar · segure pra pausar
            </div>
          )}
        </div>
      )}

      {/* ===================== CARTÃO FINAL ===================== */}
      {inStory && (ended || (renderFail && stage === 'reveal')) && (
        <div
          className="lp-msg-in"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 18,
            padding: '0 30px',
            textAlign: 'center',
            paddingTop: 'env(safe-area-inset-top)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: 'rgba(63,192,106,0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#3FC06A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.4px', lineHeight: 1.2 }}>
            Pronto{farmaciaDone ? ', ' + farmaciaDone : ''}!
          </div>
          <div style={{ fontSize: 15.5, color: '#CFC8BD', lineHeight: 1.55, maxWidth: 340 }}>
            Seu diagnóstico completo também chegou no seu <strong style={{ color: '#FFFFFF' }}>WhatsApp</strong>, pra você
            mostrar pro sócio ou gerente.
          </div>
          <a
            href={pdfSrc}
            download={pdfFilename}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              width: '100%',
              maxWidth: 320,
              height: 54,
              background: '#D4432C',
              color: '#FFFFFF',
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Baixar PDF
          </a>
          {!renderFail && pages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setEnded(false);
                setIdx(0);
                advLeft.current = AUTO_ADVANCE_MS;
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.28)',
                color: '#FFFFFF',
                borderRadius: 12,
                width: '100%',
                maxWidth: 320,
                height: 50,
                fontFamily: 'Montserrat, sans-serif',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
              }}
            >
              Rever diagnóstico
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9A9184',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontSize: 13.5,
              cursor: 'pointer',
              padding: 8,
            }}
          >
            Voltar pra página
          </button>
        </div>
      )}

      {/* cortina do corte cinematográfico */}
      {stage === 'reveal' && revealPhase === 'curtain' && (
        <div style={{ position: 'absolute', inset: 0, background: '#000000', zIndex: 10 }} className="lp-curtain" />
      )}
    </div>
  );
}
