// ── Portal del cliente · reuniones ──────────────────────────────────────────
// La página editorial de una reunión y el índice. Misma filosofía que data.ts:
// parsing defensivo, todo scopeado al customer del contexto.
//
// Frontera de contenido (spec 2026-06-10):
//  - el bloque `transcription` jamás se expone
//  - la sección "Acciones" del acta (texto interno de Refining/triage) se omite;
//    la reemplazan los acuerdos reales (las Tasks vinculadas, filtradas al customer)
import { getNotion } from '@/lib/notion/client';
import { serverEnv } from '@/lib/env';
import type { AppContext } from '@/lib/auth/context';
import { meetingDateLabels, portalDict, type PortalLocale } from './i18n';
import {
  queryAllRaw,
  parseTaskRow,
  initialsOf,
  colorFor,
  type MemberLite,
  type PortalAssignee,
  type PortalTask,
} from './data';

export { meetingDateLabels } from './i18n';

export interface ActaBlock {
  kind: 'h2' | 'h3' | 'p' | 'li' | 'oli';
  text: string;
}

export interface PortalMeetingSummary {
  id: string;
  title: string;
  type: string | null;
  dateLabel: string; // "8 jun" — para listas
  fullDateLabel: string; // "lunes 8 de junio · 8:30 pm"
  summary: string | null;
  attendees: PortalAssignee[];
}

export interface PortalMeeting extends PortalMeetingSummary {
  acta: ActaBlock[];
  acuerdos: PortalTask[];
}

const richText = (block: any, type: string): string =>
  ((block[type]?.rich_text ?? []) as any[]).map((t) => t.plain_text).join('').trim();

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const ACCIONES = new Set(['acciones', 'action items', 'actions', 'proximos pasos', 'next steps']);

const KIND_OF: Record<string, ActaBlock['kind']> = {
  heading_2: 'h2',
  heading_3: 'h3',
  paragraph: 'p',
  bulleted_list_item: 'li',
  numbered_list_item: 'oli',
};
const HEADING_LEVEL: Record<string, number> = { heading_1: 1, heading_2: 2, heading_3: 3 };

/**
 * Convierte los bloques top-level del acta en el modelo de render del portal.
 * Excluye `transcription`, la sección "Acciones" (heading + todo lo que le
 * sigue hasta un heading de nivel igual o superior) y tipos no soportados.
 */
export function parseActaBlocks(blocks: any[]): ActaBlock[] {
  const out: ActaBlock[] = [];
  let skipBelow: number | null = null; // nivel del heading "Acciones" que estamos saltando

  for (const b of blocks) {
    const type: string = b?.type ?? '';
    if (type === 'transcription') continue;

    const level = HEADING_LEVEL[type];
    if (level) {
      const text = richText(b, type);
      if (skipBelow !== null && level <= skipBelow) skipBelow = null; // salió de la sección
      if (ACCIONES.has(norm(text))) {
        skipBelow = level;
        continue;
      }
      if (skipBelow !== null) continue;
      const kind = KIND_OF[type];
      if (kind && text) out.push({ kind, text });
      continue;
    }

    if (skipBelow !== null) continue;
    const kind = KIND_OF[type];
    if (!kind) continue;
    const text = richText(b, type);
    if (text) out.push({ kind, text });
  }
  return out;
}

async function teamMap(): Promise<Map<string, MemberLite>> {
  const rows = await queryAllRaw(serverEnv.NOTION_DB_TEAM);
  return new Map(rows.map((r: any) => [r.id, { id: r.id, name: r.properties.Name?.title?.[0]?.plain_text ?? '' }]));
}

function attendeesOf(row: any, teamById: Map<string, MemberLite>): PortalAssignee[] {
  return ((row.properties.Team?.relation ?? []) as any[])
    .map((rel) => teamById.get(rel.id))
    .filter((m): m is MemberLite => Boolean(m))
    .map((m) => ({ name: m.name, initials: initialsOf(m.name), color: colorFor(m.name) }));
}

function parseMeetingRow(
  row: any,
  teamById: Map<string, MemberLite>,
  locale: PortalLocale,
): PortalMeetingSummary {
  const p = row.properties;
  const labels = meetingDateLabels(p.Date?.date?.start ?? null, locale);
  return {
    id: row.id,
    title: p.Name?.title?.[0]?.plain_text ?? portalDict(locale).meetingDefaultTitle,
    type: p['Meeting type']?.select?.name ?? null,
    ...labels,
    summary:
      ((p.Summary?.rich_text ?? []) as any[]).map((t: any) => t.plain_text).join('').trim() || null,
    attendees: attendeesOf(row, teamById),
  };
}

/** Índice: todas las reuniones del customer, más recientes primero. */
export async function loadPortalMeetings(
  ctx: AppContext,
  locale: PortalLocale = 'es',
): Promise<PortalMeetingSummary[]> {
  const [teamById, rows] = await Promise.all([
    teamMap(),
    queryAllRaw(
      serverEnv.NOTION_DB_MEETINGS,
      { property: 'Customer', relation: { contains: ctx.customerId } },
      [{ property: 'Date', direction: 'descending' }],
    ),
  ]);
  return rows.map((r: any) => parseMeetingRow(r, teamById, locale));
}

const MAX_ACUERDOS = 20;

/**
 * La reunión completa para la página editorial. Gate de seguridad: solo si la
 * relación Customer contiene el customer del contexto; si no, null → 404.
 */
export async function loadPortalMeeting(
  ctx: AppContext,
  meetingId: string,
  locale: PortalLocale = 'es',
): Promise<PortalMeeting | null> {
  const notion = getNotion();
  let page: any;
  try {
    page = await notion.pages.retrieve({ page_id: meetingId });
  } catch {
    return null;
  }
  if (!page || !('properties' in page)) return null;

  const customerIds: string[] = (page.properties.Customer?.relation ?? []).map((r: any) => r.id);
  if (!customerIds.includes(ctx.customerId)) return null;

  const taskIds: string[] = (page.properties.Tasks?.relation ?? [])
    .map((r: any) => r.id)
    .slice(0, MAX_ACUERDOS);

  const [teamById, blocks, taskPages] = await Promise.all([
    teamMap(),
    listAllBlocks(meetingId),
    Promise.all(taskIds.map((id) => notion.pages.retrieve({ page_id: id }).catch(() => null))),
  ]);

  // acuerdos: solo tareas del customer del cliente (frontera dura)
  const acuerdos = taskPages
    .filter((t: any): t is any => Boolean(t) && 'properties' in t)
    .filter((t: any) =>
      ((t.properties.Customer?.relation ?? []) as any[]).some((r) => r.id === ctx.customerId),
    )
    .map((t: any) => parseTaskRow(t, teamById, ctx.memberId));

  return {
    ...parseMeetingRow(page, teamById, locale),
    acta: parseActaBlocks(blocks),
    acuerdos,
  };
}

async function listAllBlocks(pageId: string): Promise<any[]> {
  const notion = getNotion();
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}
