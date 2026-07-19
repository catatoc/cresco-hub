'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { completePortalWelcome } from '@/app/(portal)/actions';
import styles from './welcome.module.css';

// Bienvenida del portal del cliente — primera entrada (Portal Sign In vacío).
// Hermana de la bienvenida de onboarding-cresco, con copy para clientes:
// gracias por la confianza, quiénes somos, y el handoff hacia su portal.
const ORDER = ['intro', 's1', 's2', 's3', 'done'] as const;
const DONE = ORDER.length - 1;

export function WelcomeExperience({ firstName, gender = null }: { firstName: string; gender?: 'Male' | 'Female' | null }) {
  const t = useTranslations('portal.welcome');
  const ac = (chunks: React.ReactNode) => <span className={styles.ac}>{chunks}</span>;
  const [active, setActive] = useState<number | null>(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  const [entering, startEnter] = useTransition();

  const eff = active ?? leaving ?? 0;
  const name = ORDER[eff];
  const onSlide = name !== 'done';

  // marca Portal Sign In en Notion y revela el portal (la página re-renderiza
  // del lado del servidor ya con el checkbox en true)
  const finish = useCallback(() => {
    if (entering) return;
    startEnter(async () => {
      await completePortalWelcome();
      router.refresh();
    });
  }, [entering, router]);

  const go = useCallback(
    (n: number) => {
      if (busy.current || active === null || n === active || n < 0 || n > DONE) return;
      busy.current = true;
      setLeaving(active);
      setActive(null);
      window.setTimeout(() => {
        setActive(n);
        setLeaving(null);
        window.setTimeout(() => {
          busy.current = false;
        }, 700);
      }, 480);
    },
    [active],
  );

  const next = useCallback(() => go(eff + 1), [go, eff]);
  const prev = useCallback(() => go(eff - 1), [go, eff]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!onSlide) return;
      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSlide, next, prev]);

  const cls = (k: number) =>
    `${styles.scene}${k === active ? ' ' + styles.active : ''}${k === leaving ? ' ' + styles.leaving : ''}`;
  const step = name === 'done' ? ORDER.length - 1 : eff + 1;
  const ringFilled = active === DONE;

  return (
    <div className={styles.root} onClick={() => onSlide && next()}>
      <div className={styles.atmos}>
        <div className={`${styles.glow} ${styles.g1}`} />
        <div className={`${styles.glow} ${styles.g2}`} />
        <div className={styles.vig} />
        <div className={styles.grain} />
      </div>

      <div className={styles.mark}>
        <span className={styles.dot} />
        <span>cresc&#333;<span className={styles.d}>.</span></span>
      </div>

      <button
        className={`${styles.skip}${onSlide ? ' ' + styles.show : ''}`}
        onClick={(e) => { e.stopPropagation(); go(DONE); }}
      >
        {t('skip')}
      </button>

      <div className={styles.stage}>
        {/* intro · gracias por la confianza */}
        <section className={cls(0)}>
          <div className={styles.rise} style={{ ['--d' as string]: '.2s' }}>
            <div className={`${styles.line} ${styles.long}`}>
              {t.rich('intro', { firstName, gender: gender ?? 'other', ac })}
            </div>
          </div>
        </section>

        {/* s1 · quiénes somos */}
        <section className={cls(1)}>
          <div className={styles.rise} style={{ ['--d' as string]: '.2s' }}>
            <div className={`${styles.line} ${styles.long}`}>
              {t.rich('s1', { ac })}
            </div>
          </div>
        </section>

        {/* s2 · el compromiso */}
        <section className={cls(2)}>
          <div className={styles.rise} style={{ ['--d' as string]: '.2s' }}>
            <div className={`${styles.line} ${styles.long}`}>
              {t.rich('s2', { ac })}
            </div>
          </div>
        </section>

        {/* s3 · la experiencia */}
        <section className={cls(3)}>
          <div className={styles.rise} style={{ ['--d' as string]: '.2s' }}>
            <div className={`${styles.line} ${styles.long}`}>
              {t.rich('s3', { ac })}
            </div>
          </div>
        </section>

        {/* done · handoff al portal */}
        <section className={cls(4)}>
          <div className={`${styles.ring} ${styles.rise}`} style={{ ['--d' as string]: '.1s' }}>
            <svg width="120" height="120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="#2c2a24" strokeWidth="8" />
              <circle
                cx="60" cy="60" r="50" fill="none" stroke="#7E9A80" strokeWidth="8" strokeLinecap="round"
                strokeDasharray="314"
                strokeDashoffset={ringFilled ? 188 : 314}
                style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1) .35s' }}
              />
            </svg>
            <div className={styles.ctr}>🌱</div>
          </div>
          <div className={`${styles.big} ${styles.rise}`} style={{ ['--d' as string]: '.3s' }}>
            {t('doneTitle')}
          </div>
          <div className={`${styles.below} ${styles.rise}`} style={{ ['--d' as string]: '.5s' }}>
            {t('doneSubtitle')}
          </div>
          <button
            className={`${styles.adv} ${styles.rise}`}
            style={{ ['--d' as string]: '.7s' }}
            disabled={entering}
            onClick={(e) => { e.stopPropagation(); finish(); }}
          >
            {entering ? t('entering') : t('enter')} <span className={styles.arr}>→</span>
          </button>
        </section>
      </div>

      <div className={`${styles.progress}${onSlide ? ' ' + styles.show : ''}`}>
        {Array.from({ length: ORDER.length - 1 }, (_, i) => i).map((i) => (
          <span key={i} className={`${styles.seg}${i < step ? ' ' + styles.on : ''}`} />
        ))}
      </div>

      <div className={`${styles.hint}${name === 'intro' ? ' ' + styles.show : ''}`}>
        {t('hint')}
      </div>
    </div>
  );
}
