'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { PortalScene } from './scene';
import { Brand } from './brand';
import type { PortalMeetingSummary } from '@/lib/portal/meeting';

// Índice de reuniones del cliente — cada card navega a su página editorial.

function Av({ initials, color }: { initials: string; color: string }) {
  return (
    <span className="cp-av" style={{ width: 18, height: 18, fontSize: 7, background: color }}>
      {initials}
    </span>
  );
}

export function MeetingsIndex({ meetings }: { meetings: PortalMeetingSummary[] }) {
  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage" style={{ maxWidth: 760 }}>
        <div className="cp-topbar cp-r" style={{ '--d': '.04s' } as CSSProperties}>
          <Link className="cp-mp-back" href="/portal">← Volver a tu portal</Link>
          <Brand size={19} />
        </div>

        <div className="cp-greet cp-rb" style={{ '--d': '.1s' } as CSSProperties}>
          <h1>Tus reuniones.</h1>
          <p>Cada reunión con <b>crescō</b>, con su acta y sus acuerdos.</p>
        </div>

        <div className="cp-glass cp-rb" style={{ '--d': '.2s' } as CSSProperties}>
          {meetings.map((m, i) => (
            <Link
              className="cp-meet cp-meet-link cp-rb"
              key={m.id}
              href={`/portal/reuniones/${m.id}`}
              style={{ '--d': `${0.26 + Math.min(i, 10) * 0.05}s` } as CSSProperties}
            >
              <div className="cp-mh"><span className="cp-mt">{m.title}</span><span className="cp-md">{m.dateLabel}</span></div>
              {m.summary && <div className="cp-ms">{m.summary}</div>}
              {m.attendees.length > 0 && (
                <div className="cp-who">{m.attendees.slice(0, 6).map((a, j) => <Av key={j} initials={a.initials} color={a.color} />)}</div>
              )}
              <span className="cp-meet-go">Abrir reunión →</span>
            </Link>
          ))}
          {!meetings.length && <div className="cp-empty">Cuando tengamos nuestra primera reunión, aquí verás el acta.</div>}
        </div>
      </div>
    </main>
  );
}
