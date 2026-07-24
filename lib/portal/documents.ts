// ── Portal del cliente · documentos (la cápsula) ────────────────────────────
// El catálogo de documentos del cliente: propuesta (Wiki con categoría
// Proposal), usuarios de prueba (Test Users) y costos de infraestructura
// (Finance con Type = Infrastructure). El dato manda y la UI obedece: cada
// fuente degrada en silencio — si la base no responde o no hay filas, ese
// chip simplemente no existe. Todo queda scopeado al customer del contexto.
import { getNotion } from '@/lib/notion/client';
import { serverEnv } from '@/lib/env';
import { queryAllRaw } from './data';
import { money } from './payments';
import { parseProjectBlocks, type ProjectBlock } from './content';
import { findInfraStack, type InfraStackDef } from './infra-stacks';
import { docFilesForCustomer } from './doc-files';
import { portalDict, dayMonthLabel, pick, type PortalLocale } from './i18n';
import type { AppContext } from '@/lib/auth/context';

// La propuesta tiene dos fuentes: un archivo privado del repo (microsite
// rico → abre el visor /portal/docs/[slug]) o un doc de Wiki con categoría
// Proposal (→ modal de bloques). El archivo manda si existe.
export type PortalProposal =
  | { kind: 'file'; slug: string; title: string; chipState: string; meta?: string; hasPdf?: boolean }
  | { kind: 'wiki'; id: string; title: string; dateLabel: string | null };

export interface PortalTestUser {
  id: string;
  nombre: string;
  usuario: string;
  clave: string;
  url: string | null;
  host: string | null; // "dev.amedisalud.com" — para mostrar sin el https://
}

export interface PortalInfraItem {
  id: string;
  name: string;
  detail: string | null;
  monthly: number; // normalizado a mensual según Frequency
  monthlyLabel: string;
}

// El simulador: matriz precalculada en el server ("¿y si llegamos a X usuarios?")
export interface PortalInfraSim {
  stops: number[]; // usuarios activos por escalón; el primero es "hoy"
  items: { name: string; detail: string | null; info: string | null; byStop: number[]; labelByStop: string[]; group: string | null }[];
  totalByStop: number[];
  totalLabelByStop: string[];
  yearlyLabelByStop: string[];
}

export interface PortalInfra {
  items: PortalInfraItem[];
  monthlyLabel: string;
  yearlyLabel: string;
  sim: PortalInfraSim | null; // null = lista plana desde Finance (sin slider)
}

export interface PortalDocuments {
  proposal: PortalProposal | null;
  testUsers: PortalTestUser[];
  infra: PortalInfra | null;
}

const plain = (prop: any): string =>
  ((prop?.rich_text ?? []) as any[]).map((t) => t.plain_text).join('').trim();

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return null;
  }
}

// ── propuesta ────────────────────────────────────────────────────────────────
function parseProposalRow(row: any, locale: PortalLocale = 'es'): PortalProposal {
  const p = row.properties as Record<string, any>;
  return {
    kind: 'wiki',
    id: row.id,
    title: p['Doc name']?.title?.[0]?.plain_text ?? portalDict(locale).proposalDefaultTitle,
    dateLabel: row.last_edited_time ? dayMonthLabel(row.last_edited_time, locale) : null,
  };
}

async function findProposalRow(ctx: AppContext): Promise<any | null> {
  const rows = await queryAllRaw(
    serverEnv.NOTION_DB_WIKI,
    {
      and: [
        { property: 'Customer', relation: { contains: ctx.customerId } },
        { property: 'Category', multi_select: { contains: 'Proposal' } },
      ],
    },
    [{ timestamp: 'last_edited_time', direction: 'descending' }],
  );
  return rows[0] ?? null;
}

/**
 * El contenido de la propuesta (misma frontera de bloques que el brief del
 * proyecto: subset seguro, secciones "Interno" omitidas). El gate por
 * Customer vive en el query — solo se busca dentro del cliente del contexto.
 */
export async function loadProposalContent(
  ctx: AppContext,
  locale: PortalLocale = 'es',
): Promise<{ title: string; blocks: ProjectBlock[] } | null> {
  const row = await findProposalRow(ctx);
  if (!row) return null;

  const notion = getNotion();
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: row.id,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return { title: parseProposalRow(row, locale).title, blocks: parseProjectBlocks(blocks) };
}

// ── usuarios de prueba ───────────────────────────────────────────────────────
export function parseTestUserRow(row: any, locale: PortalLocale = 'es'): PortalTestUser {
  const p = row.properties as Record<string, any>;
  const url: string | null = p.URL?.url ?? null;
  return {
    id: row.id,
    nombre: p.Nombre?.title?.[0]?.plain_text ?? portalDict(locale).testUserDefaultName,
    usuario: plain(p.Usuario),
    clave: plain(p.Clave),
    url,
    host: hostOf(url),
  };
}

// ── infraestructura ──────────────────────────────────────────────────────────
// Frequency normaliza a mensual; un movimiento sin frecuencia se asume mensual.
export function monthlyOf(amount: number, frequency: string | null): number {
  switch (frequency) {
    case 'Yearly': return amount / 12;
    case 'Quarterly': return amount / 3;
    default: return amount;
  }
}

