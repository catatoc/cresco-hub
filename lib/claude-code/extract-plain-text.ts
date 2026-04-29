// lib/claude-code/extract-plain-text.ts

type Block = {
  type: string;
  [key: string]: unknown;
};

type RichText = { plain_text?: string };

function getRichText(block: Block, key: string): string {
  const inner = (block[key] as { rich_text?: RichText[] } | undefined) ?? {};
  return (inner.rich_text ?? []).map((r) => r.plain_text ?? '').join('');
}

/**
 * Walks an array of Notion blocks and returns a plain-text rendering
 * suitable for pasting into a Claude Code prompt. Output is capped to
 * `maxChars` (default 2000) and gets a trailing "…" when truncated.
 *
 * Supported: paragraph, heading_1..3, bulleted_list_item,
 * numbered_list_item, to_do, quote, code. Unknown types are skipped.
 */
export function extractPlainText(blocks: unknown[], maxChars = 2000): string {
  const lines: string[] = [];
  for (const raw of blocks) {
    const block = raw as Block;
    switch (block.type) {
      case 'paragraph':
        lines.push(getRichText(block, 'paragraph'));
        break;
      case 'heading_1':
        lines.push(`# ${getRichText(block, 'heading_1')}`);
        break;
      case 'heading_2':
        lines.push(`## ${getRichText(block, 'heading_2')}`);
        break;
      case 'heading_3':
        lines.push(`### ${getRichText(block, 'heading_3')}`);
        break;
      case 'bulleted_list_item':
        lines.push(`- ${getRichText(block, 'bulleted_list_item')}`);
        break;
      case 'numbered_list_item':
        lines.push(`1. ${getRichText(block, 'numbered_list_item')}`);
        break;
      case 'to_do': {
        const inner = block.to_do as { checked?: boolean } | undefined;
        const mark = inner?.checked ? '[x]' : '[ ]';
        lines.push(`- ${mark} ${getRichText(block, 'to_do')}`);
        break;
      }
      case 'quote':
        lines.push(`> ${getRichText(block, 'quote')}`);
        break;
      case 'code': {
        const inner = block.code as { language?: string } | undefined;
        const lang = inner?.language ?? 'plain text';
        lines.push(`\`\`\`${lang}\n${getRichText(block, 'code')}\n\`\`\``);
        break;
      }
      default:
        break;
    }
  }
  const joined = lines.filter((l) => l.length > 0).join('\n');
  if (joined.length <= maxChars) return joined;
  return joined.slice(0, maxChars - 1) + '…';
}
