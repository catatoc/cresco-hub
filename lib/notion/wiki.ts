import { cache } from 'react';
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { wikiPageSchema, type WikiPage } from '@/schemas/wiki';

function parseWiki(row: any): WikiPage {
  const p = row.properties as Record<string, any>;
  const icon = (row as any).icon;
  const cover = (row as any).cover;
  return wikiPageSchema.parse({
    id: row.id,
    title: p['Doc name']?.title?.[0]?.plain_text ?? 'Sin título',
    icon: icon?.type === 'emoji' ? icon.emoji : null,
    cover: cover?.type === 'external'
      ? cover.external.url
      : cover?.type === 'file'
        ? cover.file.url
        : null,
    categories: (p.Category?.multi_select ?? []).map((c: { name: string }) => c.name),
    customerId: p.Customer?.relation?.[0]?.id ?? null,
    projectIds: (p.Projects?.relation ?? []).map((r: { id: string }) => r.id),
    meetingIds: (p.Meetings?.relation ?? []).map((r: { id: string }) => r.id),
    lastEditedAt: row.last_edited_time,
    url: row.url,
  });
}

export const queryWikiByCustomer = cache(
  async (customerId: string): Promise<WikiPage[]> => {
    const notion = getNotion();
    const res = await notion.dataSources.query({
      data_source_id: serverEnv.NOTION_DB_WIKI,
      filter: { property: 'Customer', relation: { contains: customerId } },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    });
    return res.results.filter((r): r is any => 'properties' in r).map(parseWiki);
  },
);

export async function getWikiPageBlocks(pageId: string) {
  const notion = getNotion();
  const res = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  return res.results;
}

export async function queryWikiByCustomerAndTitle(
  customerId: string,
  term: string,
): Promise<WikiPage[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_WIKI,
    page_size: 8,
    filter: {
      and: [
        { property: 'Customer', relation: { contains: customerId } },
        { property: 'Doc name', title: { contains: term } },
      ],
    },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseWiki);
}
