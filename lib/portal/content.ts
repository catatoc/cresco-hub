// ── Portal del cliente · brief del proyecto ─────────────────────────────────
// El contenido de la página del proyecto en Notion, renderizable como brief.
// Misma filosofía que meeting.ts: parsing defensivo, gate por Customer.
//
// Frontera de contenido (spec 2026-06-11):
//  - solo un subset seguro de bloques: headings, párrafos, listas, callouts,
//    quotes, divisores, imágenes y diagramas mermaid. Nada de child pages,
//    code (salvo mermaid), embeds ni links a Notion (los rich text se aplanan
//    a plain_text, así los links internos mueren ahí)
//  - todo lo que está debajo del ÚLTIMO divisor de la página se trata como
//    notas internas (referencias a repos, sub-páginas) y NO se expone
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

/** Convierte los bloques top-level de la página del proyecto al modelo del portal. */
export function parseProjectBlocks(blocks: any[]): ProjectBlock[] {
  const out: ProjectBlock[] = [];
  for (const b of blocks) {
    const type: string = b?.type ?? '';
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

  // lo que sigue al último divisor son notas internas → fuera (y el divisor también)
  const lastDivider = out.map((b) => b.kind).lastIndexOf('divider');
  const visible = lastDivider >= 0 ? out.slice(0, lastDivider) : out;

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
