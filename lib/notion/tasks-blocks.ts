// lib/notion/tasks-blocks.ts
import { getNotion } from './client';

export type ReplaceTaskBlocksError = Error & {
  stage: 'delete' | 'append';
  remaining?: number;
};

function makeError(stage: 'delete' | 'append', message: string, remaining?: number): ReplaceTaskBlocksError {
  const err = new Error(message) as ReplaceTaskBlocksError;
  err.stage = stage;
  if (typeof remaining === 'number') err.remaining = remaining;
  return err;
}

export async function replaceTaskBlocks(
  taskId: string,
  newBlocks: unknown[],
): Promise<{ ok: true; lastEditedTime: string }> {
  const notion = getNotion();

  const existing = await notion.blocks.children.list({
    block_id: taskId,
    page_size: 100,
  });
  const existingIds = (existing.results as { id: string }[]).map((r) => r.id);

  // Delete in reverse so a partial failure leaves a stable suffix-removed state.
  for (let i = existingIds.length - 1; i >= 0; i--) {
    const id = existingIds[i]!;
    try {
      await notion.blocks.delete({ block_id: id });
    } catch (cause) {
      throw makeError('delete', `failed to delete block ${id}`, i + 1);
    }
  }

  if (newBlocks.length > 0) {
    try {
      await notion.blocks.children.append({
        block_id: taskId,
        children: newBlocks as never,
      });
    } catch (cause) {
      throw makeError('append', 'failed to append new blocks');
    }
  }

  const page = (await notion.pages.retrieve({ page_id: taskId })) as {
    last_edited_time: string;
  };
  return { ok: true, lastEditedTime: page.last_edited_time };
}
