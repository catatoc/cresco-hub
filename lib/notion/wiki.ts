import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { wikiPageSchema, type WikiPage } from '@/schemas/wiki';

export async function queryWikiByClient(clientId: string): Promise<WikiPage[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_WIKI,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      const icon = row.icon;
      const cover = row.cover;
      return wikiPageSchema.parse({
        id: row.id,
        title: p.Name?.title?.[0]?.plain_text ?? p.Title?.title?.[0]?.plain_text ?? 'Sin título',
        icon: icon?.type === 'emoji' ? icon.emoji : null,
        cover: cover?.type === 'external' ? cover.external.url : cover?.type === 'file' ? cover.file.url : null,
        parentId: p['Parent item']?.relation?.[0]?.id ?? null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        ownerId: p.Owner?.relation?.[0]?.id ?? null,
        tags: (p.Tags?.multi_select ?? []).map((t: { name: string }) => t.name),
        lastEditedAt: row.last_edited_time,
        url: row.url,
      });
    });
}

export async function getWikiPageBlocks(pageId: string) {
  const notion = getNotion();
  const res = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  return res.results;
}
