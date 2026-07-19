'use client';

import { useEffect, useState, useTransition, type CSSProperties } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageToggle } from '@/components/common/language-toggle';
import { PortalScene } from './scene';
import { Brand } from './brand';
import { Brief, BriefSkeleton } from './brief';
import { DocumentsCapsule } from './capsule';
import { PortalTour } from './tour';
import { PortalTimeline, taskState } from './timeline';
import { toggleMyTask, getProjectBrief, getTaskBody } from '@/app/(portal)/actions';
import { timelineGeom, TODAY, type PortalData, type PortalProject, type PortalTask } from '@/lib/portal/data';
import type { PortalPayments } from '@/lib/portal/payments';
import type { PortalDocuments } from '@/lib/portal/documents';
import type { ProjectBlock } from '@/lib/portal/content';

const TODAY_MS = Date.parse(TODAY + 'T00:00:00Z');
const fmtDue = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const fmtFull = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
const overdue = (t: PortalTask, done: boolean) => !done && !!t.due && Date.parse(t.due + 'T00:00:00Z') < TODAY_MS;

function Av({ initials, color, size = 30 }: { initials: string; color: string; size?: number }) {
  return (
    <span className="cp-av" style={{ width: size, height: size, fontSize: Math.round(size * 0.37), background: color }}>
      {initials}
    </span>
  );
}

