// lib/edit-tasks/schema.ts
import { Schema, type NodeSpec, type MarkSpec } from 'prosemirror-model';

const nodes: { [name: string]: NodeSpec } = {
  doc: {
    content: 'block+',
  },

  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },

  heading: {
    group: 'block',
    content: 'inline*',
    attrs: { level: { default: 1 } },
    defining: true,
    parseDOM: [
      { tag: 'h1', attrs: { level: 1 } },
      { tag: 'h2', attrs: { level: 2 } },
      { tag: 'h3', attrs: { level: 3 } },
    ],
    toDOM: (node) => [`h${node.attrs.level}`, 0],
  },

  bulleted_list: {
    group: 'block',
    content: 'bulleted_list_item+',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0],
  },

  bulleted_list_item: {
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  },

  numbered_list: {
    group: 'block',
    content: 'numbered_list_item+',
    parseDOM: [{ tag: 'ol' }],
    toDOM: () => ['ol', 0],
  },

  numbered_list_item: {
    content: 'paragraph block*',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0],
  },

  task_list: {
    group: 'block',
    content: 'task_item+',
    parseDOM: [{ tag: 'ul[data-type="task_list"]' }],
    toDOM: () => ['ul', { 'data-type': 'task_list' }, 0],
  },

  task_item: {
    content: 'paragraph block*',
    attrs: { checked: { default: false } },
    defining: true,
    parseDOM: [
      {
        tag: 'li[data-type="task_item"]',
        getAttrs: (el) => ({
          checked: (el as HTMLElement).getAttribute('data-checked') === 'true',
        }),
      },
    ],
    toDOM: (node) => [
      'li',
      { 'data-type': 'task_item', 'data-checked': String(node.attrs.checked) },
      0,
    ],
  },

  quote: {
    group: 'block',
    content: 'paragraph+',
    parseDOM: [{ tag: 'blockquote' }],
    toDOM: () => ['blockquote', 0],
  },

  divider: {
    group: 'block',
    atom: true,
    selectable: true,
    parseDOM: [{ tag: 'hr' }],
    toDOM: () => ['hr'],
  },

  callout: {
    group: 'block',
    content: 'paragraph',
    attrs: { emoji: { default: '💡' } },
    parseDOM: [
      {
        tag: 'div[data-type="callout"]',
        getAttrs: (el) => ({
          emoji: (el as HTMLElement).getAttribute('data-emoji') ?? '💡',
        }),
      },
    ],
    toDOM: (node) => [
      'div',
      { 'data-type': 'callout', 'data-emoji': node.attrs.emoji as string },
      0,
    ],
  },

  code_block: {
    group: 'block',
    content: 'text*',
    marks: '',
    code: true,
    defining: true,
    attrs: { language: { default: 'plain text' } },
    parseDOM: [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: (el) => ({
          language:
            (el as HTMLElement).getAttribute('data-language') ?? 'plain text',
        }),
      },
    ],
    toDOM: (node) => [
      'pre',
      { 'data-language': node.attrs.language as string },
      ['code', 0],
    ],
  },

  unsupported_block: {
    group: 'block',
    atom: true,
    selectable: true,
    attrs: {
      kind: { default: 'unknown' },
      raw: { default: null as unknown },
    },
    parseDOM: [
      {
        tag: 'div[data-type="unsupported"]',
        getAttrs: (el) => ({
          kind: (el as HTMLElement).getAttribute('data-kind') ?? 'unknown',
          raw: null,
        }),
      },
    ],
    toDOM: (node) => [
      'div',
      { 'data-type': 'unsupported', 'data-kind': node.attrs.kind as string },
      `Bloque no editable: ${node.attrs.kind as string}`,
    ],
  },

  text: {
    group: 'inline',
  },
};

const marks: { [name: string]: MarkSpec } = {
  bold: {
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
    toDOM: () => ['strong', 0],
  },
  italic: {
    parseDOM: [{ tag: 'em' }, { tag: 'i' }],
    toDOM: () => ['em', 0],
  },
  strikethrough: {
    parseDOM: [{ tag: 's' }, { tag: 'del' }],
    toDOM: () => ['s', 0],
  },
  code: {
    parseDOM: [{ tag: 'code' }],
    toDOM: () => ['code', 0],
  },
  link: {
    attrs: { href: { default: '' } },
    inclusive: false,
    parseDOM: [
      {
        tag: 'a[href]',
        getAttrs: (el) => ({
          href: (el as HTMLElement).getAttribute('href') ?? '',
        }),
      },
    ],
    toDOM: (mark) => [
      'a',
      { href: mark.attrs.href as string, target: '_blank', rel: 'noreferrer' },
      0,
    ],
  },
};

export const editTasksSchema = new Schema({ nodes, marks });
