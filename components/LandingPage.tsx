'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import FormCard, { FormFields, Phase } from './FormCard';
import HeroBeams from './HeroBeams';

const ENDPOINT = 'https://main-production-fe25.up.railway.app/webhook/lp-diagnostico';
const MSGS = [
  'Puxando seu Google Meu Negócio…',
  'Olhando seu Instagram…',
  'Mapeando concorrentes no seu raio…',
  'Montando seu diagnóstico…',
];
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_adset', 'utm_ad_id', 'fbclid', 'gclid'];

const PRIVACY_URL = process.env.NEXT_PUBLIC_PRIVACY_URL || '/politica-de-privacidade';
const FARMACIAS_ATENDIDAS = process.env.NEXT_PUBLIC_FARMACIAS || '+100';

const LOGO_COUNT = 7;

declare global {
  interface Window {
    __lpRevealCheck?: () => void;
    receptaTrack?: (name: string, params?: Record<string, unknown>) => void;
  }
}

const digits = (v: string) => (v || '').replace(/\D/g, '');

const maskWhats = (v: string) => {
  const d = digits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
};

/* Sistema global de reveal on scroll (à prova de remount): função única em window,
   re-consulta [data-reveal] a cada checagem, com backstop de 450ms. */
function setupReveals() {
  if (window.__lpRevealCheck) {
    window.__lpRevealCheck();
    return;
  }
  type RevealEl = HTMLElement & { __lpShown?: boolean; __lpPrepped?: boolean };
  const check = function () {
    const vh = window.innerHeight || 800;
    const els = document.querySelectorAll<RevealEl>('[data-reveal]');
    const batch: RevealEl[] = [];
    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (el.__lpShown) continue;
      if (!el.__lpPrepped) {
        el.__lpPrepped = true;
        el.style.opacity = '0';
        el.style.transform = 'translateY(26px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        continue;
      }
      const b = el.getBoundingClientRect();
      if (b.top < vh * 0.88 && b.bottom > 0) {
        el.__lpShown = true;
        batch.push(el);
      }
    }
    for (let j = 0; j < batch.length; j++) {
      (function (el: RevealEl, d: number) {
        el.style.transitionDelay = d + 'ms';
        el.style.opacity = '1';
        el.style.transform = 'none';
        setTimeout(function () {
          el.style.transitionDelay = '0ms';
        }, d + 700);
      })(batch[j], Math.min(j, 7) * 90);
    }
  };
  window.__lpRevealCheck = check;
  check();
  requestAnimationFrame(function () {
    check();
  });
  window.addEventListener('scroll', function () { check(); }, { passive: true });
  window.addEventListener('resize', function () { check(); });
  setInterval(function () { check(); }, 450);
}