export function parseInfraRow(row: any, locale: PortalLocale = 'es'): PortalInfraItem {
  const p = row.properties as Record<string, any>;
  const titleProp = p.Description?.title
    ? p.Description
    : (Object.values(p).find((v: any) => v?.type === 'title') as any);
  const amount: number = typeof p.Amount?.number === 'number' ? p.Amount.number : 0;
  const monthly = monthlyOf(amount, p.Frequency?.select?.name ?? null);
  return {
    id: row.id,
    name:
      ((titleProp?.title ?? []) as any[]).map((t) => t.plain_text).join('') ||
      portalDict(locale).infraServiceDefaultName,
    detail: plain(p.Notes) || null,
    monthly,
    monthlyLabel: money(Math.round(monthly * 100) / 100),
  };
}

function buildInfra(rows: any[], locale: PortalLocale = 'es'): PortalInfra | null {
  const items = rows
    .filter((r: any) => {
      const s = r.properties?.Status?.status?.name ?? r.properties?.Status?.select?.name ?? null;
      return s !== 'Canceled';
    })
    .map((r) => parseInfraRow(r, locale))
    .sort((a, b) => b.monthly - a.monthly);
  if (!items.length) return null;
  const total = items.reduce((s, i) => s + i.monthly, 0);
  return {
    items,
    monthlyLabel: money(Math.round(total * 100) / 100),
    yearlyLabel: money(Math.round(total * 12)),
    sim: null,
  };
}

const cents = (n: number) => Math.round(n * 100) / 100;

/** Construye el run-rate (en el baseline) + la matriz del simulador. */
export function buildInfraFromStack(stack: InfraStackDef, locale: PortalLocale = 'es'): PortalInfra {
  const stops = stack.stops.includes(stack.baselineUsers)
    ? stack.stops
    : [stack.baselineUsers, ...stack.stops];

  const simItems = stack.services
    .map((s) => {
      const byStop = stops.map((u) => cents(s.monthlyAt(u)));
      return {
        name: pick(s.name, locale),
        detail: pick(s.detail, locale) || null,
        info: s.info != null ? pick(s.info, locale) : null,
        byStop,
        labelByStop: byStop.map((m) => money(m)),
        group: s.group != null ? pick(s.group, locale) : null,
      };
    })
    .sort((a, b) => b.byStop[0]! - a.byStop[0]!);

  const totalByStop = stops.map((_, i) =>
    cents(simItems.reduce((sum, s) => sum + s.byStop[i]!, 0)),
  );

  return {
    items: simItems.map((s, idx) => ({
      id: `stack-${idx}`,
      name: s.name,
      detail: s.detail,
      monthly: s.byStop[0]!,
      monthlyLabel: s.labelByStop[0]!,
    })),
    monthlyLabel: money(totalByStop[0]!),
    yearlyLabel: money(Math.round(totalByStop[0]! * 12)),
    sim: {
      stops,
      items: simItems,
      totalByStop,
      totalLabelByStop: totalByStop.map((t) => money(t)),
      yearlyLabelByStop: totalByStop.map((t) => money(Math.round(t * 12))),
    },
  };
}

// ── catálogo ─────────────────────────────────────────────────────────────────
export async function loadPortalDocuments(
  ctx: AppContext,
  locale: PortalLocale = 'es',
): Promise<PortalDocuments> {
  // archivo privado del repo primero (microsite rico); Wiki como respaldo
  const fileDoc = ctx.customerName ? docFilesForCustomer(ctx.customerName)[0] : undefined;

  const [proposal, testUsers, infra] = await Promise.all([
    fileDoc
      ? Promise.resolve<PortalProposal>({
          kind: 'file',
          slug: fileDoc.slug,
          title: fileDoc.title,
          chipState: fileDoc.chipState,
          meta: fileDoc.meta,
          hasPdf: Boolean(fileDoc.pdf),
        })
      : findProposalRow(ctx)
          .then((row) => (row ? parseProposalRow(row, locale) : null))
          .catch((e) => {
            console.error('[portal] proposal lookup failed', e);
            return null;
          }),
    queryAllRaw(
      serverEnv.NOTION_DB_TEST_USERS,
      {
        and: [
          { property: 'Customers', relation: { contains: ctx.customerId } },
          { property: 'Team', relation: { contains: ctx.memberId } },
        ],
      },
      [{ property: 'Nombre', direction: 'ascending' }],
    )
      .then((rows) => rows.map((r) => parseTestUserRow(r, locale)).filter((u) => u.usuario && u.clave))
      .catch((e) => {
        console.error('[portal] test users lookup failed', e);
        return [] as PortalTestUser[];
      }),
    (async () => {
      // primero el modelo del repo (trae simulador); Finance queda de respaldo
      const stack = ctx.customerName ? findInfraStack(ctx.customerName) : null;
      if (stack) return buildInfraFromStack(stack, locale);
      const dataSourceId = serverEnv.NOTION_DB_FINANCE;
      if (!dataSourceId) return null;
      // el Type se filtra en código: si la opción no existe en el select de
      // Finance, Notion rechaza el query completo con validation_error
      const rows = await queryAllRaw(dataSourceId, {
        property: 'Customer',
        relation: { contains: ctx.customerId },
      });
      const infraRows = rows.filter(
        (r: any) => r?.properties?.Type?.select?.name === 'Infrastructure',
      );
      return buildInfra(infraRows, locale);
    })().catch((e) => {
      console.error('[portal] infra lookup failed', e);
      return null;
    }),
  ]);

  return { proposal, testUsers, infra };
}
