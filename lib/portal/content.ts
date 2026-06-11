// ── Portal del cliente · brief del proyecto ─────────────────────────────────
// El contenido de la página del proyecto en Notion, renderizable como brief.
// Misma filosofía que meeting.ts: parsing defensivo, gate por Customer.
//
// Frontera de contenido (spec 2026-06-11):
//  - solo un subset seguro de bloques: headings, párrafos, listas, callouts,
//    quotes, divisores, imágenes y diagramas mermaid. Nada de child pages,
//    code (salvo mermaid), embeds ni links a Notion (los rich text se aplanan
//    a plain_text, así los links internos mueren ahí)
//  - una sección bajo un heading "Interno" / "Notas internas" se omite entera
//  - un colofón corto y sin headings tras el ÚLTIMO divisor (p. ej.
//    "Referencia: docs/... en el repo") se trata como notas internas; un
//    divisor estilístico en medio del contenido NO corta nada
import { getNotion } from '@/lib/notion/client';
import type { AppContext } from '@/lib/auth/context';

export interface ProjectBlock {
  kind: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'oli' | 'callout' | 'quote' | 'divider' | 'mermaid' | 'img';
  /** texto plano; en mermaid es el código del diagrama; en img es el caption */
  text: string;
  /** emoji del callout, si tiene */
  icon?: string;
  /** url de la imagen (firmada por Notion, expira ~1h — el brief se pide al abrir) */
  url?: string;
}

const richText = (block: any, type: string): string =>
  ((block[type]?.rich_text ?? []) as any[]).map((t) => t.plain_text).join('').trim();

const KIND_OF: Record<string, ProjectBlock['kind']> = {
  heading_1: 'h1',
  heading_2: 'h2',
  heading_3: 'h3',
  paragraph: 'p',
  bulleted_list_item: 'li',
  numbered_list_item: 'oli',
  callout: 'callout',
  quote: 'quote',
};
const HEADING_LEVEL: Record<string, number> = { heading_1: 1, heading_2: 2, heading_3: 3 };
const HEADING_KINDS = new Set<ProjectBlock['kind']>(['h1', 'h2', 'h3']);

// headings que marcan una sección solo-crescō (se compara sin emojis ni acentos)
const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, '').trim();
const INTERNAL_HEADINGS = new Set([
  'interno', 'internal', 'notas internas', 'internal notes', 'solo cresco', 'referencias internas',
]);

/** Convierte los bloques top-level de la página del proyecto al modelo del portal. */
export function parseProjectBlocks(blocks: any[]): ProjectBlock[] {
  const out: ProjectBlock[] = [];
  let skipBelow: number | null = null; // nivel del heading "Interno" que estamos saltando

  for (const b of blocks) {
    const type: string = b?.type ?? '';

    const level = HEADING_LEVEL[type];
    if (level !== undefined) {
      const text = richText(b, type);
      if (skipBelow !== null && level <= skipBelow) skipBelow = null; // salió de la sección
      if (INTERNAL_HEADINGS.has(norm(text))) {
        skipBelow = level;
        continue;
      }
      if (skipBelow !== null) continue;
      if (text) out.push({ kind: KIND_OF[type]!, text });
      continue;
    }
    if (skipBelow !== null) continue;

    if (type === 'divider') {
      out.push({ kind: 'divider', text: '' });
      continue;
    }
    // diagramas: solo code blocks con lenguaje mermaid (el resto del code es interno)
    if (type === 'code') {
      if (b.code?.language === 'mermaid') {
        const source = richText(b, 'code');
        if (source) out.push({ kind: 'mermaid', text: source });
      }
      continue;
    }
    if (type === 'image') {
      const url: string | undefined = b.image?.file?.url ?? b.image?.external?.url;
      if (!url) continue;
      const caption = ((b.image?.caption ?? []) as any[]).map((t) => t.plain_text).join('').trim();
      out.push({ kind: 'img', text: caption, url });
      continue;
    }
    const kind = KIND_OF[type];
    if (!kind) continue;
    const text = richText(b, type);
    if (!text) continue;
    if (kind === 'callout') {
      const icon = b.callout?.icon?.type === 'emoji' ? b.callout.icon.emoji : undefined;
      out.push({ kind, text, ...(icon ? { icon } : {}) });
    } else {
      out.push({ kind, text });
    }
  }

  // colofón: si tras el último divisor solo queda un cierre corto y sin
  // headings (referencias a repos, notas sueltas), se trata como interno.
  // Un divisor estilístico con contenido real después no corta nada.
  const lastDivider = out.map((b) => b.kind).lastIndexOf('divider');
  let visible = out;
  if (lastDivider >= 0) {
    const tail = out.slice(lastDivider + 1);
    if (tail.length <= 2 && !tail.some((b) => HEADING_KINDS.has(b.kind))) {
      visible = out.slice(0, lastDivider);
    }
  }

  // un divisor al final sin contenido después no aporta nada
  while (visible.length && visible[visible.length - 1]!.kind === 'divider') visible.pop();
  return visible;
}

/**
 * El brief del proyecto. Gate de seguridad: solo si la relación Customer
 * contiene el customer del contexto; si no, null → 404.
 */
export async function loadProjectContent(ctx: AppContext, projectId: string): Promise<ProjectBlock[] | null> {
  const notion = getNotion();
  let page: any;
  try {
    page = await notion.pages.retrieve({ page_id: projectId });
  } catch {
    return null;
  }
  if (!page || !('properties' in page)) return null;

  const customerIds: string[] = (page.properties.Customer?.relation ?? []).map((r: any) => r.id);
  if (!customerIds.includes(ctx.customerId)) return null;

  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.blocks.children.list({
      block_id: projectId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return parseProjectBlocks(blocks);
}
