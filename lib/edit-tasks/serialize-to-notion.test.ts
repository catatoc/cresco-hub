// lib/edit-tasks/serialize-to-notion.test.ts
import { describe, it, expect } from 'vitest';
import { proseMirrorToNotionBlocks } from './serialize-to-notion';

const richText = (
  content: string,
  ann: Partial<{ bold: boolean; italic: boolean; strikethrough: boolean; code: boolean }> = {},
  link?: string | null,
) => ({
  type: 'text',
  text: { content, link: link ? { url: link } : null },
  annotations: {
    bold: ann.bold ?? false,
    italic: ann.italic ?? false,
    strikethrough: ann.strikethrough ?? false,
    code: ann.code ?? false,
    underline: false,
    color: 'default',
  },
});

describe('proseMirrorToNotionBlocks', () => {
  it('returns an empty array for an empty doc', () => {
    expect(proseMirrorToNotionBlocks({ type: 'doc', content: [] })).toEqual([]);
  });

  it('returns one empty paragraph for a doc with one empty paragraph', () => {
    expect(
      proseMirrorToNotionBlocks({ type: 'doc', content: [{ type: 'paragraph' }] }),
    ).toEqual([{ type: 'paragraph', paragraph: { rich_text: [] } }]);
  });

  it('serializes a paragraph with text', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      { type: 'paragraph', paragraph: { rich_text: [richText('Hello')] } },
    ]);
  });

  it('serializes headings 1/2/3', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      { type: 'heading_1', heading_1: { rich_text: [richText('H1')] } },
      { type: 'heading_2', heading_2: { rich_text: [richText('H2')] } },
      { type: 'heading_3', heading_3: { rich_text: [richText('H3')] } },
    ]);
  });

  it('serializes a divider', () => {
    expect(
      proseMirrorToNotionBlocks({ type: 'doc', content: [{ type: 'divider' }] }),
    ).toEqual([{ type: 'divider', divider: {} }]);
  });

  it('serializes a quote (uses first paragraph child)', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'quote',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'wisdom' }] },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      { type: 'quote', quote: { rich_text: [richText('wisdom')] } },
    ]);
  });

  it('serializes a callout with emoji', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'callout',
          attrs: { emoji: '⚠️' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Watch out' }] },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'callout',
        callout: {
          icon: { type: 'emoji', emoji: '⚠️' },
          rich_text: [richText('Watch out')],
        },
      },
    ]);
  });

  it('serializes a code block', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'code_block',
          attrs: { language: 'typescript' },
          content: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'code',
        code: {
          language: 'typescript',
          rich_text: [richText('const x = 1;')],
        },
      },
    ]);
  });

  it('flattens a bulleted_list back into bulleted_list_item siblings', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'bulleted_list',
          content: [
            {
              type: 'bulleted_list_item',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
            },
            {
              type: 'bulleted_list_item',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }],
            },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [richText('a')] },
      },
      {
        type: 'bulleted_list_item',
        bulleted_list_item: { rich_text: [richText('b')] },
      },
    ]);
  });

  it('flattens numbered_list and task_list (with checked) similarly', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'numbered_list',
          content: [
            {
              type: 'numbered_list_item',
              content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }],
            },
          ],
        },
        {
          type: 'task_list',
          content: [
            {
              type: 'task_item',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done' }] }],
            },
            {
              type: 'task_item',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [{ type: 'text', text: 'open' }] }],
            },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'numbered_list_item',
        numbered_list_item: { rich_text: [richText('1')] },
      },
      {
        type: 'to_do',
        to_do: { checked: true, rich_text: [richText('done')] },
      },
      {
        type: 'to_do',
        to_do: { checked: false, rich_text: [richText('open')] },
      },
    ]);
  });

  it('round-trips an unsupported_block by emitting its raw payload', () => {
    const raw = { type: 'toggle', id: 'tog-1', toggle: { rich_text: [{ plain_text: 'x' }] } };
    const doc = {
      type: 'doc',
      content: [{ type: 'unsupported_block', attrs: { kind: 'toggle', raw } }],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([raw]);
  });

  it('emits annotations for marked text', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' plain' },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [richText('Bold', { bold: true }), richText(' plain')],
        },
      },
    ]);
  });

  it('skips unsupported_block when raw payload is missing', () => {
    const doc = {
      type: 'doc',
      content: [{ type: 'unsupported_block', attrs: { kind: 'toggle', raw: null } }],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([]);
  });

  it('emits link via the rich_text text.link.url field', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'click',
              marks: [{ type: 'link', attrs: { href: 'https://x.com' } }],
            },
          ],
        },
      ],
    };
    expect(proseMirrorToNotionBlocks(doc)).toEqual([
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [richText('click', {}, 'https://x.com')],
        },
      },
    ]);
  });
});
