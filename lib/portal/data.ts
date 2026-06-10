// ── Portal del cliente · capa de datos aislada ──────────────────────────────
// Lee el mismo workspace de Notion pero con parsing defensivo propio (sin los
// zod estrictos del hub interno): si Notion agrega un status nuevo, el portal
// no se cae. Todo queda scopeado al customer del contexto — esa es la frontera.
import { getNotion } from '@/lib/notion/client';
import { serverEnv } from '@/lib/env';
import type { AppContext } from '@/lib/auth/context';

export type DeckHealth = 'track' | 'risk' | 'off' | 'block';

export interface PortalAssignee {
  name: string;
  initials: string;
  color: string;
}

export interface PortalTask {
  id: string;
  title: string;
  due: string | null; // ISO
  done: boolean;
  status: string;
  assignee: PortalAssignee | null;
  mine: boolean; // asignada al miembro logueado → puede marcarla
  projectName?: string;
}

export interface PortalProject {
  id: string;
  name: string;
  subtitle: string;
  pct: number;
  deckHealth: DeckHealth;
  healthDetail: string; // la razón (Health Description)
  pill: string;
  start: string;
  end: string | null;
  startLabel: string;
  endLabel: string;
  tasks: PortalTask[];
}

export interface PortalMeeting {
  id: string;
  title: string;
  dateLabel: string;
  summary: string | null;
  attendees: PortalAssignee[];
}

export interface PortalData {
  firstName: string;
  memberName: string;
  customerName: string;
  customerLogo: string | null;
  monthLabel: string;
  projects: PortalProject[];
  myTasks: PortalTask[];
  meetings: PortalMeeting[];
}

export const TODAY = new Date().toISOString().slice(0, 10);
const TODAY_MS = Date.parse(TODAY + 'T00:00:00Z');
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_FULL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const PALETTE = ['#3D5240', '#647A66', '#4A5C6B', '#9E6B23', '#7E9A80', '#8C8377', '#2A3B2D', '#5C544A'];

