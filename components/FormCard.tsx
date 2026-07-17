'use client';

import type { CSSProperties } from 'react';

export interface FormFields {
  nome: string;
  telefone: string;
  farmacia: string;
  cidade: string;
  estado: string;
  instagram: string;
  endereco: string;
  email: string;
}

export type Phase = 'form' | 'processing' | 'result_pdf' | 'result_whatsapp';

export interface FormCardProps {
  variant: 'hero' | 'cta';
  fields: FormFields;
  consent: boolean;
  digitsLen: number;
  setField: (key: keyof FormFields, value: string) => void;
  toggleConsent: () => void;
  formStep: 1 | 2;
  nextStep: () => void;
  backStep: () => void;
  phase: Phase;
  procMsg: string;
  showError: boolean;
  errorMsg: string;
  submit: () => void;
  pdfSrc: string;
  pdfFilename: string;
  farmaciaDone: string;
  privacyUrl: string;
  onOpenViewer: () => void;
}

const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const inputBase: CSSProperties = {
  fontFamily: 'Montserrat, sans-serif',
  fontSize: 15,
  padding: '13px 15px',
  border: '1.5px solid #E4DFD6',
  borderRadius: 10,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  color: '#1A1A1A',
  background: '#FFFFFF',
};

const selectBase: CSSProperties = {
  ...inputBase,
  padding: '13px 10px',
  cursor: 'pointer',
};

const okStyle: CSSProperties = { borderColor: '#2E9E5B', background: '#F6FBF6' };

const labelStyle: CSSProperties = { fontSize: 12.5, fontWeight: 600, color: '#6B6B6B' };
const fieldCol: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 5 };

const submitBtnStyle: CSSProperties = {
  width: '100%',
  height: 56,
  background: '#D4432C',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 12,
  fontFamily: 'Montserrat, sans-serif',
  fontWeight: 800,
  fontSize: 15.5,
  letterSpacing: '0.02em',
  cursor: 'pointer',
  marginTop: 4,
};

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        fontSize: 13,
        fontWeight: 600,
        color: '#D4432C',
        background: 'rgba(212,67,44,0.08)',
        borderRadius: 8,
        padding: '10px 12px',
      }}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5" />
        <path d="M12 16.5v.5" />
      </svg>
      {msg}
    </div>
  );
}

