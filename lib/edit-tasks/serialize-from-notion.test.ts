// lib/edit-tasks/serialize-from-notion.test.ts
import { describe, it, expect } from 'vitest';
import { notionBlocksToProseMirror } from './serialize-from-notion';

const text = (s: string) => ({
  plain_text: s,
  annotations: {
    bold: false,
    italic: false,
    strikethrough: false,
    underline: false,
    code: false,
    color: 'default',
  },
  href: null,
});

describe('notionBlocksToProseMirror — base blocks', () => {
  it('returns an empty doc with one empty paragraph for an empty array', () => {
    expect(notionBlocksToProseMirror([])).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('converts a paragraph', () => {
    const blocks = [
      { type: 'paragraph', paragraph: { rich_text: [text('Hello')] } },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello' }],
        },
      ],
    });
  });

  it('converts an empty paragraph (no rich_text) into an empty paragraph node', () => {
    const blocks = [{ type: 'paragraph', paragraph: { rich_text: [] } }];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
  });

  it('converts headings 1/2/3 with the correct level attr', () => {
    const blocks = [
      { type: 'heading_1', heading_1: { rich_text: [text('H1')] } },
      { type: 'heading_2', heading_2: { rich_text: [text('H2')] } },
      { type: 'heading_3', heading_3: { rich_text: [text('H3')] } },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content).toEqual([
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
      { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
    ]);
  });

  it('converts a divider', () => {
    const blocks = [{ type: 'divider', divider: {} }];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [{ type: 'divider' }],
    });
  });

  it('converts a quote (single paragraph child)', () => {
    const blocks = [{ type: 'quote', quote: { rich_text: [text('A wise saying')] } }];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'quote',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'A wise saying' }],
            },
          ],
        },
      ],
    });
  });

  it('converts a callout with emoji', () => {
    const blocks = [
      {
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '⚠️' },
          rich_text: [text('Be careful')],
        },
      },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { emoji: '⚠️' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Be careful' }] },
          ],
        },
      ],
    });
  });

  it('callout with non-emoji icon falls back to default 💡', () => {
    const blocks = [
      {
        type: 'callout',
        callout: {
          icon: { type: 'external', external: { url: 'https://x' } },
          rich_text: [text('Hi')],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    const callout = out.content[0] as { attrs: { emoji: string } };
    expect(callout.attrs.emoji).toBe('💡');
  });

  it('converts a code block with language and content', () => {
    const blocks = [
      {
        type: 'code',
        code: { language: 'typescript', rich_text: [text('const x = 1;')] },
      },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    });
  });

  it('converts an empty code block to a code_block node with no content', () => {
    const blocks = [
      { type: 'code', code: { language: 'plain text', rich_text: [] } },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        { type: 'code_block', attrs: { language: 'plain text' } },
      ],
    });
  });

  it('preserves unknown block types via unsupported_block with raw payload', () => {
    const blocks = [
      { type: 'paragraph', paragraph: { rich_text: [text('before')] } },
      { type: 'toggle', id: 'tog-1', toggle: { rich_text: [text('hidden')] } },
      { type: 'paragraph', paragraph: { rich_text: [text('after')] } },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content[1]).toEqual({
      type: 'unsupported_block',
      attrs: {
        kind: 'toggle',
        raw: { type: 'toggle', id: 'tog-1', toggle: { rich_text: [text('hidden')] } },
      },
    });
  });
});
