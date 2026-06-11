'use client';

// Error boundary del portal: si Notion o el server fallan, el cliente ve la
// montaña y un reintentar — nunca una pantalla rota.
import { useEffect } from 'react';
import { PortalScene } from '@/components/portal/scene';

export default function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[portal] error boundary', error);
  }, [error]);

  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-err">
        <div className="cp-err-card">
          <span className="cp-err-dot" />
          <h2>No pudimos cargar tu portal.</h2>
          <p>Estamos teniendo un problema momentáneo. Vuelve a intentar en unos segundos.</p>
          <button onClick={() => reset()}>Reintentar</button>
        </div>
      </div>
    </main>
  );
}
