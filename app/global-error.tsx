'use client';

// Último recurso: renderiza SIN layout, providers ni CSS de la app, así que
// todo el sistema crescō (lino · paper · ink · moss) va inline. Español por
// defecto, sin mensaje técnico — el digest basta para rastrear.
const tokens = {
  bg: '#EFEAE0',
  paper: 'rgba(247,243,234,.92)',
  ink: '#1A1612',
  inkSoft: '#5C544A',
  muted: '#8C8377',
  line: '#D4CCBC',
  moss: '#3D5240',
  clay: '#9E6B23',
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          background: tokens.bg,
          color: tokens.ink,
          fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <style>{`
          @keyframes ge-pulse { 0%, 100% { opacity: .35; } 50% { opacity: 1; } }
          @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
        `}</style>
        <div
          style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
          }}
        >
          <div
            style={{
              width: 420,
              maxWidth: '100%',
              textAlign: 'center',
              padding: '34px 36px 32px',
              borderRadius: 22,
              background: tokens.paper,
              border: `0.5pt solid ${tokens.line}`,
              boxShadow: '0 20px 60px -30px rgba(26,22,18,.35)',
            }}
          >
            <div
              style={{
                fontSize: 17,
                fontWeight: 500,
                letterSpacing: '-.03em',
                marginBottom: 18,
              }}
            >
              crescō<span style={{ color: tokens.moss }}>.</span>
            </div>
            <span
              style={{
                display: 'inline-block',
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: tokens.clay,
                animation: 'ge-pulse 2.2s ease-in-out infinite',
              }}
            />
            <h1 style={{ fontSize: 21, fontWeight: 500, letterSpacing: '-.03em', margin: '14px 0 0' }}>
              Algo no salió como esperábamos
            </h1>
            <p
              style={{
                fontSize: 13.5,
                fontWeight: 400,
                color: tokens.inkSoft,
                margin: '8px 0 0',
                lineHeight: 1.55,
              }}
            >
              Suele resolverse recargando la página. Si persiste, el equipo de
              crescō ya tiene el detalle para revisarlo.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: 11,
                  color: tokens.muted,
                  margin: '10px 0 0',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                }}
              >
                ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                marginTop: 22,
                font: 'inherit',
                fontSize: 14,
                fontWeight: 500,
                letterSpacing: '-.01em',
                color: '#F7F3EA',
                background: tokens.ink,
                border: 'none',
                borderRadius: 100,
                padding: '12px 30px',
                cursor: 'pointer',
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
