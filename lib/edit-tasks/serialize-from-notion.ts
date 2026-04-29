// lib/edit-tasks/serialize-from-notion.ts

type NotionRichText = {
  plain_text: string;
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    code?: boolean;
  };
  href?: string | null;
};

type NotionBlock = {
  type: string;
  [key: string]: unknown;
};

type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

const HEADING_LEVELS: Record<string, 1 | 2 | 3> = {
  heading_1: 1,
  heading_2: 2,
  heading_3: 3,
};

function richTextToInlines(rt: NotionRichText[] | undefined): PMNode[] {
  if (!rt || rt.length === 0) return [];
  // Marks are added in Task 5; for now just emit plain text nodes.
  return rt
    .filter((r) => r.plain_text.length > 0)
    .map((r) => ({ type: 'text', text: r.plain_text }));
}

function paragraphFromRichText(rt: NotionRichText[] | undefined): PMNode {
  const inlines = richTextToInlines(rt);
  if (inlines.length === 0) return { type: 'paragraph' };
  return { type: 'paragraph', content: inlines };
}

function calloutEmoji(callout: { icon?: { type?: string; emoji?: string } } | undefined): string {
  if (callout?.icon?.type === 'emoji' && typeof callout.icon.emoji === 'string') {
    return callout.icon.emoji;
  }
  return '💡';
}

function blockToNode(block: NotionBlock): PMNode {
  switch (block.type) {
    case 'paragraph': {
      const inner = block.paragraph as { rich_text?: NotionRichText[] };
      return paragraphFromRichText(inner?.rich_text);
    }
    case 'heading_1':
    case 'heading_2':
    case 'heading_3': {
      const level = HEADING_LEVELS[block.type]!;
      const inner = block[block.type] as { rich_text?: NotionRichText[] };
      const inlines = richTextToInlines(inner?.rich_text);
      return inlines.length > 0
        ? { type: 'heading', attrs: { level }, content: inlines }
        : { type: 'heading', attrs: { level } };
    }
    case 'divider':
      return { type: 'divider' };
    case 'quote': {
      const inner = block.quote as { rich_text?: NotionRichText[] };
      return { type: 'quote', content: [paragraphFromRichText(inner?.rich_text)] };
    }
    case 'callout': {
      const inner = block.callout as
        | { icon?: { type?: string; emoji?: string }; rich_text?: NotionRichText[] }
        | undefined;
      return {
        type: 'callout',
        attrs: { emoji: calloutEmoji(inner) },
        content: [paragraphFromRichText(inner?.rich_text)],
      };
    }
    case 'code': {
      const inner = block.code as
        | { language?: string; rich_text?: NotionRichText[] }
        | undefined;
      const text = (inner?.rich_text ?? [])
        .map((r) => r.plain_text)
        .join('');
      const node: PMNode = {
        type: 'code_block',
        attrs: { language: inner?.language ?? 'plain text' },
      };
      if (text.length > 0) node.content = [{ type: 'text', text }];
      return node;
    }
    default:
      return {
        type: 'unsupported_block',
        attrs: { kind: block.type, raw: block },
      };
  }
}

export function notionBlocksToProseMirror(blocks: unknown[]): PMNode {
  if (!blocks || blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const content = blocks.map((b) => blockToNode(b as NotionBlock));
  return { type: 'doc', content };
}