export function PortalHome({ data, payments, documents, showTour }: { data: PortalData; payments: PortalPayments; documents: PortalDocuments; showTour: boolean }) {
  const tr = useTranslations('portal');
  const locale = useLocale();
  const { projects, myTasks, meetings } = data;
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheetTasks, setSheetTasks] = useState(false); // brief ⇄ tareas dentro del drawer
  // cache con timestamp: las urls de imagen firmadas por Notion expiran (~1h),
  // así que un brief viejo se refresca en silencio al reabrir el proyecto
  const [briefs, setBriefs] = useState<Record<string, { blocks: ProjectBlock[]; at: number }>>({});
  const [taskOpen, setTaskOpen] = useState<{ task: PortalTask; projectName: string | null } | null>(null);
  // cuerpo de la tarea (specs de su página en Notion), cacheado como los briefs
  const [taskBodies, setTaskBodies] = useState<Record<string, { blocks: ProjectBlock[]; at: number }>>({});
  const [drawerClosing, setDrawerClosing] = useState(false);
  const [modalClosing, setModalClosing] = useState(false);
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

  function openTask(task: PortalTask, projectName: string | null) {
    setTaskOpen({ task, projectName });
    const cached = taskBodies[task.id];
    if (!cached || Date.now() - cached.at > BRIEF_STALE_MS) {
      void getTaskBody(task.id)
        .then((blocks) => setTaskBodies((m) => ({ ...m, [task.id]: { blocks, at: Date.now() } })))
        .catch(() => { if (!cached) setTaskBodies((m) => ({ ...m, [task.id]: { blocks: [], at: Date.now() } })); });
    }
  }

  const closeDrawer = () => { setDrawerClosing(true); setTimeout(() => { setOpenId(null); setDrawerClosing(false); setSheetTasks(false); }, 300); };
  const closeTask = () => { setModalClosing(true); setTimeout(() => { setTaskOpen(null); setModalClosing(false); }, 280); };

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
            <LanguageToggle />
            <div className="cp-ucard" id="cp-t-user">
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
              {tr('common.signOut')}
            </button>
          </div>
        </div>

        <div className="cp-greet cp-rb" style={{ '--d': '.12s' } as CSSProperties}>
          <h1>{tr('home.greeting', { name: data.firstName })}</h1>
          <p>{tr.rich('home.subtitle', { b: (chunks) => <b>{chunks}</b> })}</p>
        </div>

        {/* ── la cápsula: documentos del cliente (pagos · propuesta · accesos · infra) ── */}
        <DocumentsCapsule payments={payments} documents={documents} />

        {/* ── board de proyectos ── */}
        <div className="cp-glass cp-rb" id="cp-t-board" style={{ '--d': '.22s' } as CSSProperties}>
          <div className="cp-ghead">
            <span className="cp-ttl">
              {tr('home.projectsTitle')} <span>{tr('home.projectsCount', { count: projects.length })}</span>
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
                    {p.designUrl && (
                      <a
                        className="cp-design"
                        href={p.designUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {tr('home.design')} ↗
                      </a>
                    )}
                  </div>
                  <div className={`cp-health ${p.deckHealth}`}>
                    <span className="cp-hrow"><span className="cp-hd" />{tr(`health.${p.deckHealth}`)}</span>
                    {p.healthDetail && p.deckHealth !== 'track' && <span className="cp-why">{p.healthDetail}</span>}
                  </div>
                </div>
                <div className="cp-tlw">
                  <PortalTimeline geom={geom} tasks={p.tasks} drawDelay={0.4 + i * 0.08} onTaskClick={(t) => openTask(t, p.name)} />
                  <div className="cp-tlm"><span>{p.startLabel}</span><span>{p.endLabel}</span></div>
                </div>
                <span className={`cp-pill ${p.paused ? 'pause' : ''}`}>{p.pill}</span>
              </div>
            );
          })}
          {!projects.length && <div className="cp-empty">{tr('home.projectsEmpty')}</div>}
          {projects.length > 0 && (
            <div className="cp-legend">
              <span><i style={{ background: '#3D5240' }} />{tr('home.legend.ready')}</span>
              <span><i style={{ background: '#8C2E2E' }} />{tr('home.legend.late')}</span>
              <span><i style={{ background: '#F7F3EA', border: '1.5px solid #3D5240' }} />{tr('home.legend.running')}</span>
              <span><i style={{ background: '#EFEAE0', border: '1px solid #C7BFAF' }} />{tr('home.legend.upcoming')}</span>
              <span><i style={{ width: 2.5, height: 11, borderRadius: 1, background: '#8C2E2E' }} />{tr('home.legend.today')}</span>
            </div>
          )}
        </div>

        {/* ── tus tareas + tus reuniones ── */}
        <div className="cp-lower">
          <div className="cp-glass cp-rb" id="cp-t-tareas" style={{ '--d': '.4s' } as CSSProperties}>
            <div className="cp-ghead">
              <span className="cp-ttl">{tr('home.tasksTitle')} <span>{tr('home.tasksCount', { count: myOpen })}</span></span>
            </div>
            {myTasks.map((t) => {
              const done = isDone(t);
              const late = overdue(t, done);
              const cls = done ? 'done' : late ? 'late' : taskState(t).cls;
              return (
                <div className={`cp-task ${done ? 'done' : ''}`} key={t.id}>
                  <button className="cp-ck" onClick={() => toggle(t)} title={tr('common.toggle')}>{done ? '✓' : ''}</button>
                  <div
                    className="cp-tb cp-tb-open"
                    role="button"
                    tabIndex={0}
                    onClick={() => openTask(t, t.projectName ?? null)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openTask(t, t.projectName ?? null);
                      }
                    }}
                  >
                    <div className="cp-tt">{t.title}</div>
                    <div className="cp-tw">
                      {late ? <span className="late">{tr('taskDue.overdue', { date: t.due ? fmtDue(t.due, locale) : '' })}</span> : t.due ? (done ? tr('taskDue.doneOn', { date: fmtDue(t.due, locale) }) : tr('taskDue.dueOn', { date: fmtDue(t.due, locale) })) : tr('common.noDate')}
                      {t.projectName ? ` · ${t.projectName}` : ''}
                    </div>
                  </div>
                  <span className={`cp-tpill ${cls}`}>{tr(`taskState.${cls}`)}</span>
                </div>
              );
            })}
            {!myTasks.length && <div className="cp-empty">{tr('home.tasksEmpty')}</div>}
            {myTasks.length > 0 && <div className="cp-hint">{tr('home.tasksHint')}</div>}
          </div>

          <div className="cp-glass cp-rb" id="cp-t-reuniones" style={{ '--d': '.48s' } as CSSProperties}>
            <div className="cp-ghead">
              <span className="cp-ttl">{tr('home.meetingsTitle')} <span>{tr('home.meetingsSummaries')}</span></span>
              <Link className="cp-seeall" href="/portal/reuniones">{tr('home.seeAll')}</Link>
            </div>
            {meetings.map((m) => (
              <Link className="cp-meet cp-meet-link" key={m.id} href={`/portal/reuniones/${m.id}`}>
                <div className="cp-mh"><span className="cp-mt">{m.title}</span><span className="cp-md">{m.dateLabel}</span></div>
                {m.summary ? (
                  <div className="cp-ms">{m.summary}</div>
                ) : (
                  <div className="cp-ms" style={{ fontStyle: 'italic' }}>{tr('common.summaryAfterMeeting')}</div>
                )}
                {m.attendees.length > 0 && (
                  <div className="cp-who">{m.attendees.map((a, i) => <Av key={i} initials={a.initials} color={a.color} size={18} />)}</div>
                )}
                <span className="cp-meet-go">{tr('common.openMeeting')}</span>
              </Link>
            ))}
            {!meetings.length && <div className="cp-empty">{tr('home.meetingsEmpty')}</div>}
          </div>

        </div>
      </div>

      <PortalTour autoStart={showTour} />

      {/* ── drawer: brief del proyecto + sus tareas (lectura; las tuyas, marcables) ── */}
      {open && (
        <>
          <div className={`cp-scrim ${drawerClosing ? 'closing' : ''}`} onClick={closeDrawer} />
          <div className={`cp-sheet ${drawerClosing ? 'closing' : ''}`}>
            <div className="cp-shead">
              <div className="cp-stop"><span className="cp-sl">{showTasks ? tr('home.drawer.tasksTitle') : tr('home.drawer.briefTitle')}</span><button className="cp-x" onClick={closeDrawer}>×</button></div>
              <h3>{open.name}</h3>
              <div className="cp-sm">
                {tr('home.drawer.summary', { done: openDone, total: open.tasks.length })}{openLate ? <> · <b>{tr('home.drawer.overdueCount', { count: openLate })}</b></> : null}
              </div>
            </div>
            {showTasks ? (
              <div className="cp-slist">
                {open.tasks.map((t) => {
                  const done = isDone(t);
                  const late = overdue(t, done);
                  const cls = done ? 'done' : late ? 'late' : taskState(t).cls;
                  return (
                    <div className={`cp-task ${done ? 'done' : ''}`} key={t.id}>
                      <button className="cp-ck" disabled={!t.mine} onClick={() => toggle(t)} title={t.mine ? tr('common.toggle') : tr('common.notYours')}>
                        {done ? '✓' : ''}
                      </button>
                      <div className="cp-tb">
                        <div className="cp-tt">{t.title}</div>
                        <div className="cp-tw">
                          {t.assignee ? `${t.assignee.name} · ` : ''}
                          {late ? <span className="late">{tr('taskDue.overdue', { date: t.due ? fmtDue(t.due, locale) : '' })}</span> : t.due ? fmtDue(t.due, locale) : tr('common.noDate')}
                        </div>
                      </div>
                      <span className={`cp-tpill ${cls}`}>{tr(`taskState.${cls}`)}</span>
                    </div>
                  );
                })}
                {!open.tasks.length && <div className="cp-empty">{tr('home.drawer.tasksEmpty')}</div>}
              </div>
            ) : (
              <div className="cp-brief">
                {briefLoading ? <BriefSkeleton /> : <Brief blocks={brief ?? []} />}
              </div>
            )}
            {(!showTasks || !briefEmpty) && (
              <div className="cp-sfoot">
                {showTasks ? (
                  <button className="cp-sbtn ghost" onClick={() => setSheetTasks(false)}>{tr('home.drawer.backToBrief')}</button>
                ) : (
                  <button className="cp-sbtn" onClick={() => setSheetTasks(true)}>
                    {tr('home.drawer.viewTasks', { done: openDone, total: open.tasks.length })}
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
        const cls = done ? 'done' : late ? 'late' : taskState(t).cls;
        const body = taskBodies[t.id]?.blocks;
        return (
          <>
            <div className={`cp-scrim ${modalClosing ? 'closing' : ''}`} style={{ zIndex: 70 }} onClick={closeTask} />
            <div className="cp-tm-wrap" onClick={closeTask}>
              <div className={`cp-tm ${modalClosing ? 'closing' : ''}`} onClick={(e) => e.stopPropagation()}>
                <div className="cp-tmh"><span className="cp-tmp">{taskOpen.projectName ?? ''}</span><button className="cp-x" onClick={closeTask}>×</button></div>
                <div className="cp-tmt">{t.title}</div>
                <div className="cp-tmm">
                  {t.assignee && <span><Av initials={t.assignee.initials} color={t.assignee.color} size={20} />{t.assignee.name}</span>}
                  <span className={late ? 'late' : ''}>{late ? '⚠ ' : ''}{t.due ? fmtFull(t.due, locale) : tr('common.noDate')}</span>
                  <span className={`cp-tpill ${cls}`}>{tr(`taskState.${cls}`)}</span>
                </div>
                {body === undefined ? (
                  <div className="cp-tmb"><BriefSkeleton /></div>
                ) : body.length > 0 ? (
                  <div className="cp-tmb"><Brief blocks={body} /></div>
                ) : null}
              </div>
            </div>
          </>
        );
      })()}

    </main>
  );
}