export default function FormCard(props: FormCardProps) {
  const {
    variant, fields, consent, digitsLen, setField, toggleConsent,
    formStep, nextStep, backStep, phase, procMsg, showError, errorMsg,
    submit, pdfSrc, pdfFilename, farmaciaDone, privacyUrl, onOpenViewer,
  } = props;

  const cardStyle: CSSProperties =
    variant === 'hero'
      ? {
          background: '#FFFFFF',
          border: '1px solid #EFE7DA',
          borderRadius: 16,
          boxShadow: '0 18px 50px rgba(26,26,26,0.12)',
          padding: 'clamp(22px, 3vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }
      : {
          background: '#FFFFFF',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(26,26,26,0.28)',
          padding: 'clamp(22px, 3vw, 28px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        };

  const styleNome: CSSProperties = { ...inputBase, ...(fields.nome.trim().length > 1 ? okStyle : null) };
  const styleTel: CSSProperties = { ...inputBase, ...(digitsLen >= 10 && digitsLen <= 11 ? okStyle : null) };
  const styleFarm: CSSProperties = { ...inputBase, ...(fields.farmacia.trim().length > 1 ? okStyle : null) };
  const styleCidade: CSSProperties = { ...inputBase, ...(fields.cidade.trim().length > 1 ? okStyle : null) };
  const styleSelect: CSSProperties = { ...selectBase, ...(fields.estado.length === 2 ? okStyle : null) };

  const styleCheckbox: CSSProperties = {
    flexShrink: 0,
    width: 22,
    height: 22,
    borderRadius: 6,
    border: '1.5px solid ' + (consent ? '#D4432C' : '#D4CEC0'),
    background: consent ? '#D4432C' : '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    transition: 'all 0.15s',
  };

  return (
    <div style={cardStyle}>
      {/* ===== FASE: FORM ===== */}
      {phase === 'form' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {variant === 'hero' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>Fazer meu diagnóstico grátis</div>
              <div style={{ fontSize: 13, color: '#6B6B6B' }}>Preencha e receba na tela em ~1 minuto.</div>
            </div>
          ) : (
            <div style={{ fontSize: 20, fontWeight: 800 }}>Fazer meu diagnóstico grátis</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 5, background: '#EFE7D8', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: formStep === 1 ? '50%' : '100%',
                  height: '100%',
                  background: '#D4432C',
                  borderRadius: 999,
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', color: '#6B6B6B', whiteSpace: 'nowrap' }}>
              Etapa {formStep} de 2
            </span>
          </div>

          {formStep === 1 && (
            <>
              <div style={fieldCol}>
                <label style={labelStyle}>Seu nome</label>
                <input
                  className="lp-input"
                  value={fields.nome}
                  onChange={(e) => setField('nome', e.target.value)}
                  placeholder="Como você se chama"
                  style={styleNome}
                />
              </div>
              <div style={fieldCol}>
                <label style={labelStyle}>WhatsApp (com DDD)</label>
                <input
                  className="lp-input"
                  value={fields.telefone}
                  onChange={(e) => setField('telefone', e.target.value)}
                  inputMode="tel"
                  placeholder="(00) 00000-0000"
                  style={styleTel}
                />
              </div>
              <div style={fieldCol}>
                <label style={labelStyle}>Nome da farmácia</label>
                <input
                  className="lp-input"
                  value={fields.farmacia}
                  onChange={(e) => setField('farmacia', e.target.value)}
                  placeholder="Nome da sua farmácia"
                  style={styleFarm}
                />
              </div>
              {showError && <ErrorBox msg={errorMsg} />}
              <button
                type="button"
                className="lp-btn"
                onClick={nextStep}
                style={{ ...submitBtnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                Continuar
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </button>
              <div style={{ fontSize: 12.5, color: '#6B6B6B', textAlign: 'center' }}>Grátis • Leva 1 minuto • Sem cartão</div>
            </>
          )}

          {formStep === 2 && (
            <>
              <div
                className="lp-back"
                onClick={backStep}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#6B6B6B',
                  cursor: 'pointer',
                }}
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M11 6l-6 6 6 6" />
                </svg>
                Voltar
              </div>
              <div style={{ fontSize: 12.5, color: '#6B6B6B' }}>Só mais alguns dados pra deixar seu diagnóstico preciso.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ ...fieldCol, flex: '1 1 auto', minWidth: 0 }}>
                  <label style={labelStyle}>Cidade</label>
                  <input
                    className="lp-input"
                    value={fields.cidade}
                    onChange={(e) => setField('cidade', e.target.value)}
                    placeholder="Sua cidade"
                    style={styleCidade}
                  />
                </div>
                <div style={{ ...fieldCol, flex: '0 0 92px' }}>
                  <label style={labelStyle}>UF</label>
                  <select
                    className="lp-select"
                    value={fields.estado}
                    onChange={(e) => setField('estado', e.target.value)}
                    style={styleSelect}
                  >
                    <option value="">UF</option>
                    {UFS.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={fieldCol}>
                  <label style={labelStyle}>
                    @ do Instagram <span style={{ color: '#A29B8E', fontWeight: 500 }}>· recomendado</span>
                  </label>
                  <input
                    className="lp-input"
                    value={fields.instagram}
                    onChange={(e) => setField('instagram', e.target.value)}
                    placeholder="@suafarmacia"
                    style={inputBase}
                  />
                </div>
                <div style={fieldCol}>
                  <label style={labelStyle}>
                    Endereço da farmácia <span style={{ color: '#A29B8E', fontWeight: 500 }}>· recomendado</span>
                  </label>
                  <input
                    className="lp-input"
                    value={fields.endereco}
                    onChange={(e) => setField('endereco', e.target.value)}
                    placeholder="Rua, número, bairro"
                    style={inputBase}
                  />
                </div>
                <div style={fieldCol}>
                  <label style={labelStyle}>
                    E-mail <span style={{ color: '#A29B8E', fontWeight: 500 }}>· opcional</span>
                  </label>
                  <input
                    className="lp-input"
                    value={fields.email}
                    onChange={(e) => setField('email', e.target.value)}
                    type="email"
                    placeholder="voce@email.com"
                    style={inputBase}
                  />
                </div>
              </div>

              <div onClick={toggleConsent} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 2 }}>
                <div style={styleCheckbox}>
                  {consent && (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 12.5, lineHeight: 1.5, color: '#5C564D' }}>
                  Concordo em receber meu diagnóstico e o contato da Recepta no WhatsApp, conforme a{' '}
                  <a
                    href={privacyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#D4432C', fontWeight: 600 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Política de Privacidade
                  </a>
                  .
                </span>
              </div>

              {showError && <ErrorBox msg={errorMsg} />}

              <button type="button" className="lp-btn" onClick={submit} style={submitBtnStyle}>
                Fazer meu diagnóstico grátis
              </button>
              <div style={{ fontSize: 12.5, color: '#6B6B6B', textAlign: 'center' }}>
                Grátis • Leva 1 minuto • Sem cartão, sem compromisso.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <svg viewBox="0 0 24 24" width="13" height="13" style={{ color: '#6B6B6B' }} fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10.5" width="16" height="10" rx="2.2" />
                  <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
                </svg>
                <span style={{ fontSize: 11.5, color: '#6B6B6B' }}>Dados protegidos conforme a LGPD</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== FASE: PROCESSANDO ===== */}
      {phase === 'processing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, padding: '36px 10px 30px 10px', textAlign: 'center' }}>
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              border: '4px solid #F0E7D8',
              borderTopColor: '#D4432C',
              animation: 'lpSpin 0.9s linear infinite',
            }}
          />
          <div style={{ fontSize: 18, fontWeight: 800 }}>Gerando seu diagnóstico…</div>
          <div style={{ fontSize: 15, color: '#5C564D', minHeight: 22 }}>{procMsg}</div>
          <div style={{ width: '100%', maxWidth: 320, height: 8, background: '#F0E7D8', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                background: '#D4432C',
                borderRadius: 999,
                animation: 'lpBar 140s cubic-bezier(0.2,0.8,0.2,1) forwards',
              }}
            />
          </div>
          <div style={{ fontSize: 12.5, color: '#9A9184' }}>Pode levar até 1–2 minutos. Não feche esta tela.</div>
        </div>
      )}

      {/* ===== FASE: RESULTADO PDF ===== */}
      {phase === 'result_pdf' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: 'flex-start',
              background: 'rgba(46,158,91,0.12)',
              color: '#1E7A46',
              borderRadius: 999,
              padding: '7px 13px',
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
            Também enviamos no seu WhatsApp
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2 }}>
            Pronto, {farmaciaDone}! Seu diagnóstico está pronto.
          </div>
          <button
            type="button"
            className="lp-btn"
            onClick={onOpenViewer}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 9,
              width: '100%',
              height: 54,
              background: '#D4432C',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 12,
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
              boxSizing: 'border-box',
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4l14 8-14 8V4z" />
            </svg>
            Ver meu diagnóstico
          </button>
          <a
            href={pdfSrc}
            download={pdfFilename}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              height: 48,
              background: '#FFFFFF',
              color: '#D4432C',
              border: '1.5px solid #D4432C',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 14,
              textDecoration: 'none',
              boxSizing: 'border-box',
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#D4432C" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
            </svg>
            Baixar PDF
          </a>
        </div>
      )}

      {/* ===== FASE: RESULTADO WHATSAPP (fallback) ===== */}
      {phase === 'result_whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '32px 12px', textAlign: 'center' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(46,158,91,0.14)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#1E7A46" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </div>
          <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.25 }}>
            Seu diagnóstico está sendo finalizado e chega no seu WhatsApp em instantes 👌
          </div>
          <div style={{ fontSize: 14.5, color: '#5C564D', lineHeight: 1.6 }}>
            Deixe o WhatsApp por perto, a Lara já está montando o seu PDF.
          </div>
        </div>
      )}
    </div>
  );
}
