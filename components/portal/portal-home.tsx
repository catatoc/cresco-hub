'use client';

import { useEffect, useState, useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { PortalScene } from './scene';
import { Brand } from './brand';
import { BriefMermaid } from './brief-mermaid';
import { PortalTimeline, taskState } from './timeline';
import { toggleMyTask, getProjectBrief } from '@/app/(portal)/actions';
import { timelineGeom, TODAY, type PortalData, type PortalProject, type PortalTask, type DeckHealth } from '@/lib/portal/data';
import type { PortalPayments } from '@/lib/portal/payments';
import type { ProjectBlock } from '@/lib/portal/content';

const HEALTH_LABEL: Record<DeckHealth, string> = { track: 'on track', risk: 'en riesgo', off: 'off track', block: 'bloqueado' };
const TODAY_MS = Date.parse(TODAY + 'T00:00:00Z');
const fmtDue = (iso: string) =>
  new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const fmtFull = (iso: string) =>
  new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const overdue = (t: PortalTask, done: boolean) => !done && !!t.due && Date.parse(t.due + 'T00:00:00Z') < TODAY_MS;

function Av({ initials, color, size = 30 }: { initials: string; color: string; size?: number }) {
  return (
    <span className="cp-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.37), background: color }}>
      {initials}
    </span>
  );
}

// El brief: los bloques de la página del proyecto en Notion, en lenguaje crescō
function Brief({ blocks }: { blocks: ProjectBlock[] }) {
  let num = 0;
  return (
    <>
      {blocks.map((b, i) => {
        const d = { '--d': `${0.05 + Math.min(i, 14) * 0.035}s` } as CSSProperties;
        if (b.kind !== 'oli') num = 0;
        switch (b.kind) {
          case 'h1':
          case 'h2':
            return <div className="cp-bh cp-rb" style={d} key={i}>{b.text}</div>;
          case 'h3':
            return <div className="cp-bh3 cp-rb" style={d} key={i}>{b.text}</div>;
          case 'li':
            return <div className="cp-bli cp-rb" style={d} key={i}><i />{b.text}</div>;
          case 'oli':
            num += 1;
            return <div className="cp-bli cp-rb" style={d} key={i}><span className="cp-bnum">{num}.</span>{b.text}</div>;
          case 'callout':
            return <div className="cp-bcall cp-rb" style={d} key={i}>{b.icon && <span className="cp-bico">{b.icon}</span>}<span>{b.text}</span></div>;
          case 'quote':
            return <div className="cp-bq cp-rb" style={d} key={i}>{b.text}</div>;
          case 'mermaid':
            return <div className="cp-rb" style={d} key={i}><BriefMermaid chart={b.text} /></div>;
          case 'img':
            return (
              <figure className="cp-bimg cp-rb" style={d} key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.text || 'Imagen del proyecto'} loading="lazy" />
                {b.text && <figcaption>{b.text}</figcaption>}
              </figure>
            );
          case 'divider':
            return <hr className="cp-bdiv" key={i} />;
          default:
            return <p className="cp-bp cp-rb" style={d} key={i}>{b.text}</p>;
        }
      })}
    </>
  );
}

function BriefSkeleton() {
  const w = [60, 92, 84, 0, 40, 88, 76, 64];
  return (
    <div style={{ paddingTop: 6 }}>
      {w.map((pct, i) =>
        pct ? (
          <span key={i} className="cp-sk" style={{ width: `${pct}%`, height: 12, display: 'block', marginBottom: 12 }} />
        ) : (
          <span key={i} style={{ display: 'block', height: 10 }} />
        ),
      )}
    </div>
  );
}

