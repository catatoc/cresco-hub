'use client';

// Error boundary del portal: si Notion o el server fallan, el cliente ve la
// montaña y un reintentar — nunca una pantalla rota.
import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { PortalScene } from '@/components/portal/scene';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('portal.error');

  useEffect(() => {
    console.error('[portal] error boundary', error);
  }, [error]);

  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-err">
        <div className="cp-err-card">
          <span className="cp-err-dot" />
          <h2>{t('title')}</h2>
          <p>{t('body')}</p>
          <button onClick={() => reset()}>{t('retry')}</button>
        </div>
      </div>
    </main>
  );
}
