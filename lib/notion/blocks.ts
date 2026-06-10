import { getNotion } from './client';

export async function getBlocks(blockId: string) {
  const notion = getNotion();
  const all: unknown[] = [];
  let cursor: string | undefined = undefined;
  do {
    const res = (await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })) as {
      results: unknown[];
      has_more?: boolean;
      next_cursor?: string | null;
    };
    for (const r of res.results) all.push(r);
    cursor = res.has_more ? res.next_cursor ?? undefined : undefined;
  } while (cursor);
  return all;
}