export function PortalHome({ data, payments }: { data: PortalData; payments: PortalPayments }) {
  const { projects, myTasks, meetings } = data;
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetTasks, setSheetTasks] = useState(false); // brief ⇄ tareas dentro del drawer
  // cache con timestamp: las urls de imagen firmadas por Notion expiran (~1h),
  // así que un brief viejo se refresca en silencio al reabrir el proyecto
  const [briefs, setBriefs] = useState<Record<string, { blocks: ProjectBlock[]; at: number }>>({});
  const [taskOpen, setTaskOpen] = useState<{ task: PortalTask; project: PortalProject } | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
  const [payClosing, setPayClosing] = useState(false);
  const [doneOverride, setDoneOverride] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const open = openId ? projects.find((p) => p.id === openId) ?? null : null;
  const isDone = (t: PortalTask) => doneOverride[t.id] ?? t.done;

  const BRIEF_STALE_MS = 10 * 60_000;
  const cacheBrief = (id: string, blocks: ProjectBlock[]) =>
    setBriefs((m) => ({ ...m, [id]: { blocks, at: Date.now() } }));

  // prefetch de los briefs (secuencial, gentil con Notion): abrir es instantáneo
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const p of projects) {
        try {
          const blocks = await getProjectBrief(p.id);
          if (cancelled) return;
          setBriefs((m) => (m[p.id] ? m : { ...m, [p.id]: { blocks, at: Date.now() } }));
        } catch {
          // al abrir el proyecto se reintenta
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // el brief se carga al abrir si el prefetch no llegó; sin brief → directo a tareas
  const brief = open ? briefs[open.id]?.blocks : undefined;
  const briefLoading = !!open && brief === undefined;
  const briefEmpty = brief !== undefined && brief.length === 0;
  const showTasks = sheetTasks || briefEmpty;

  function openProject(p: PortalProject) {
    setOpenId(p.id);
    setSheetTasks(false);
    const cached = briefs[p.id];
    if (!cached || Date.now() - cached.at > BRIEF_STALE_MS) {
      void getProjectBrief(p.id)
        .then((blocks) => cacheBrief(p.id, blocks))
        .catch(() => { if (!cached) cacheBrief(p.id, []); });
    }
  }

  const closeDrawer = () => { setDrawerClosing(true); setTimeout(() => { setOpenId(null); setDrawerClosing(false); setSheetTasks(false); }, 300); };
  const closeTask = () => { setModalClosing(true); setTimeout(() => { setTaskOpen(null); setModalClosing(false); }, 280); };
  const closePay = () => { setPayClosing(true); setTimeout(() => { setPayOpen(false); setPayClosing(false); }, 280); };

  // marcar/desmarcar — solo tareas propias (el server action lo re-verifica)
  function toggle(t: PortalTask) {
    if (!t.mine) return;
    const next = !isDone(t);
    setDoneOverride((m) => ({ ...m, [t.id]: next }));
    startTransition(() => { void toggleMyTask(t.id, next); });
  }

  const openDone = open ? open.tasks.filter((t) => isDone(t)).length : 0;
  const openLate = open ? open.tasks.filter((t) => overdue(t, isDone(t))).length : 0;
  const myOpen = myTasks.filter((t) => !isDone(t)).length;

  return (
    <main className="cp-page">
      <PortalScene />
      <div className="cp-stage">
        <div className="cp-topbar cp-r" style={{ '--d': '.04s' } as CSSProperties}>
          <Brand logo={data.customerLogo} name={data.customerName} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="cp-ucard">
              <Av initials={data.memberName.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()} color="#4A5C6B" />
              <div>
                <div className="cp-unm">{data.memberName}</div>
                <div className="cp-ucu">{data.customerName}</div>
              </div>
            </div>
            <button
              className="cp-signout"
              onClick={async () => {
                await fetch('/api/auth/signout', { method: 'POST' }).catch(() => null);
                window.location.href = '/login';
              }}
            >
              Salir
            </button>
          </div>
        </div>

        <div className="cp-greet cp-rb" style={{ '--d': '.12s' } as CSSProperties}>
          <h1>Hola, {data.firstName}.</h1>
          <p>Este es el estado de tu proyecto con <b>crescō</b>.</p>
          {payments.pendingTotal > 0 && (
            <button className="cp-paylink" onClick={() => setPayOpen(true)}>
              Tienes {payments.items.filter((p) => !p.paid).length === 1 ? 'un pago pendiente' : `${payments.items.filter((p) => !p.paid).length} pagos pendientes`} · <b>{payments.pendingLabel}</b> <span className="cp-paylink-go">ver detalle →</span>
            </button>
          )}
        </div>

        {/* ── board de proyectos ── */}
        <div className="cp-glass cp-rb" style={{ '--d': '.22s' } as CSSProperties}>
          <div className="cp-ghead">
            <span className="cp-ttl">
              Tus proyectos <span>· {projects.length} en curso</span>
            </span>
            <span className="cp-mo">{data.monthLabel}</span>
          </div>
          {projects.map((p, i) => {
            const geom = timelineGeom(p);
            return (
              <div className="cp-row cp-rb" key={p.id} style={{ '--d': `${0.3 + Math.min(i, 8) * 0.06}s` } as CSSProperties} onClick={() => openProject(p)}>
                <span className="cp-idx">{String(i + 1).padStart(2, '0')}</span>
                <div className="cp-rowhead">
                  <div className="cp-info">
                    <div className="cp-rn">{p.name}</div>
                    {p.subtitle && <div className="cp-rc">{p.subtitle}</div>}
                  </div>
                  <div className={`cp-health ${p.deckHealth}`}>
                    <span className="cp-hrow"><span className="cp-hd" />{HEALTH_LABEL[p.deckHealth]}</span>
                    {p.healthDetail && p.deckHealth !== 'track' && <span className="cp-why">{p.healthDetail}</span>}
                  </div>
                </div>
                <div className="cp-tlw">
                  <PortalTimeline geom={geom} tasks={p.tasks} drawDelay={0.4 + i * 0.08} onTaskClick={(t) => setTaskOpen({ task: t, project: p })} />
                  <div className="cp-tlm"><span>{p.startLabel}</span><span>{p.endLabel}</span></div>
                </div>
                <span className={`cp-pill ${p.pill === 'en pausa' ? 'pause' : ''}`}>{p.pill}</span>
              </div>
            );
          })}
          {!projects.length && <div className="cp-empty">Todavía no hay proyectos en curso. Tu PM de crescō los activará pronto.</div>}
          {projects.length > 0 && (
            <div className="cp-legend">
              <span><i style={{ background: '#3D5240' }} />lista</span>
              <span><i style={{ background: '#8C2E2E' }} />atrasada</span>
              <span><i style={{ background: '#F7F3EA', border: '1.5px solid #3D5240' }} />en curso</span>
              <span><i style={{ background: '#EFEAE0', border: '1px solid #C7BFAF' }} />por venir</span>
              <span><i style={{ width: 2.5, height: 11, borderRadius: 1, background: '#8C2E2E' }} />hoy</span>
            </div>
          )}
        </div>

        {/* ── tus tareas + tus reuniones ── */}
        <div className="cp-lower">
          <div className="cp-glass cp-rb" style={{ '--d': '.4s' } as CSSProperties}>
            <div className="cp-ghead">
              <span className="cp-ttl">Tus tareas con crescō <span>· {myOpen} abierta{myOpen !== 1 ? 's' : ''}</span></span>
            </div>
            {myTasks.map((t) => {
              const done = isDone(t);
              const late = overdue(t, done);
              const st = done ? { cls: 'done', label: 'lista' } : late ? { cls: 'late', label: 'atrasada' } : taskState(t);
              return (
                <div className={`cp-task ${done ? 'done' : ''}`} key={t.id}>
                  <button className="cp-ck" onClick={() => toggle(t)} title="Marcar / desmarcar">{done ? '✓' : ''}</button>
                  <div className="cp-tb">
                    <div className="cp-tt">{t.title}</div>
                    <div className="cp-tw">
                      {late ? <span className="late">⚠ venció {t.due ? fmtDue(t.due) : ''}</span> : t.due ? (done ? `lista · ${fmtDue(t.due)}` : `vence ${fmtDue(t.due)}`) : 'sin fecha'}
                      {t.projectName ? ` · ${t.projectName}` : ''}
                    </div>
                  </div>
                  <span className={`cp-tpill ${st.cls}`}>{st.label}</span>
                </div>
              );
            })}
            {!myTasks.length && <div className="cp-empty">No tienes tareas pendientes con crescō. 🌱</div>}
            {myTasks.length > 0 && <div className="cp-hint">Solo tú puedes marcar estas — son tuyas.</div>}
          </div>

          <div className="cp-glass cp-rb" style={{ '--d': '.48s' } as CSSProperties}>
            <div className="cp-ghead">
              <span className="cp-ttl">Tus reuniones <span>· resúmenes</span></span>
              <Link className="cp-seeall" href="/portal/reuniones">ver todas →</Link>
            </div>
            {meetings.map((m) => (
              <Link className="cp-meet cp-meet-link" key={m.id} href={`/portal/reuniones/${m.id}`}>
                <div className="cp-mh"><span className="cp-mt">{m.title}</span><span className="cp-md">{m.dateLabel}</span></div>
                {m.summary ? (
                  <div className="cp-ms">{m.summary}</div>
                ) : (
                  <div className="cp-ms" style={{ fontStyle: 'italic' }}>El resumen llega después de la reunión.</div>
                )}
                {m.attendees.length > 0 && (
                  <div className="cp-who">{m.attendees.map((a, i) => <Av key={i} initials={a.initials} color={a.color} size={18} />)}</div>
                )}
                <span className="cp-meet-go">Abrir reunión →</span>
              </Link>
            ))}
            {!meetings.length && <div className="cp-empty">Cuando tengamos nuestra primera reunión, aquí verás el resumen.</div>}
          </div>

        </div>
      </div>

      {/* ── drawer: brief del proyecto + sus tareas (lectura; las tuyas, marcables) ── */}
      {open && (
        <>
          <div className={`cp-scrim ${drawerClosing ? 'closing' : ''}`} onClick={closeDrawer} />
          <div className={`cp-sheet ${drawerClosing ? 'closing' : ''}`}>
            <div className="cp-shead">
              <div className="cp-stop"><span className="cp-sl">{showTasks ? 'Tareas del proyecto' : 'Tu proyecto'}</span><button className="cp-x" onClick={closeDrawer}>×</button></div>
              <h3>{open.name}</h3>
              <div className="cp-sm">
                {openDone} de {open.tasks.length} listas{openLate ? <> · <b>{openLate} atrasada{openLate > 1 ? 's' : ''}</b></> : null}
              </div>
            </div>
            {showTasks ? (
              <div className="cp-slist">
                {open.tasks.map((t) => {
                  const done = isDone(t);
                  const late = overdue(t, done);
                  const st = done ? { cls: 'done', label: 'lista' } : late ? { cls: 'late', label: 'atrasada' } : taskState(t);
                  return (
                    <div className={`cp-task ${done ? 'done' : ''}`} key={t.id}>
                      <button className="cp-ck" disabled={!t.mine} onClick={() => toggle(t)} title={t.mine ? 'Marcar / desmarcar' : 'Esta la lleva crescō'}>
                        {done ? '✓' : ''}
                      </button>
                      <div className="cp-tb">
                        <div className="cp-tt">{t.title}</div>
                        <div className="cp-tw">
                          {t.assignee ? `${t.assignee.name} · ` : ''}
                          {late ? <span className="late">⚠ venció {t.due ? fmtDue(t.due) : ''}</span> : t.due ? fmtDue(t.due) : 'sin fecha'}
                        </div>
                      </div>
                      <span className={`cp-tpill ${st.cls}`}>{st.label}</span>
                    </div>
                  );
                })}
                {!open.tasks.length && <div className="cp-empty">Este proyecto todavía no tiene tareas.</div>}
              </div>
            ) : (
              <div className="cp-brief">
                {briefLoading ? <BriefSkeleton /> : <Brief blocks={brief ?? []} />}
              </div>
            )}
            {(!showTasks || !briefEmpty) && (
              <div className="cp-sfoot">
                {showTasks ? (
                  <button className="cp-sbtn ghost" onClick={() => setSheetTasks(false)}>← Volver al brief</button>
                ) : (
                  <button className="cp-sbtn" onClick={() => setSheetTasks(true)}>
                    Ver tareas · {openDone} de {open.tasks.length} →
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── modal de tarea (clic en un punto de la línea) ── */}
      {taskOpen && (() => {
        const t = taskOpen.task;
        const done = isDone(t);
        const late = overdue(t, done);
        const st = done ? { cls: 'done', label: 'lista' } : late ? { cls: 'late', label: 'atrasada' } : taskState(t);
        return (
          <>
            <div className={`cp-scrim ${modalClosing ? 'closing' : ''}`} style={{ zIndex: 70 }} onClick={closeTask} />
            <div className="cp-tm-wrap" onClick={closeTask}>
              <div className={`cp-tm ${modalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="cp-tmh"><span className="cp-tmp">{taskOpen.project.name}</span><button className="cp-x" onClick={closeTask}>×</button></div>
                <div className="cp-tmt">{t.title}</div>
                <div className="cp-tmm">
                  {t.assignee && <span><Av initials={t.assignee.initials} color={t.assignee.color} size={20} />{t.assignee.name}</span>}
                  <span className={late ? 'late' : ''}>{late ? '⚠ ' : ''}{t.due ? fmtFull(t.due) : 'sin fecha'}</span>
                  <span className={`cp-tpill ${st.cls}`}>{st.label}</span>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── modal de pagos (clic en la línea del saludo) ── */}
      {payOpen && (
        <>
          <div className={`cp-scrim ${payClosing ? 'closing' : ''}`} style={{ zIndex: 70 }} onClick={closePay} />
          <div className="cp-tm-wrap" onClick={closePay}>
            <div className={`cp-tm ${payClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
              <div className="cp-tmh"><span className="cp-tmp">Pagos · con crescō</span><button className="cp-x" onClick={closePay}>×</button></div>
              <div className="cp-pay-hero">
                {payments.pendingTotal > 0 ? (
                  <>
                    <span className="cp-pay-big">{payments.pendingLabel}</span>
                    <span className="cp-pay-sub">pendiente · {payments.items.length} pago{payments.items.length !== 1 ? 's' : ''}</span>
                  </>
                ) : (
                  <span className="cp-pay-ok">Estás al día 🌱</span>
                )}
              </div>
              {payments.items.map((p) => (
                <div className="cp-pcard" key={p.id}>
                  <div className="cp-pcard-top">
                    <span className="cp-pcard-tt">{p.description}</span>
                    <span className={`cp-tpill ${p.paid ? 'done' : 'pend'}`}>{p.paid ? 'pagado' : 'pendiente'}</span>
                  </div>
                  {p.notes && <div className="cp-pcard-notes">{p.notes}</div>}
                  <div className="cp-pcard-foot">
                    <span className="cp-pcard-meta">{p.paid ? p.dateLabel ?? '' : p.dateLabel ? `vence ${p.dateLabel}` : 'fecha por definir'}</span>
                    <span className="cp-pcard-amt">{p.amountLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
