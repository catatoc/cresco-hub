import { redirect, unstable_rethrow } from 'next/navigation';
import { Fraunces } from 'next/font/google';
import { getTranslations } from 'next-intl/server';
import { requireContext } from '@/lib/auth/require-context';
import { PortalScene } from '@/components/portal/scene';
import type { AppContext } from '@/lib/auth/context';
import './portal.css';

// la voz serif del portal (numerales del tour, acentos editoriales)
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['italic', 'normal'],
  weight: ['300', '400'],
});

export const dynamic = 'force-dynamic';

// Shell del portal del cliente: full-bleed, sin sidebar.
// Los internos (@cresco.so) no viven aquí — van al hub.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let ctx: AppContext;
  try {
    ctx = await requireContext();
  } catch (e) {
    // los redirects de Next viajan como excepción y deben seguir su camino
    unstable_rethrow(e);
    // un fallo real (Notion caído/timeout) en el layout escaparía del error
    // boundary del segmento — aquí se atrapa y el cliente ve la montaña
    console.error('[portal] layout context failed', e);
    const t = await getTranslations('portal.error');
    return (
      <div className={fraunces.variable}>
        <main className="cp-page">
          <PortalScene />
          <div className="cp-err">
            <div className="cp-err-card">
              <span className="cp-err-dot" />
              <h2>{t('title')}</h2>
              <p>{t('body')}</p>
              <a className="cp-err-retry" href="/portal">{t('retry')}</a>
            </div>
          </div>
        </main>
      </div>
    );
  }
  if (ctx.isInternal) redirect('/');
  return <div className={fraunces.variable}>{children}</div>;
}
