'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { TODAY, RUNNING_STATUSES, type TimelineGeom, type PortalTask } from '@/lib/portal/data';

const CHECK = 'M-2.3 0 l1.5 1.7 l3 -3.4';
const TODAY_MS = Date.parse(TODAY + 'T00:00:00Z');
const fmtDue = (iso: string) =>
  new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(iso + 'T00:00:00Z'),
  );

export function taskState(t: PortalTask): { label: string; cls: string } {
  if (t.done) return { label: 'lista', cls: 'done' };
  if (t.due && Date.parse(t.due + 'T00:00:00Z') < TODAY_MS) return { label: 'atrasada', cls: 'late' };
  if (RUNNING_STATUSES.includes(t.status)) return { label: 'en progreso', cls: 'run' };
  return { label: 'por venir', cls: 'todo' };
}

// Línea de temporalidad: recta = el tiempo del proyecto; puntos = tareas según
// su fecha (✓ lista · roja atrasada · moss latiendo en progreso · hueca por venir);
// línea roja = hoy.
// Hover en un punto = tooltip (portal); clic = abre la tarea.
export function PortalTimeline({
  geom,
  tasks,
  drawDelay = 0.4,
  onTaskClick,
}: {
  geom: TimelineGeom;
  tasks?: PortalTask[];
  drawDelay?: number;
  onTaskClick?: (t: PortalTask) => void;
}) {
  const { progressX, todayX, dots, pausedFromX } = geom;
  const mossLen = Math.max(0, progressX - 10);
  const [tip, setTip] = useState<{ i: number; x: number; y: number } | null>(null);
  const ht = tip != null ? tasks?.[tip.i] : null;

  return (
    <svg viewBox="0 0 360 28" style={{ display: 'block', width: '100%', maxWidth: 384, height: 'auto' }}>
      <line x1={10} y1={14} x2={350} y2={14} stroke="#D4CCBC" strokeWidth={1.5} strokeLinecap="round" />
      <line
        x1={10} y1={14} x2={progressX} y2={14}
        stroke="#3D5240" strokeWidth={1.5} strokeLinecap="round"
        strokeDasharray={mossLen} strokeDashoffset={mossLen}
        style={{ animation: `cp-draw 1.2s var(--cp-ease) ${drawDelay}s forwards` }}
      />
      {pausedFromX !== null && (
        <line x1={pausedFromX} y1={14} x2={todayX} y2={14} stroke="#9E6B23" strokeWidth={1.5}
          strokeLinecap="round" strokeDasharray="2 4" opacity={0.7} />
      )}
      <line x1={todayX} y1={4} x2={todayX} y2={24} stroke="#8C2E2E" strokeWidth={1.4} strokeLinecap="round" opacity={0.85} />
      <circle cx={todayX} cy={3} r={1.6} fill="#8C2E2E" />
      {dots.map((d, i) => {
        const on = tip?.i === i;
        return (
          <g
            key={i}
            transform={`translate(${d.x},14)`}
            style={{ cursor: tasks ? 'pointer' : 'default' }}
            onMouseEnter={(e) => tasks && setTip({ i, x: e.clientX, y: e.clientY })}
            onMouseMove={(e) => tasks && setTip((t) => (t ? { ...t, x: e.clientX, y: e.clientY } : { i, x: e.clientX, y: e.clientY }))}
            onMouseLeave={() => setTip(null)}
            onClick={(e) => {
              if (tasks?.[i] && onTaskClick) {
                e.stopPropagation();
                onTaskClick(tasks[i]!);
              }
            }}
          >
            {tasks && <circle r={11} fill="transparent" />}
            {d.state === 'done' && (
              <>
                <circle r={on ? 6 : 5} fill="#3D5240" style={{ transition: 'r .15s' }} />
                <path d={CHECK} fill="none" stroke="#F7F3EA" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
              </>
            )}
            {d.state === 'overdue' && (
              <>
                <circle className="cp-lring" r={5} fill="none" stroke="#8C2E2E" />
                <circle r={on ? 6 : 5} fill="#8C2E2E" style={{ transition: 'r .15s' }} />
                <circle r={1.6} fill="#F7F3EA" />
              </>
            )}
            {d.state === 'active' && (
              <>
                <circle className="cp-lring" r={5} fill="none" stroke="#7E9A80" />
                <circle r={on ? 5.5 : 4.5} fill="#F7F3EA" stroke="#3D5240" strokeWidth={1.4} style={{ transition: 'r .15s' }} />
                <circle r={2} fill="#3D5240" />
              </>
            )}
            {d.state === 'upcoming' && (
              <circle r={on ? 5.5 : 4.5} fill="#EFEAE0" stroke={on ? '#8C8377' : '#C7BFAF'} strokeWidth={1.3} style={{ transition: 'r .15s' }} />
            )}
          </g>
        );
      })}
      {ht && typeof document !== 'undefined' &&
        createPortal(
          <div className="cp-tip" style={{ left: tip!.x, top: tip!.y - 14 }}>
            <div className="nm">{ht.title}</div>
            <div className="mt">
              {ht.assignee ? `${ht.assignee.name} · ` : ''}
              {ht.due ? fmtDue(ht.due) : 'sin fecha'}
              <span className={`st ${taskState(ht).cls}`}>{taskState(ht).label}</span>
            </div>
          </div>,
          document.body,
        )}
    </svg>
  );
}
