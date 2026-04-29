// lib/edit-tasks/serialize-to-notion.ts

type PMNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

type NotionRichTextWrite = {
  type: 'text';
  text: { content: string; link: { url: string } | null };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    code: boolean;
    underline: false;
    color: 'default';
  };
};

function inlineToRichText(node: PMNode): NotionRichTextWrite | null {
  if (node.type !== 'text' || !node.text) return null;
  const marks = node.marks ?? [];
  const has = (name: string) => marks.some((m) => m.type === name);
  const link = marks.find((m) => m.type === 'link');
  const linkUrl = link?.attrs?.href as string | undefined;
  return {
    type: 'text',
    text: { content: node.text, link: linkUrl ? { url: linkUrl } : null },
    annotations: {
      bold: has('bold'),
      italic: has('italic'),
      strikethrough: has('strikethrough'),
      code: has('code'),
      underline: false,
      color: 'default',
    },
  };
}

function richTextFromInlines(content: PMNode[] | undefined): NotionRichTextWrite[] {
  if (!content) return [];
  return content
    .map(inlineToRichText)
    .filter((rt): rt is NotionRichTextWrite => rt !== null);
}

function plainTextFromInlines(content: PMNode[] | undefined): string {
  if (!content) return '';
  return content
    .filter((n) => n.type === 'text' && typeof n.text === 'string')
    .map((n) => n.text!)
    .join('');
}

function firstParagraphRichText(node: PMNode): NotionRichTextWrite[] {
  const para = node.content?.find((c) => c.type === 'paragraph');
  return richTextFromInlines(para?.content);
}

function nodeToBlocks(node: PMNode): unknown[] {
  switch (node.type) {
    case 'paragraph':
      return [{ type: 'paragraph', paragraph: { rich_text: richTextFromInlines(node.content) } }];
    case 'heading': {
      const level = (node.attrs?.level as 1 | 2 | 3) ?? 1;
      const key = `heading_${level}`;
      return [{ type: key, [key]: { rich_text: richTextFromInlines(node.content) } }];
    }
    case 'divider':
      return [{ type: 'divider', divider: {} }];
    case 'quote':
      return [{ type: 'quote', quote: { rich_text: firstParagraphRichText(node) } }];
    case 'callout':
      return [
        {
          type: 'callout',
          callout: {
            icon: { type: 'emoji', emoji: (node.attrs?.emoji as string) ?? '💡' },
            rich_text: firstParagraphRichText(node),
          },
        },
      ];
    case 'code_block':
      return [
        {
          type: 'code',
          code: {
            language: (node.attrs?.language as string) ?? 'plain text',
            rich_text:
              plainTextFromInlines(node.content).length > 0
                ? [
                    {
                      type: 'text',
                      text: { content: plainTextFromInlines(node.content), link: null },
                      annotations: {
                        bold: false,
                        italic: false,
                        strikethrough: false,
                        code: false,
                        underline: false,
                        color: 'default',
                      },
                    },
                  ]
                : [],
          },
        },
      ];
    case 'bulleted_list':
      return (node.content ?? []).flatMap((item) => [
        {
          type: 'bulleted_list_item',
          bulleted_list_item: { rich_text: firstParagraphRichText(item) },
        },
      ]);
    case 'numbered_list':
      return (node.content ?? []).flatMap((item) => [
        {
          type: 'numbered_list_item',
          numbered_list_item: { rich_text: firstParagraphRichText(item) },
        },
      ]);
    case 'task_list':
      return (node.content ?? []).flatMap((item) => [
        {
          type: 'to_do',
          to_do: {
            checked: (item.attrs?.checked as boolean) === true,
            rich_text: firstParagraphRichText(item),
          },
        },
      ]);
    case 'unsupported_block':
      return node.attrs?.raw ? [node.attrs.raw] : [];
    default:
      // Unknown PM node — skip it. Should never happen if the schema is enforced.
      return [];
  }
}

export function proseMirrorToNotionBlocks(doc: PMNode): unknown[] {
  if (doc.type !== 'doc' || !doc.content) return [];
  return doc.content.flatMap(nodeToBlocks);
}
