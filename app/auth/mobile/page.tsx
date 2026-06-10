'use client';

// Puente OAuth para la app móvil: Supabase redirige aquí (https) con los
// tokens en el fragment. Saltamos al deep link vía 302 del servidor
// (/auth/mobile/go) — iOS bloquea saltos JS a esquemas custom, pero los
// redirects de servidor sí pasan. Botón manual como respaldo.
import { useEffect, useState } from 'react';

export default function MobileAuthBridge() {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next') ?? '';
    const hash = window.location.hash.replace(/^#/, '');
    const ok = (next.startsWith('exp://') || next.startsWith('crescoapp://')) && hash.length > 0;
    if (!ok) {
      setError(true);
      return;
    }
    setDeepLink(`${next}#${hash}`);
    // salto server-side: 302 → exp://… (interceptado por el in-app browser)
    window.location.replace(`/auth/mobile/go?next=${encodeURIComponent(next)}&hash=${encodeURIComponent(hash)}`);
  }, []);

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', gap: 18,
      alignItems: 'center', justifyContent: 'center', padding: 24,
      background: '#EFEAE0', color: '#5C544A', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 14,
    }}>
      {error ? (
        'No pudimos volver a la app. Ciérrame y reintenta.'
      ) : (
        <>
          <span>Volviendo a la app…</span>
          {deepLink && (
            <a
              href={deepLink}
              style={{
                background: '#1A1612', color: '#EFEAE0', textDecoration: 'none',
                borderRadius: 100, padding: '12px 24px', fontWeight: 500, fontSize: 14,
              }}
            >
              Tocar para volver a la app →
            </a>
          )}
        </>
      )}
    </div>
  );
}