const CheckCircle = () => (
  <svg viewBox="0 0 24 24" width="23" height="23" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="11" fill="#D4432C" />
    <path d="M7 12.5l3.2 3.2L17 8.6" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircleSm = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" style={{ flexShrink: 0, marginTop: 1 }}>
    <circle cx="12" cy="12" r="11" fill="#D4432C" />
    <path d="M7 12.5l3.2 3.2L17 8.6" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ctaBtnStyle: CSSProperties = {
  height: 54,
  padding: '0 28px',
  background: '#D4432C',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 12,
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
};

const HERO_CHIPS = [
  'Ao vivo na sua tela, em ~1 minuto',
  'Dados reais: Google, Instagram e concorrentes',
  '100% grátis, sem cartão',
];

const STEPS = [
  { n: '1', title: 'Você preenche', desc: 'Os dados básicos da farmácia, leva 1 minuto.' },
  { n: '2', title: 'A engine cruza os dados', desc: 'Google, Instagram e concorrentes no seu raio, tudo junto.' },
  { n: '3', title: 'Você vê na hora', desc: 'O diagnóstico aparece na tela e chega uma cópia no seu WhatsApp.' },
];

const OBJECTIONS = [
  { q: '"É grátis mesmo?"', a: 'É. Sem cartão, sem pegadinha. O diagnóstico é o nosso cartão de visita.' },
  { q: '"Vão ficar me empurrando venda?"', a: 'Não tem vendedor te perseguindo. Você vê o diagnóstico e decide. Se quiser falar com a gente, a porta está aberta, no seu tempo.' },
  { q: '"Meus dados estão seguros?"', a: 'Usamos só dados públicos da sua farmácia + o contato que você informar, tratados conforme a LGPD. Nada é compartilhado.' },
  { q: '"Serve pra MINHA farmácia?"', a: 'Independente, associativista, de bairro ou de esquina: se você atende cliente, o diagnóstico funciona.' },
];

const FAQ_ITEMS = [
  { q: 'Quanto tempo leva?', a: 'Menos de 1 minuto pra preencher; o diagnóstico aparece na sequência.' },
  { q: 'Preciso pagar ou colocar cartão?', a: 'Não. É 100% gratuito.' },
  { q: 'Serve pra farmácia pequena/independente?', a: 'Sim, é justamente o foco da Recepta.' },
  { q: 'De onde vêm os dados?', a: 'De fontes públicas (Google, Instagram) + o que você informar.' },
  { q: 'Como recebo no WhatsApp?', a: 'Assim que o diagnóstico é gerado, a Lara te envia o PDF no número que você informar.' },
  { q: 'E depois?', a: 'Um especialista pode comentar os resultados com você e mostrar caminhos de crescimento, só se você quiser.' },
];

export default function LandingPage() {
  const [fields, setFields] = useState<FormFields>({
    nome: '', telefone: '', farmacia: '', cidade: '', estado: '',
    instagram: '', endereco: '', email: '',
  });
  const [consent, setConsent] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [phase, setPhase] = useState<Phase>('form');
  const [procIdx, setProcIdx] = useState(0);
  const [showError, setShowError] = useState(false);
  const [pdfSrc, setPdfSrc] = useState('');
  const [pdfFilename, setPdfFilename] = useState('diagnostico-recepta.pdf');
  const [farmaciaDone, setFarmaciaDone] = useState('');
  const [openFaq, setOpenFaq] = useState(0);
  const [pastScroll, setPastScroll] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [statFarm, setStatFarm] = useState(0);
  const [statMi, setStatMi] = useState(0);
  const [mockP, setMockP] = useState(0);
  const [logoStatus, setLogoStatus] = useState<Array<'pending' | 'ok' | 'fail'>>(
    () => Array(LOGO_COUNT).fill('pending')
  );

  const heroFormRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const stats2Ref = useRef<HTMLDivElement>(null);
  const mockRef = useRef<HTMLDivElement>(null);
  const procTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const statsRunRef = useRef(false);
  const mockRunRef = useRef(false);
  const utmsRef = useRef<Record<string, string>>({});

  /* ---- count-up (fallback: valor final por padrão, nunca "+0") ---- */
  const animateStats = useCallback(() => {
    if (statsRunRef.current) return;
    statsRunRef.current = true;
    const farmTarget = parseInt(FARMACIAS_ATENDIDAS.replace(/[^0-9]/g, ''), 10) || 100;
    const miTarget = 3;
    const dur = 1300;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now: number) => {
      const p = Math.min(((now || Date.now()) - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setStatFarm(farmTarget * e);
      setStatMi(miTarget * e);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const animateMock = useCallback(() => {
    if (mockRunRef.current) return;
    mockRunRef.current = true;
    const dur = 1500;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const tick = (now: number) => {
      const p = Math.min(((now || Date.now()) - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setMockP(Math.max(e, 0.001));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  const maybeStats = useCallback(() => {
    if (statsRunRef.current && mockRunRef.current) return;
    const vh = window.innerHeight || 800;
    const check = (r: HTMLElement | null) => {
      if (!r) return false;
      const b = r.getBoundingClientRect();
      return b.top < vh * 0.85 && b.bottom > 0;
    };
    if (!statsRunRef.current && (check(statsRef.current) || check(stats2Ref.current))) animateStats();
    if (!mockRunRef.current && check(mockRef.current)) animateMock();
  }, [animateStats, animateMock]);

  /* ---- mount: UTMs, scroll/resize, reveals ---- */
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      UTM_KEYS.forEach((k) => {
        const v = q.get(k);
        if (v) utmsRef.current[k] = v;
      });
    } catch {}

    const onScroll = () => {
      setPastScroll(window.scrollY > 300);
      maybeStats();
      window.__lpRevealCheck?.();
    };
    const onResize = () => {
      setIsMobile(window.innerWidth < 768);
      window.__lpRevealCheck?.();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onResize();
    const t1 = setTimeout(() => {
      maybeStats();
      setupReveals();
    }, 60);
    const t2 = setTimeout(() => window.__lpRevealCheck?.(), 500);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      clearTimeout(t1);
      clearTimeout(t2);
      if (procTimer.current) clearInterval(procTimer.current);
    };
  }, [maybeStats]);

  /* ---- handlers do form ---- */
  const setField = useCallback((key: keyof FormFields, value: string) => {
    setFields((f) => ({ ...f, [key]: key === 'telefone' ? maskWhats(value) : value }));
    if (key !== 'instagram' && key !== 'endereco' && key !== 'email') setShowError(false);
  }, []);

  const toggleConsent = useCallback(() => {
    setConsent((c) => !c);
    setShowError(false);
  }, []);

  const scrollToForm = useCallback(() => {
    const el = heroFormRef.current;
    if (el) {
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 82, behavior: 'smooth' });
    }
  }, []);

  const nextStep = useCallback(() => {
    const d = digits(fields.telefone).length;
    if (fields.nome.trim().length > 1 && d >= 10 && d <= 11 && fields.farmacia.trim().length > 1) {
      setFormStep(2);
      setShowError(false);
    } else {
      setShowError(true);
    }
  }, [fields]);

  const backStep = useCallback(() => {
    setFormStep(1);
    setShowError(false);
  }, []);

  const validate = useCallback(() => {
    if (!fields.nome.trim()) return false;
    const dl = digits(fields.telefone).length;
    if (dl < 10 || dl > 11) return false;
    if (!fields.farmacia.trim()) return false;
    if (!fields.cidade.trim()) return false;
    if (fields.estado.length !== 2) return false;
    if (!consent) return false;
    return true;
  }, [fields, consent]);

  const startProcessing = useCallback(() => {
    setPhase('processing');
    setProcIdx(0);
    if (procTimer.current) clearInterval(procTimer.current);
    procTimer.current = setInterval(() => {
      setProcIdx((i) => Math.min(i + 1, MSGS.length - 1));
    }, 3400);
  }, []);

  const submit = useCallback(() => {
    if (!validate()) {
      setShowError(true);
      return;
    }
    setShowError(false);
    startProcessing();

    /* Evento principal da campanha: Registro concluído (CompleteRegistration).
       Dispara em TODO envio válido do form, no momento do envio — assim o
       evento não se perde se o lead fechar a aba durante a geração (1-2 min). */
    try {
      window.receptaTrack?.('CompleteRegistration', { content_name: 'diagnostico' });
    } catch {}

    const payload: Record<string, string> = {
      nome: fields.nome.trim(),
      telefone: digits(fields.telefone),
      nome_farmacia: fields.farmacia.trim(),
      cidade: fields.cidade.trim(),
      estado: fields.estado,
      instagram: fields.instagram.trim(),
      endereco: fields.endereco.trim(),
      email: fields.email.trim(),
      ...utmsRef.current,
    };

    const track = () => {
      try {
        window.receptaTrack?.('Lead', { content_name: 'diagnostico' });
      } catch {}
    };

    /* Sem timeout curto no cliente: a geração real leva 1-2 min. */
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((r) => r.json())
      .then((data) => {
        if (procTimer.current) clearInterval(procTimer.current);
        track();
        if (data && data.ok && data.pdf_base64) {
          setPdfSrc('data:application/pdf;base64,' + data.pdf_base64);
          setPdfFilename(data.pdf_filename || 'diagnostico-recepta.pdf');
          setFarmaciaDone(data.nome_farmacia || fields.farmacia.trim());
          setPhase('result_pdf');
          try {
            window.receptaTrack?.('diagnostico_exibido', { lead_id: data.lead_id });
          } catch {}
        } else {
          setPhase('result_whatsapp');
        }
      })
      .catch(() => {
        if (procTimer.current) clearInterval(procTimer.current);
        track();
        setPhase('result_whatsapp');
      });
  }, [fields, validate, startProcessing]);

  /* ---- valores derivados ---- */
  const digitsLen = digits(fields.telefone).length;
  const statFarmStr = statFarm > 0 ? '+' + Math.round(statFarm) : FARMACIAS_ATENDIDAS;
  const statMiStr = statMi > 0 ? '' + Math.round(statMi) : '3';
  const errorMsg =
    formStep === 1
      ? 'Preencha nome, WhatsApp (com DDD) e nome da farmácia.'
      : 'Preencha cidade e UF, e aceite os termos.';
  const showStickyBar = isMobile && pastScroll && phase === 'form';

  const mp = mockP > 0 ? mockP : 1;
  const mockRingStyle: CSSProperties = {
    flexShrink: 0,
    width: 74,
    height: 74,
    borderRadius: '50%',
    background: 'conic-gradient(#D4432C 0turn ' + 0.72 * mp + 'turn, #EFE7D8 ' + 0.72 * mp + 'turn 1turn)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const mkBar = (w: number): CSSProperties => ({ width: w * mp + '%', height: '100%', background: '#D4432C' });

  const formProps = {
    fields, consent, digitsLen, setField, toggleConsent,
    formStep, nextStep, backStep, phase,
    procMsg: MSGS[procIdx], showError, errorMsg, submit,
    pdfSrc, pdfFilename, farmaciaDone, privacyUrl: PRIVACY_URL,
  };

  const anyLogoAlive = logoStatus.some((s) => s === 'ok');

  // Proba os logos via new Image() (onError de <img> SSR dispara antes da hidratação e se perde)
  useEffect(() => {
    let alive = true;
    Array.from({ length: LOGO_COUNT }, (_, i) => {
      const im = new window.Image();
      im.onload = () => { if (alive) onLogoOk(i); };
      im.onerror = () => { if (alive) onLogoFail(i); };
      im.src = '/farmacias/f' + (i + 1) + '.png';
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onLogoFail = (i: number) =>
    setLogoStatus((st) => {
      if (st[i] === 'fail') return st;
      const n = [...st];
      n[i] = 'fail';
      return n;
    });
  const onLogoOk = (i: number) =>
    setLogoStatus((st) => {
      if (st[i] === 'ok') return st;
      const n = [...st];
      n[i] = 'ok';
      return n;
    });

  const renderLogoTrack = (ariaHidden: boolean) =>
    Array.from({ length: LOGO_COUNT }, (_, i) => (
      <div
        key={(ariaHidden ? 'b' : 'a') + i}
        aria-hidden={ariaHidden || undefined}
        style={{
          flex: '0 0 clamp(150px, 42vw, 188px)',
          height: 96,
          marginRight: 16,
          borderRadius: 14,
          overflow: 'hidden',
          display: logoStatus[i] === 'ok' ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          border: '1px solid #EEE6D8',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={'/farmacias/f' + (i + 1) + '.png'}
          alt={'Farmácia atendida ' + (i + 1)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={() => onLogoFail(i)}
          onLoad={() => onLogoOk(i)}
        />
      </div>
    ));

  return (
    <div style={{ fontFamily: 'Montserrat, sans-serif', color: '#1A1A1A', overflowX: 'clip' }}>
      {/* ============ 1. HEADER FIXO ============ */}
      <div
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          background: 'rgba(251,247,240,0.9)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(26,26,26,0.06)',
        }}
      >
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-h-laranja.svg" alt="Recepta Plus" style={{ height: 24, display: 'block' }} />
          <button
            type="button"
            className="lp-btn"
            onClick={scrollToForm}
            style={{
              background: '#D4432C', color: '#FFFFFF', border: 'none', borderRadius: 999,
              padding: '11px 20px', fontFamily: 'Montserrat, sans-serif', fontWeight: 700,
              fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Fazer meu diagnóstico grátis
          </button>
        </div>
      </div>

      {/* ============ STICKY BAR MOBILE ============ */}
      {showStickyBar && (
        <div
          onClick={scrollToForm}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60, height: 62,
            background: '#D4432C', color: '#FFFFFF', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 15.5, cursor: 'pointer',
            boxShadow: '0 -6px 20px rgba(26,26,26,0.22)',
          }}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
          Fazer meu diagnóstico grátis
        </div>
      )}

      {/* ============ 2. HERO ============ */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#141210', paddingTop: 64 }}>
        <HeroBeams />
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'radial-gradient(120% 90% at 50% 0%, rgba(20,18,16,0) 42%, rgba(20,18,16,0.55) 100%)',
          }}
        />
        <div
          style={{
            position: 'relative', zIndex: 1, maxWidth: 1160, margin: '0 auto',
            padding: 'clamp(32px, 4.5vw, 60px) 20px clamp(44px, 6vw, 76px) 20px',
            display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px, 4vw, 52px)', alignItems: 'flex-start',
          }}
        >
          {/* coluna esquerda */}
          <div style={{ flex: '1 1 460px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 9,
                background: '#D4432C', color: '#FFFFFF', borderRadius: 999, padding: '11px 22px',
                fontSize: 16, fontWeight: 800, letterSpacing: '0.06em',
              }}
            >
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#FFFFFF" strokeWidth="2.4">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
              </svg>
              Diagnóstico digital <span style={{ fontWeight: 900, textTransform: 'uppercase' }}>grátis</span>
            </div>

            {/* Headline A (recomendada). A/B test:
                B: O Raio-X da sua farmácia, em 1 minuto e de graça.
                C: O que o Google diz da sua farmácia? */}
            <h1
              style={{
                margin: 0, fontWeight: 900, fontSize: 'clamp(31px, 4.6vw, 52px)',
                lineHeight: 1.08, letterSpacing: '-1.1px', color: '#FFFFFF',
              }}
            >
              Seu concorrente aparece no Google. <span style={{ color: '#F0673F' }}>E a sua farmácia?</span>
            </h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 2 }}>
              {HERO_CHIPS.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: 'flex', gap: 12, alignItems: 'center',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12, padding: '13px 16px',
                  }}
                >
                  <CheckCircle />
                  <span style={{ fontSize: 16.5, fontWeight: 700, color: '#FFFFFF' }}>{chip}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, padding: '14px 18px',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/logo-reduzida-laranja.svg" alt="Recepta" style={{ height: 30, width: 'auto', flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, lineHeight: 1.5, color: '#CFC8BD' }}>
                É o mesmo levantamento que a Recepta usa nas reuniões com clientes, agora na sua mão.
              </span>
            </div>
          </div>

          {/* coluna direita: CARD DO FORMULÁRIO */}
          <div ref={heroFormRef} style={{ flex: '1 1 400px', minWidth: 300, maxWidth: 520, width: '100%' }}>
            <FormCard variant="hero" {...formProps} />
          </div>
        </div>
      </div>

      {/* ============ 3. FARMÁCIAS QUE JÁ ATENDEMOS (marquee) ============ */}
      {anyLogoAlive && (
        <div style={{ background: '#FBF7F0', padding: 'clamp(38px, 5vw, 60px) 20px' }} data-reveal="1">
          <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '0.14em', color: '#9A8F80' }}>
              FARMÁCIAS QUE JÁ ATENDEMOS
            </div>
            <div style={{ position: 'relative', overflow: 'hidden' }}>
              <div
                className="lp-marquee"
                style={{
                  display: 'flex', width: 'max-content',
                  animation: 'logoMarquee 28s linear infinite',
                  padding: '4px 2px 12px 2px',
                }}
              >
                {renderLogoTrack(false)}
                {renderLogoTrack(true)}
              </div>
              <div style={{ position: 'absolute', top: 0, bottom: 12, left: 0, width: 44, background: 'linear-gradient(90deg, #FBF7F0, rgba(251,247,240,0))', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: 0, bottom: 12, right: 0, width: 44, background: 'linear-gradient(270deg, #FBF7F0, rgba(251,247,240,0))', pointerEvents: 'none' }} />
            </div>
          </div>
        </div>
      )}

      {/* ============ 4. PROVA SOCIAL (faixa slim, count-up) ============ */}
      <div style={{ background: '#1A1A1A', padding: '15px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          ref={statsRef}
          style={{
            maxWidth: 1080, margin: '0 auto', display: 'flex', flexWrap: 'wrap',
            alignItems: 'center', justifyContent: 'center', gap: '8px 24px', textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 13.5, color: '#E8E2D6' }}>
            <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>{statFarmStr} farmácias</strong> independentes atendidas
          </span>
          <span style={{ color: '#4A4A4A' }}>•</span>
          <span style={{ fontSize: 13.5, color: '#E8E2D6' }}>
            <strong style={{ color: '#FFFFFF', fontWeight: 800 }}>+R$ {statMiStr} milhões</strong> geridos em anúncios
          </span>
          <span style={{ color: '#4A4A4A' }}>•</span>
          <span style={{ fontSize: 13.5, color: '#E8E2D6' }}>o mesmo diagnóstico das reuniões da Recepta</span>
        </div>
      </div>

      {/* ============ 5. COMO FUNCIONA ============ */}
      <div style={{ background: '#FFFFFF', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 4vw, 44px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#D4432C' }}>COMO FUNCIONA</div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(27px, 3.6vw, 40px)', lineHeight: 1.14, letterSpacing: '-0.7px', maxWidth: 640 }}>
              Três passos. Um minuto. Sem enrolação.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 20 }}>
            {STEPS.map((s) => (
              <div
                key={s.n}
                style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 16, padding: 28, display: 'flex', flexDirection: 'column', gap: 14 }}
                data-reveal="1"
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#D4432C', color: '#FFFFFF', fontWeight: 800, fontSize: 19, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.n}
                </div>
                <div style={{ fontWeight: 700, fontSize: 18.5 }}>{s.title}</div>
                <div style={{ fontSize: 15.5, lineHeight: 1.6, color: '#5C564D' }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 6. DOR ============ */}
      <div style={{ background: '#F5EFE6', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(26px, 3.6vw, 40px)', lineHeight: 1.18, letterSpacing: '-0.7px', textAlign: 'center' }}>
            Todo dia gente do seu bairro pesquisa <span style={{ color: '#D4432C' }}>&#39;farmácia perto de mim&#39;</span>. A sua aparece, ou some no meio dos concorrentes?
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', background: '#FFFFFF', border: '1px solid #ECE3D4', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0, marginTop: 1, color: '#D4432C' }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <span style={{ fontSize: 16, lineHeight: 1.55 }}>Você já buscou sua farmácia no Google e achou pouca coisa, ou nada?</span>
            </div>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', background: '#FFFFFF', border: '1px solid #ECE3D4', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0, marginTop: 1, color: '#D4432C' }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 6l-9.5 9.5-5-5L1 18" />
                <path d="M17 6h6v6" />
              </svg>
              <span style={{ fontSize: 16, lineHeight: 1.55 }}>Aquela sensação de que o concorrente novo &quot;aparece mais&quot;, vendendo igual?</span>
            </div>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', background: '#FFFFFF', border: '1px solid #ECE3D4', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0, marginTop: 1, color: '#D4432C' }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" />
              </svg>
              <span style={{ fontSize: 16, lineHeight: 1.55 }}>Posta no Instagram às vezes, mas não sabe se aquilo vira cliente?</span>
            </div>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', background: '#FFFFFF', border: '1px solid #ECE3D4', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
              <svg viewBox="0 0 24 24" width="20" height="20" style={{ flexShrink: 0, marginTop: 1, color: '#D4432C' }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span style={{ fontSize: 16, lineHeight: 1.55 }}>Investe sem saber se está na frente ou atrás dos vizinhos?</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ 7. O QUE O DIAGNÓSTICO MOSTRA ============ */}
      <div style={{ background: '#FFFFFF', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 4vw, 40px)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.14em', color: '#D4432C' }}>O QUE VOCÊ VAI VER</div>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(27px, 3.6vw, 40px)', lineHeight: 1.14, letterSpacing: '-0.7px', maxWidth: 660 }}>
              O que o diagnóstico mostra sobre a sua farmácia
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: 18 }}>
            <div style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }} data-reveal="1">
              <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FAEDE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D4432C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Reputação no Google</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5C564D' }}>Sua nota e avaliações do jeito que o cliente vê, antes de decidir.</div>
            </div>
            <div style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }} data-reveal="1">
              <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FAEDE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D4432C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Concorrentes no seu raio</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5C564D' }}>Quantos disputam o mesmo cliente pertinho de você.</div>
            </div>
            <div style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }} data-reveal="1">
              <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FAEDE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D4432C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Presença nas buscas</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5C564D' }}>Se a sua farmácia aparece (ou some) quando buscam no bairro.</div>
            </div>
            <div style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 12 }} data-reveal="1">
              <div style={{ width: 46, height: 46, borderRadius: 12, background: '#FAEDE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#D4432C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a6 6 0 1 0-6-6" />
                  <path d="M12 15v6" />
                  <path d="M6 9l-3 1.5" />
                  <path d="M12 3v2.5" />
                  <path d="M12 9l4-2.5" />
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Nota de presença digital</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: '#5C564D' }}>Um score claro de 0 a 10, com oportunidades concretas de crescer.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, textAlign: 'center', marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 'clamp(16px, 1.8vw, 18px)', lineHeight: 1.6, maxWidth: 640, fontWeight: 600 }}>
              É o mesmo levantamento que a Recepta usa nas reuniões com clientes. Só que agora na sua mão, na hora.
            </p>
            <button type="button" className="lp-btn" onClick={scrollToForm} style={ctaBtnStyle}>
              Fazer meu diagnóstico grátis
            </button>
          </div>
        </div>
      </div>

      {/* ============ 8. PROVA SOCIAL / STATS (faixa bege) ============ */}
      <div style={{ background: '#F5EFE6', padding: 'clamp(48px, 7vw, 76px) 20px' }} data-reveal="1">
        <div
          ref={stats2Ref}
          style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, alignItems: 'center' }}
        >
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 'clamp(26px, 3vw, 34px)', color: '#D4432C', lineHeight: 1.05 }}>{statFarmStr} farmácias</div>
            <div style={{ fontSize: 14, color: '#5C564D' }}>independentes atendidas</div>
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6, borderLeft: '1px solid #E3D9C9', borderRight: '1px solid #E3D9C9' }}>
            <div style={{ fontWeight: 800, fontSize: 'clamp(26px, 3vw, 34px)', color: '#D4432C', lineHeight: 1.05 }}>+R$ {statMiStr} milhões</div>
            <div style={{ fontSize: 14, color: '#5C564D' }}>geridos em anúncios para farmácias</div>
          </div>
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontWeight: 800, fontSize: 'clamp(17px, 1.9vw, 20px)', color: '#1A1A1A', lineHeight: 1.3 }}>O mesmo diagnóstico</div>
            <div style={{ fontSize: 14, color: '#5C564D' }}>usado nas reuniões da Recepta</div>
          </div>
        </div>
      </div>

      {/* Depoimentos ocultos por padrão (showTestimonials=false; ativar só com depoimento real) */}

      {/* ============ 9. OFERTA GRÁTIS ============ */}
      <div style={{ background: '#FFFFFF', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px, 4vw, 56px)', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 420px', minWidth: 300, display: 'flex', flexDirection: 'column', gap: 26, alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(27px, 3.6vw, 40px)', lineHeight: 1.14, letterSpacing: '-0.7px' }}>
              O que você recebe agora, de graça:
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', maxWidth: 560, textAlign: 'left' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
                <CheckCircleSm />
                <span style={{ fontSize: 16, lineHeight: 1.55 }}>Diagnóstico completo da sua farmácia, ao vivo na tela</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
                <CheckCircleSm />
                <span style={{ fontSize: 16, lineHeight: 1.55 }}>Uma cópia no seu WhatsApp pra mostrar pro sócio ou gerente</span>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 12, padding: '18px 20px' }} data-reveal="1">
                <CheckCircleSm />
                <span style={{ fontSize: 16, lineHeight: 1.55 }}>Um especialista da Recepta disponível pra comentar os resultados com você, se quiser</span>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 'clamp(17px, 2vw, 20px)', lineHeight: 1.5, fontWeight: 700, maxWidth: 580 }}>
              Um levantamento desses, feito por consultoria, sai por centenas de reais. Aqui: <span style={{ color: '#D4432C' }}>R$ 0</span>, e em 1 minuto.
            </p>
            <button type="button" className="lp-btn" onClick={scrollToForm} style={{ ...ctaBtnStyle, height: 56, padding: '0 30px', fontSize: 15.5 }}>
              Fazer meu diagnóstico grátis
            </button>
          </div>

          {/* mockup ilustrativo do PDF (anima na viewport; valores finais como fallback) */}
          <div style={{ flex: '0 1 380px', minWidth: 280, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              ref={mockRef}
              style={{
                width: '100%', maxWidth: 360, background: '#FFFFFF', border: '1px solid #EAE1D1',
                borderRadius: 16, boxShadow: '0 22px 55px rgba(26,26,26,0.16)', overflow: 'hidden',
                transform: 'rotate(-1.3deg)',
              }}
            >
              <div style={{ background: '#1A1A1A', padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/logo-h-dark-bege.svg" alt="Recepta" style={{ height: 15 }} />
                <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: '#8A8A8A' }}>DIAGNÓSTICO DIGITAL</span>
              </div>
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 15, textAlign: 'left' }}>
                <div style={{ fontSize: 12.5, color: '#6B6B6B' }}>Farmácia São João · Campinas/SP</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                  <div style={mockRingStyle}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 900, fontSize: 21, lineHeight: 1, color: '#1A1A1A' }}>{(7.2 * mp).toFixed(1)}</span>
                      <span style={{ fontSize: 9, color: '#9A9184' }}>de 10</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#1A1A1A' }}>Presença digital</span>
                    <span style={{ fontSize: 11.5, color: '#6B6B6B', lineHeight: 1.4 }}>Boa base, com espaço claro pra crescer</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#3A362F' }}>Google Meu Negócio</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>4.3 ★</span>
                    </div>
                    <div style={{ height: 5, background: '#EFE7D8', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={mkBar(86)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#3A362F' }}>Concorrentes no raio de 2 km</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>6</span>
                    </div>
                    <div style={{ height: 5, background: '#EFE7D8', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={mkBar(60)} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#3A362F' }}>Instagram</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A1A' }}>alcance baixo</span>
                    </div>
                    <div style={{ height: 5, background: '#EFE7D8', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={mkBar(38)} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(212,67,44,0.08)', borderRadius: 8, padding: '9px 12px' }}>
                  <svg viewBox="0 0 24 24" width="14" height="14" style={{ flexShrink: 0, color: '#D4432C' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
                  </svg>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#B23A26' }}>3 oportunidades encontradas</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 11, color: '#9A9184', marginTop: 11 }}>Prévia ilustrativa do seu diagnóstico</div>
          </div>
        </div>
      </div>

      {/* ============ 10. QUEBRA DE OBJEÇÕES ============ */}
      <div style={{ background: '#F5EFE6', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(28px, 4vw, 40px)' }}>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(26px, 3.4vw, 38px)', lineHeight: 1.15, letterSpacing: '-0.6px', textAlign: 'center' }}>
            Antes que você pergunte
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 18 }}>
            {OBJECTIONS.map((o) => (
              <div key={o.q} style={{ background: '#FFFFFF', border: '1px solid #ECE3D4', borderRadius: 16, padding: 26, display: 'flex', flexDirection: 'column', gap: 9 }} data-reveal="1">
                <div style={{ fontWeight: 800, fontSize: 17 }}>{o.q}</div>
                <div style={{ fontSize: 15.5, lineHeight: 1.6, color: '#5C564D' }}>{o.a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 11. FAQ (accordion, 1º aberto) ============ */}
      <div style={{ background: '#FFFFFF', padding: 'clamp(56px, 8vw, 92px) 20px' }} data-reveal="1">
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'clamp(26px, 4vw, 38px)' }}>
          <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(26px, 3.4vw, 38px)', lineHeight: 1.15, letterSpacing: '-0.6px', textAlign: 'center' }}>
            Perguntas frequentes
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={item.q} style={{ background: '#FBF7F0', border: '1px solid #EEE6D8', borderRadius: 12, overflow: 'hidden' }} data-reveal="1">
                <div
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '19px 22px', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{item.q}</span>
                  <span style={{ fontSize: 22, fontWeight: 700, color: '#D4432C', lineHeight: 1, flexShrink: 0 }}>
                    {openFaq === i ? '−' : '+'}
                  </span>
                </div>
                {openFaq === i && (
                  <div style={{ padding: '0 22px 19px 22px', fontSize: 15, lineHeight: 1.65, color: '#5C564D' }}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============ 12. CTA FINAL + 2º FORM ============ */}
      <div style={{ background: '#D4432C', padding: 'clamp(56px, 8vw, 96px) 20px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: 'clamp(32px, 4vw, 56px)', alignItems: 'center' }}>
          <div style={{ flex: '1 1 420px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h2 style={{ margin: 0, fontWeight: 900, fontSize: 'clamp(27px, 3.8vw, 42px)', lineHeight: 1.14, letterSpacing: '-0.7px', color: '#FFFFFF' }}>
              Sua farmácia já está sendo comparada com a do vizinho, você só não viu os números ainda.
            </h2>
            <p style={{ margin: 0, fontSize: 'clamp(17px, 2vw, 20px)', lineHeight: 1.5, color: 'rgba(255,255,255,0.92)', fontWeight: 600 }}>
              Leva 1 minuto pra mudar isso.
            </p>
          </div>
          <div style={{ flex: '1 1 400px', minWidth: 300, maxWidth: 520, width: '100%' }}>
            <FormCard variant="cta" {...formProps} />
          </div>
        </div>
      </div>

      {/* ============ 13. FOOTER ============ */}
      <div style={{ background: '#1A1A1A', padding: '52px 20px 30px 20px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-h-dark-bege.svg" alt="Recepta Plus" style={{ height: 24 }} />
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer" className="lp-footer-link" style={{ fontSize: 14, color: '#B8B8B8', textDecoration: 'none' }}>
              Política de Privacidade
            </a>
          </div>
          <div style={{ height: 1, background: '#2E2E2E' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px', justifyContent: 'space-between', fontSize: 12.5, color: '#8A8A8A', lineHeight: 1.6 }}>
            <span>RECEPTA SOLUÇÕES DIGITAIS LTDA · CNPJ 66.666.086/0001-02</span>
            <span>© 2026 Recepta Plus · São José dos Campos, SP</span>
          </div>
          {isMobile && <div style={{ height: 66 }} />}
        </div>
      </div>
    </div>
  );
}
