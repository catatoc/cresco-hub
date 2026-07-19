'use client';

// El tour del portal: el velo (blur) se posa sobre todo menos el foco, que
// morfa de sección en sección con la curva de la casa. Los pasos apuntan a
// elementos reales por id y se filtran solos: si una sección no existe para
// este cliente, su paso no entra. El foco se recalcula en cada resize/scroll
// (pixel perfect responsive); en móvil la tarjeta es hoja anclada abajo.
// La marca de "ya lo vio" vive en Notion (Portal Onboarding Check, en Team).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { completePortalTour } from '@/app/(portal)/actions';

interface Step {
  target: string; // id del elemento real
  key: string; // clave de mensaje (título/cuerpo se traducen en render)
  pad: number;
}

const STEPS: Step[] = [
  { target: 'cp-t-capsula', key: 'capsula', pad: 10 },
  { target: 'cp-t-board', key: 'board', pad: 8 },
  { target: 'cp-t-tareas', key: 'tareas', pad: 8 },
  { target: 'cp-t-reuniones', key: 'reuniones', pad: 8 },
  { target: 'cp-t-user', key: 'user', pad: 8 },
];

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v'];
const MOBILE = 560;

export function PortalTour({ autoStart }: { autoStart: boolean }) {
  const t = useTranslations('portal.tour');
  const [steps, setSteps] = useState<Step[]>([]);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const marked = useRef(false);
  const veilT = useRef<HTMLDivElement>(null);
  const veilB = useRef<HTMLDivElement>(null);
  const veilL = useRef<HTMLDivElement>(null);
  const veilR = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);

  const start = useCallback(() => {
    // solo los pasos cuyo elemento existe para este cliente
    const present = STEPS.filter((s) => document.getElementById(s.target));
    if (!present.length) return;
    setSteps(present);
    setStep(0);
    setActive(true);
  }, []);

  const finish = useCallback(() => {
    setActive(false);
    if (!marked.current) {
      marked.current = true;
      void completePortalTour().catch(() => null);
    }
  }, []);

  // arranque automático: tras las animaciones de entrada del portal
  useEffect(() => {
    if (!autoStart) return;
    const t = setTimeout(start, 1500);
    return () => clearTimeout(t);
  }, [autoStart, start]);

  // transiciones del velo/aro/tarjeta: apagadas mientras la página viaja
  // (siguen al foco 1:1) y reactivadas al aterrizar — el morph solo anima
  // entre pasos, nunca contra el scroll. Sin esto, en el teléfono el aro
  // va elástico detrás de su sección y el smooth scroll se ve a tirones.
  const setAnim = useCallback((on: boolean) => {
    [veilT, veilB, veilL, veilR, ring, card].forEach((n) =>
      n.current?.classList.toggle('cp-tour-noanim', !on),
    );
  }, []);

  // geometría: imperativa vía refs (sin re-render por pixel) y SIN scroll —
  // el scroll se decide una sola vez por paso, nunca desde aquí
  const layout = useCallback(() => {
    const s = steps[step];
    if (!s) return;
    const el = document.getElementById(s.target);
    const c = card.current;
    if (!el || !c || !ring.current) return;
    const b = el.getBoundingClientRect();
    const r = { x: b.left - s.pad, y: b.top - s.pad, w: b.width + s.pad * 2, h: b.height + s.pad * 2 };
    const W = window.innerWidth;
    const H = window.innerHeight;

    const set = (n: HTMLDivElement | null, css: Partial<CSSStyleDeclaration>) => n && Object.assign(n.style, css);
    set(veilT.current, { left: '0px', top: '0px', width: `${W}px`, height: `${Math.max(0, r.y)}px` });
    set(veilB.current, { left: '0px', top: `${r.y + r.h}px`, width: `${W}px`, height: `${Math.max(0, H - r.y - r.h)}px` });
    set(veilL.current, { left: '0px', top: `${r.y}px`, width: `${Math.max(0, r.x)}px`, height: `${r.h}px` });
    set(veilR.current, { left: `${r.x + r.w}px`, top: `${r.y}px`, width: `${Math.max(0, W - r.x - r.w)}px`, height: `${r.h}px` });
    set(ring.current, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px` });

    if (W > MOBILE) {
      // debajo del foco si cabe; si no, encima — y clamp horizontal
      c.classList.remove('cp-tour-arrow-bottom');
      const ch = c.offsetHeight;
      let top = r.y + r.h + 14;
      if (top + ch > H - 14) {
        top = r.y - ch - 14;
        c.classList.add('cp-tour-arrow-bottom');
      }
      const left = Math.min(Math.max(14, r.x), W - c.offsetWidth - 14);
      Object.assign(c.style, { left: `${left}px`, top: `${Math.max(14, top)}px`, bottom: 'auto' });
    } else {
      // móvil: hoja anclada abajo — el CSS manda, fuera estilos inline
      c.style.left = '';
      c.style.top = '';
      c.style.bottom = '';
    }
  }, [steps, step]);

  // al cambiar de paso: UN solo scroll (si hace falta), calculado a mano —
  // en móvil descuenta la hoja del tour para que el foco no quede tapado
  useEffect(() => {
    if (!active) return;
    const s = steps[step];
    const el = s && document.getElementById(s.target);
    if (!el) return;
    const b = el.getBoundingClientRect();
    const H = window.innerHeight;
    const sheetH = window.innerWidth <= MOBILE ? (card.current?.offsetHeight ?? 0) + 28 : 0;
    const visible = H - sheetH;
    const fits = b.top >= 8 && b.bottom <= visible - 8;
    if (fits) {
      layout();
      return;
    }
    setAnim(false); // el velo viaja pegado, sin pelear con su transición
    const targetY = window.scrollY + b.top - Math.max(16, (visible - b.height) / 2);
    window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    layout();
  }, [active, steps, step, layout, setAnim]);

  useEffect(() => {
    if (!active) return;
    let settle: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      // mientras la página se mueve, seguir 1:1; al asentarse, volver el morph
      setAnim(false);
      layout();
      clearTimeout(settle);
      settle = setTimeout(() => setAnim(true), 140);
    };
    const onScrollEnd = () => {
      clearTimeout(settle);
      layout();
      setAnim(true);
    };
    window.addEventListener('resize', layout);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', onScrollEnd);
    return () => {
      clearTimeout(settle);
      window.removeEventListener('resize', layout);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('scrollend', onScrollEnd);
    };
  }, [active, layout, setAnim]);

  // teclado: ← → Enter Esc
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') step < steps.length - 1 ? setStep(step + 1) : finish();
      if (e.key === 'ArrowLeft' && step > 0) setStep(step - 1);
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, step, steps.length, finish]);

  const s = steps[step];
  return (
    <>
      {active && s && (
        <div role="dialog" aria-modal="true" aria-label={t('ariaDialog', { step: step + 1, total: steps.length })}>
          <div className="cp-tour-veil" ref={veilT} onClick={finish} />
          <div className="cp-tour-veil" ref={veilB} onClick={finish} />
          <div className="cp-tour-veil" ref={veilL} onClick={finish} />
          <div className="cp-tour-veil" ref={veilR} onClick={finish} />
          <div className="cp-tour-ring" ref={ring} />
          <div className="cp-tour-card" ref={card}>
            <div className="cp-tour-no">
              {ROMAN[step] ?? step + 1}
              <b>{step + 1} / {steps.length}</b>
            </div>
            <h3>{t(`steps.${s.key}.title`)}</h3>
            <p>{t(`steps.${s.key}.body`)}</p>
            <div className="cp-tour-foot">
              <button className="cp-tour-skip" onClick={finish}>{t('skip')}</button>
              <div className="cp-tour-nav">
                <div className="cp-tour-dots">
                  {steps.map((_, i) => <span key={i} className={`cp-tour-dot ${i === step ? 'on' : ''}`} />)}
                </div>
                {step > 0 && (
                  <button className="cp-tour-back" onClick={() => setStep(step - 1)} aria-label={t('prev')}>←</button>
                )}
                <button
                  className="cp-tour-next"
                  onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
                >
                  {step === steps.length - 1 ? <>{t('done')} <span className="cp-tour-circ">✓</span></> : <>{t('next')} <span className="cp-tour-circ">→</span></>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <button className="cp-tour-help" onClick={start} title={t('help')} aria-label={t('help')}>?</button>
    </>
  );
}
