'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('portal');
  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage" style={{ maxWidth: 760 }}>
        <div className="cp-topbar cp-r" style={{ '--d': '.04s' } as CSSProperties}>
          <Link className="cp-mp-back" href="/portal">{t('common.backToPortal')}</Link>
          <Brand size={19} />
        </div>

        <div className="cp-greet cp-rb" style={{ '--d': '.1s' } as CSSProperties}>
          <h1>{t('meetingsIndex.title')}</h1>
          <p>{t.rich('meetingsIndex.subtitle', { b: (chunks) => <b>{chunks}</b> })}</p>
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
              <span className="cp-meet-go">{t('common.openMeeting')}</span>
            </Link>
          ))}
          {!meetings.length && <div className="cp-empty">{t('meetingsIndex.empty')}</div>}
        </div>
      </div>
    </main>
  );
}
