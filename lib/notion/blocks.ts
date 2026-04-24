import { getNotion } from './client';

export async function getBlocks(blockId: string) {
  const notion = getNotion();
  const res = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
  return res.results;
}