// Notion puede traer fecha sola ("2026-05-04") o con hora ("2026-06-08T20:30:00.000+08:00");
// nos quedamos con el día calendario tal como se ve en Notion
const dateOnly = (iso: string) => iso.slice(0, 10);
const ms = (iso: string) => Date.parse(dateOnly(iso) + 'T00:00:00Z');
const dayMonth = (iso: string) => {
  const d = new Date(dateOnly(iso) + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MES[d.getUTCMonth()]}`;
};

export function colorFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '–';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
const DONE_STATUSES = new Set(['Done', 'Archived']);
/** estados de Notion que significan "alguien está trabajando en esto ahora" */
export const RUNNING_STATUSES = ['In Progress', 'Running', 'Testing', 'In Review', 'PR Open'];

function pillFromStatus(s: string | null): string {
  switch (s) {
    case 'In Progress': return 'en curso';
    case 'Paused': return 'en pausa';
    case 'Planning': case 'Backlog': return 'arrancando';
    default: return (s ?? 'en curso').toLowerCase();
  }
}

// pagina una data source completa (parsing defensivo, sin zod)
export async function queryAllRaw(dataSourceId: string, filter?: unknown, sorts?: unknown): Promise<any[]> {
  const notion = getNotion();
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.dataSources.query({
      data_source_id: dataSourceId,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      ...(cursor ? { start_cursor: cursor } : {}),
      page_size: 100,
    } as any);
    out.push(...res.results.filter((r: any) => 'properties' in r));
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

export interface MemberLite { id: string; name: string }

export function parseTaskRow(row: any, teamById: Map<string, MemberLite>, memberId: string): PortalTask {
  const p = row.properties;
  const status: string = p.Status?.status?.name ?? 'Not Started';
  const teamIds: string[] = (p.Team?.relation ?? []).map((r: any) => r.id);
  let assignee: PortalAssignee | null = null;
  const first = teamIds.length ? teamById.get(teamIds[0]!) : undefined;
  if (first) assignee = { name: first.name, initials: initialsOf(first.name), color: colorFor(first.name) };
  if (!assignee) {
    const ppl = p.Assignee?.people ?? [];
    if (ppl[0]?.name) assignee = { name: ppl[0].name, initials: initialsOf(ppl[0].name), color: colorFor(ppl[0].name) };
  }
  return {
    id: row.id,
    title: p['Task name']?.title?.[0]?.plain_text ?? '',
    due: p.Due?.date?.start ? dateOnly(p.Due.date.start) : null,
    done: DONE_STATUSES.has(status),
    status,
    assignee,
    mine: teamIds.includes(memberId),
  };
}

function buildProject(row: any, tasks: PortalTask[]): PortalProject {
  const p = row.properties;
  const statusName: string | null = p.Status?.status?.name ?? null;
  const completion = typeof p.Completion?.rollup?.number === 'number' ? p.Completion.rollup.number : null;
  const start: string | null = p.Dates?.date?.start ? dateOnly(p.Dates.date.start) : null;
  const end: string | null = p.Dates?.date?.end ? dateOnly(p.Dates.date.end) : null;

  const total = tasks.length;
  const doneN = tasks.filter((t) => t.done).length;
  const pct = completion != null ? Math.round(completion * 100) : total ? Math.round((doneN / total) * 100) : 0;

  const paused = statusName === 'Paused';
  const overdue = tasks.some((t) => !t.done && t.due && ms(t.due) < TODAY_MS);
  const healthSel: string | null = p.Health?.select?.name ?? null;
  const healthKey: DeckHealth | null = !healthSel
    ? null
    : healthSel.includes('On track') ? 'track'
      : healthSel.includes('Blocked') ? 'block'
      : healthSel.includes('Off track') ? 'off'
      : healthSel.includes('At risk') ? 'risk'
      : null;
  const deckHealth: DeckHealth = healthKey ?? (paused ? 'block' : overdue ? 'off' : 'track');
  const healthDetail = ((p['Health Description']?.rich_text ?? []) as any[])
    .map((t) => t.plain_text)
    .join('')
    .trim();

  return {
    id: row.id,
    name: p['Project name']?.title?.[0]?.plain_text ?? '(sin nombre)',
    subtitle: p.Summary?.rich_text?.[0]?.plain_text ?? '',
    pct,
    deckHealth,
    healthDetail,
    pill: pillFromStatus(statusName),
    start: start ?? TODAY,
    end,
    startLabel: start ? dayMonth(start) : '—',
    endLabel: end ? `${dayMonth(end)} · entrega` : '— · sin fecha',
    tasks,
  };
}

const HEALTH_ORDER: Record<DeckHealth, number> = { off: 0, risk: 1, block: 2, track: 3 };

export async function loadPortalData(ctx: AppContext): Promise<PortalData> {
  // equipo completo (para nombres de asignados) — la base es pequeña
  const teamRows = await queryAllRaw(serverEnv.NOTION_DB_TEAM);
  const teamById = new Map<string, MemberLite>(
    teamRows.map((r: any) => [r.id, { id: r.id, name: r.properties.Name?.title?.[0]?.plain_text ?? '' }]),
  );

  const [projRows, myTaskRows, meetingRows] = await Promise.all([
    queryAllRaw(serverEnv.NOTION_DB_PROJECTS, {
      property: 'Customer',
      relation: { contains: ctx.customerId },
    }),
    queryAllRaw(serverEnv.NOTION_DB_TASKS, {
      and: [
        { property: 'Customer', relation: { contains: ctx.customerId } },
        { property: 'Team', relation: { contains: ctx.memberId } },
      ],
    }),
    queryAllRaw(
      serverEnv.NOTION_DB_MEETINGS,
      {
        and: [
          { property: 'Customer', relation: { contains: ctx.customerId } },
          { property: 'Team', relation: { contains: ctx.memberId } },
        ],
      },
      [{ timestamp: 'created_time', direction: 'descending' }],
    ),
  ]);

  // proyectos visibles para el cliente: en curso y en pausa
  const visible = projRows.filter((r: any) => {
    const s = r.properties.Status?.status?.name ?? null;
    return s === 'In Progress' || s === 'Paused';
  });
  const projects = await Promise.all(
    visible.map(async (row: any) => {
      const taskRows = await queryAllRaw(serverEnv.NOTION_DB_TASKS, {
        property: 'Project',
        relation: { contains: row.id },
      });
      return buildProject(row, taskRows.map((t: any) => parseTaskRow(t, teamById, ctx.memberId)));
    }),
  );
  projects.sort(
    (a, b) => HEALTH_ORDER[a.deckHealth] - HEALTH_ORDER[b.deckHealth] || ms(a.start) - ms(b.start),
  );

  const projNameById = new Map(projRows.map((r: any) => [r.id, r.properties['Project name']?.title?.[0]?.plain_text ?? '']));

  // sus tareas: abiertas primero (atrasadas arriba), + hasta 2 listas recientes
  const allMine = myTaskRows.map((t: any) => {
    const task = parseTaskRow(t, teamById, ctx.memberId);
    const projId = t.properties.Project?.relation?.[0]?.id ?? null;
    task.projectName = projId ? projNameById.get(projId) || undefined : undefined;
    return task;
  });
  const open = allMine
    .filter((t) => !t.done)
    .sort((a, b) => {
      const ao = a.due && ms(a.due) < TODAY_MS ? 0 : 1;
      const bo = b.due && ms(b.due) < TODAY_MS ? 0 : 1;
      return ao - bo || (a.due ? ms(a.due) : Infinity) - (b.due ? ms(b.due) : Infinity);
    });
  const recentDone = allMine
    .filter((t) => t.done)
    .sort((a, b) => (b.due ? ms(b.due) : 0) - (a.due ? ms(a.due) : 0))
    .slice(0, 2);
  const myTasks = [...open, ...recentDone];

  // reuniones donde asistió (fallback: las del cliente) con resumen
  let meetRows = meetingRows;
  if (!meetRows.length) {
    meetRows = await queryAllRaw(
      serverEnv.NOTION_DB_MEETINGS,
      { property: 'Customer', relation: { contains: ctx.customerId } },
      [{ timestamp: 'created_time', direction: 'descending' }],
    );
  }
  const meetings: PortalMeeting[] = meetRows.slice(0, 4).map((r: any) => {
    const p = r.properties;
    const date: string | null = p.Date?.date?.start ?? null;
    const summary =
      ((p.Summary?.rich_text ?? []) as any[]).map((t) => t.plain_text).join('').trim() || null;
    const attendees: PortalAssignee[] = ((p.Team?.relation ?? []) as any[])
      .map((rel) => teamById.get(rel.id))
      .filter((m): m is MemberLite => Boolean(m))
      .slice(0, 4)
      .map((m) => ({ name: m.name, initials: initialsOf(m.name), color: colorFor(m.name) }));
    return {
      id: r.id,
      title: p.Name?.title?.[0]?.plain_text ?? 'Reunión',
      dateLabel: date ? dayMonth(date) : '',
      summary,
      attendees,
    };
  });

  const now = new Date();
  return {
    firstName: ctx.memberName.split(/\s+/)[0] ?? ctx.memberName,
    memberName: ctx.memberName,
    customerName: ctx.customerName,
    customerLogo: ctx.customerLogo,
    monthLabel: `${MES_FULL[now.getMonth()]} ${now.getFullYear()}`,
    projects,
    myTasks,
    meetings,
  };
}

// ── geometría de la línea de tiempo (viewBox 0..360, eje 10..350) ───────────
const AX0 = 10;
const AX1 = 350;
const SPAN = AX1 - AX0;
const DAY = 86_400_000;

export type DotState = 'done' | 'overdue' | 'active' | 'upcoming';
export interface Dot { x: number; state: DotState }
export interface TimelineGeom {
  progressX: number;
  todayX: number;
  dots: Dot[];
  pausedFromX: number | null;
}

export function timelineGeom(p: PortalProject): TimelineGeom {
  const start = ms(p.start);
  const end = p.end ? ms(p.end) : ms(TODAY) + 75 * DAY;
  const span = Math.max(end - start, DAY);
  const xFor = (t: number) => Math.max(AX0, Math.min(AX1, AX0 + ((t - start) / span) * SPAN));
  const todayX = xFor(TODAY_MS);
  const progressX = AX0 + (p.pct / 100) * SPAN;
  const dots: Dot[] = p.tasks.map((t) => {
    const due = t.due ? ms(t.due) : end;
    const state: DotState = t.done
      ? 'done'
      : due < TODAY_MS
        ? 'overdue'
        : RUNNING_STATUSES.includes(t.status)
          ? 'active'
          : 'upcoming';
    return { x: xFor(due), state };
  });
  return { progressX, todayX, dots, pausedFromX: p.pill === 'en pausa' ? progressX : null };
}
