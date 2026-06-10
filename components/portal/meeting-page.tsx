'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { PortalScene } from './scene';
import { Brand } from './brand';
import { toggleMyTask } from '@/app/(portal)/actions';
import { initialsOf, colorFor, type PortalTask } from '@/lib/portal/data';
import type { PortalMeeting, ActaBlock } from '@/lib/portal/meeting';

// La página editorial de una reunión (mockup C del brainstorm 2026-06-10):
// un acta con aire — pill de contexto, título grande, asistentes, lede con
// borde moss y los acuerdos como checklist viva.

function Av({ initials, color, size = 24 }: { initials: string; color: string; size?: number }) {
  return (
    <span className="cp-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.37), background: color }}>
      {initials}
    </span>
  );
}

/** "Carlos, Diego, Andrés y Franco" a partir de los nombres de pila */
function namesLine(names: string[]): string {
  const first = names.map((n) => n.split(/\s+/)[0]).filter(Boolean);
  if (first.length <= 1) return first[0] ?? '';
  return `${first.slice(0, -1).join(', ')} y ${first[first.length - 1]}`;
}

function Acta({ blocks }: { blocks: ActaBlock[] }) {
  let ledeUsed = false;
  return (
    <>
      {blocks.map((b, i) => {
        if (b.kind === 'h2' || b.kind === 'h3') {
          return <div className="cp-mp-sect cp-rb" style={{ '--d': `${0.3 + i * 0.03}s` } as CSSProperties} key={i}>{b.text}</div>;
        }
        if (b.kind === 'p') {
          const lede = !ledeUsed;
          ledeUsed = true;
          return (
            <p className={`${lede ? 'cp-mp-lede' : 'cp-mp-p'} cp-rb`} style={{ '--d': `${0.3 + i * 0.03}s` } as CSSProperties} key={i}>
              {b.text}
            </p>
          );
        }
        return (
          <div className="cp-mp-li cp-rb" style={{ '--d': `${0.3 + i * 0.03}s` } as CSSProperties} key={i}>
            <i />{b.text}
          </div>
        );
      })}
    </>
  );
}

export function MeetingPage({ meeting }: { meeting: PortalMeeting }) {
  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();
  const isDone = (t: PortalTask) => doneOverride[t.id] ?? t.done;

  function toggle(t: PortalTask) {
    if (!t.mine) return;
    const next = !isDone(t);
    setDoneOverride((m) => ({ ...m, [t.id]: next }));
    startTransition(() => { void toggleMyTask(t.id, next); });
  }

  const pillLabel = [meeting.type, meeting.fullDateLabel].filter(Boolean).join(' · ');

  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage cp-mp-stage">
        <div className="cp-topbar cp-r" style={{ '--d': '.04s' } as CSSProperties}>
          <Link className="cp-mp-back" href="/portal">← Volver a tu portal</Link>
          <Brand size={19} />
        </div>

        <article className="cp-mp">
          <header>
            {pillLabel && (
              <span className="cp-mp-pill cp-rb" style={{ '--d': '.1s' } as CSSProperties}>{pillLabel}</span>
            )}
            <h1 className="cp-rb" style={{ '--d': '.16s' } as CSSProperties}>{meeting.title}</h1>
            {meeting.attendees.length > 0 && (
              <div className="cp-mp-who cp-rb" style={{ '--d': '.22s' } as CSSProperties}>
                <span className="cp-mp-avs">
                  {meeting.attendees.slice(0, 6).map((a, i) => <Av key={i} initials={a.initials} color={a.color} />)}
                </span>
                <span>{namesLine(meeting.attendees.map((a) => a.name))}</span>
              </div>
            )}
          </header>

          {meeting.acta.length > 0 ? (
            <Acta blocks={meeting.acta} />
          ) : meeting.summary ? (
            <p className="cp-mp-lede cp-rb" style={{ '--d': '.3s' } as CSSProperties}>{meeting.summary}</p>
          ) : (
            <p className="cp-mp-wait cp-rb" style={{ '--d': '.3s' } as CSSProperties}>El resumen llega después de la reunión.</p>
          )}

          {meeting.acuerdos.length > 0 && (
            <section className="cp-mp-deals cp-rb" style={{ '--d': '.4s' } as CSSProperties}>
              <div className="cp-mp-sect" style={{ marginTop: 0 }}>Acuerdos de esta reunión</div>
              {meeting.acuerdos.map((t) => {
                const done = isDone(t);
                return (
                  <div className={`cp-task ${done ? 'done' : ''}`} key={t.id} style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <button className="cp-ck" disabled={!t.mine} onClick={() => toggle(t)} title={t.mine ? 'Marcar / desmarcar' : 'Esta la lleva crescō'}>
                      {done ? '✓' : ''}
                    </button>
                    <div className="cp-tb">
                      <div className="cp-tt">{t.title}</div>
                      {t.assignee && <div className="cp-tw">{t.assignee.name}</div>}
                    </div>
                    <span className={`cp-tpill ${done ? 'done' : 'todo'}`}>{done ? 'lista' : 'pendiente'}</span>
                  </div>
                );
              })}
            </section>
          )}
        </article>
      </div>
    </main>
  );
}
