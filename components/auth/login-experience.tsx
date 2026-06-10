'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { supabaseBrowser } from '@/lib/supabase/client';
import styles from '@/app/(auth)/login/login.module.css';

// La escena del onboarding, 1:1: amanecer, la luz que escala la cima,
// guacamayas, mist, grain y parallax. "Entrar" dispara el OAuth de Google.
export function LoginExperience() {
  const sceneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // largo real de cada trazo para el draw-on de la luz
    scene.querySelectorAll<SVGPathElement>(`.${styles.climb} path`).forEach((p) => {
      p.style.setProperty('--len', String(p.getTotalLength()));
    });

    // parallax suave (lerp .06) sobre capas y sol
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const layers = scene.querySelectorAll<SVGElement>(`.${styles.layer}`);
    const sun = scene.querySelector<HTMLElement>(`.${styles.sun}`);
    const onMove = (e: MouseEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const loop = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      layers.forEach((l) => {
        const d = Number(l.getAttribute('data-depth')) || 0;
        l.style.transform = `translate(${-cx * d}px, ${-cy * d * 0.4}px)`;
      });
      if (sun) {
        sun.style.marginLeft = `${-cx * 10}px`;
        sun.style.marginTop = `${-cy * 8}px`;
      }
      raf = requestAnimationFrame(loop);
    };
    document.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      document.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  async function onEnter() {
    if (loading) return;
    setLoading(true);
    const next = searchParams.get('next') ?? '/';
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setLoading(false);
      toast.error('No pudimos iniciar sesión con Google.');
    }
  }

  return (
    <div className={styles.scene} ref={sceneRef}>
      <div className={styles.horizon} />
      <div className={styles.sun} />
      <div className={styles.mist} />

      <div className={styles.flock} aria-hidden>
        <div className={styles.bird}>
          <svg viewBox="0 0 64 34">
            <defs>
              <linearGradient id="lw1" gradientUnits="userSpaceOnUse" x1="7" y1="15" x2="62" y2="14">
                <stop offset="0" stopColor="#C1342A" /><stop offset=".5" stopColor="#E0A52E" /><stop offset="1" stopColor="#1E6FB0" />
              </linearGradient>
            </defs>
            <path d="M34 16 L 22 33" stroke="#1E6FB0" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <g className={styles.wings}>
              <path d="M34 16 C 25 6, 15 8, 7 15" stroke="url(#lw1)" strokeWidth="2.9" strokeLinecap="round" fill="none" />
              <path d="M34 16 C 43 8, 53 9, 62 14" stroke="url(#lw1)" strokeWidth="2.9" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>
        <div className={`${styles.bird} ${styles.b2}`}>
          <svg viewBox="0 0 64 34">
            <defs>
              <linearGradient id="lw2" gradientUnits="userSpaceOnUse" x1="7" y1="15" x2="62" y2="14">
                <stop offset="0" stopColor="#1E6FB0" /><stop offset=".5" stopColor="#2E8C84" /><stop offset="1" stopColor="#E0A52E" />
              </linearGradient>
            </defs>
            <path d="M34 16 L 22 33" stroke="#E0A52E" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <g className={styles.wings}>
              <path d="M34 16 C 25 6, 15 8, 7 15" stroke="url(#lw2)" strokeWidth="2.9" strokeLinecap="round" fill="none" />
              <path d="M34 16 C 43 8, 53 9, 62 14" stroke="url(#lw2)" strokeWidth="2.9" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>
      </div>

      <div className={styles.range}>
        <svg viewBox="0 0 1440 600" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="climbGold" gradientUnits="userSpaceOnUse" x1="0" y1="398" x2="0" y2="302">
              <stop offset="0" stopColor="#8AA487" /><stop offset=".45" stopColor="#C2BC8B" />
              <stop offset=".78" stopColor="#E9D29A" /><stop offset="1" stopColor="#FFFDF4" />
            </linearGradient>
            <radialGradient id="bloomGold" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#FFFDF6" stopOpacity=".7" />
              <stop offset=".4" stopColor="#F4E2AE" stopOpacity=".34" />
              <stop offset="1" stopColor="#F4E2AE" stopOpacity="0" />
            </radialGradient>
            <filter id="glowF" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="3" /></filter>
            <linearGradient id="fadeGrad" gradientUnits="userSpaceOnUse" x1="0" y1="430" x2="0" y2="276">
              <stop offset="0" stopColor="#000" /><stop offset=".15" stopColor="#000" />
              <stop offset=".36" stopColor="#fff" /><stop offset="1" stopColor="#fff" />
              <animateTransform attributeName="gradientTransform" type="translate" dur="10.5s" begin="0.35s"
                fill="freeze" keyTimes="0;0.54;1" values="0 72;0 72;0 -124"
                calcMode="spline" keySplines="0 0 1 1;.4 0 .25 1" />
            </linearGradient>
            <mask id="fadeMask" maskUnits="userSpaceOnUse" x="268" y="262" width="224" height="200">
              <rect x="268" y="262" width="224" height="200" fill="url(#fadeGrad)" />
            </mask>
          </defs>

          <path className={styles.layer} data-depth="6" fill="#C6CFBF" d="M0,372 L130,338 L270,360 L430,306 L610,348 L800,296 L1000,338 L1200,304 L1330,336 L1440,314 L1440,600 L0,600 Z" />
          <g className={`${styles.layer} ${styles.climb}`} data-depth="6">
            <g className={styles.trailWrap} mask="url(#fadeMask)">
              <path className={styles.trailGlow} d="M330,397 C404,392 402,356 344,350 C296,345 408,330 408,316 C410,310 422,308 430,306" />
              <path className={styles.trail} d="M330,397 C404,392 402,356 344,350 C296,345 408,330 408,316 C410,310 422,308 430,306" />
              <path className={styles.trailCore} d="M330,397 C404,392 402,356 344,350 C296,345 408,330 408,316 C410,310 422,308 430,306" />
            </g>
            <g className={styles.summitBloom}>
              <circle cx="430" cy="306" r="44" fill="url(#bloomGold)" />
              <circle cx="430" cy="306" r="6" fill="#FFFDF6" filter="url(#glowF)" />
              <circle cx="430" cy="306" r="2.4" fill="#FFFFFF" />
            </g>
          </g>
          <path className={styles.layer} data-depth="14" fill="#9DAD94" d="M0,430 L180,386 L350,418 L530,352 L720,406 L920,344 L1120,398 L1300,356 L1440,388 L1440,600 L0,600 Z" />
          <path className={styles.layer} data-depth="26" fill="#647A66" d="M0,492 L160,446 L390,500 L580,424 L780,492 L1000,416 L1220,480 L1390,436 L1440,466 L1440,600 L0,600 Z" />
          <path className={styles.layer} data-depth="42" fill="#3D5240" d="M0,548 L250,504 L500,552 L760,498 L1010,552 L1270,506 L1440,536 L1440,600 L0,600 Z" />
        </svg>
      </div>

      <div className={styles.grain} />

      <div className={styles.ui}>
        <div className={styles.eye}>Crecemos contigo.</div>
        <div className={styles.big}>crescō<span className={styles.d}>.</span></div>
        <button
          className={`${styles.enter} ${loading ? styles.enterLoading : ''}`}
          onClick={onEnter}
          type="button"
        >
          <span className={styles.spin} />
          <span className={styles.lbl}>{loading ? 'Entrando…' : 'Entra a tu proyecto'}</span>
          <span className={styles.arr}>→</span>
        </button>
      </div>

      <div className={styles.legal}>
        <Link href="/privacy">Privacidad</Link>
        <i aria-hidden />
        <Link href="/terms">Términos</Link>
      </div>
    </div>
  );
}
