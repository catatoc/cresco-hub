# Edit Tasks — Phase 1 (Headless Foundation) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the headless foundation that lets a client send a fresh array of Notion blocks for a task and have the server replace the task's body with them. No UI yet — Phase 2 (TaskEditor + plugins + slash menu + toolbar) is a separate plan that builds on top of this.

**Architecture:** Pure-function serializers between Notion's block JSON and a custom ProseMirror document JSON. A server-side helper that lists existing children, deletes them in reverse order, and appends new ones. A `PATCH /api/tasks/[id]/blocks` route that authenticates, scopes, validates, and delegates to the helper.

**Tech Stack:** ProseMirror (model + state + schema-list packages — no UI yet, only the data layer), Zod for body validation, Vitest + `vi.mock` for tests, `@notionhq/client` for the Notion calls.

---

## Spec reference

`docs/superpowers/specs/2026-04-29-edit-tasks-design.md`

Phase 1 covers everything in the spec's "Implementation phases → Phase 1" section: install deps, schema, both serializers, server-side replace helper, API route. Phase 2 (UI) is a separate plan.

## Phase boundary — what "done" looks like for this plan

After all tasks in this plan are committed, you should be able to:

```bash
curl -X PATCH http://localhost:4000/api/tasks/<task-id>/blocks \
  -H "content-type: application/json" \
  -H "cookie: <auth cookie>" \
  -d '{"doc": <prosemirror-doc-json>}'
```

…and have the Notion task's body replaced with the doc's serialized blocks. No UI changes yet — that's Phase 2.

The Phase 2 plan (separate file) will mount this API behind a real ProseMirror EditorView with plugins, slash menu, toolbar, and an edit/read toggle on the task detail page.

## File map

**New files:**

- `lib/edit-tasks/schema.ts` — ProseMirror schema (nodes + marks).
- `lib/edit-tasks/schema.test.ts` — schema validity smoke tests.
- `lib/edit-tasks/serialize-from-notion.ts` — `notionBlocksToProseMirror`.
- `lib/edit-tasks/serialize-from-notion.test.ts` — exhaustive round-trip + unsupported-block tests.
- `lib/edit-tasks/serialize-to-notion.ts` — `proseMirrorToNotionBlocks`.
- `lib/edit-tasks/serialize-to-notion.test.ts` — exhaustive tests including mark combinations.
- `lib/notion/tasks-blocks.ts` — `replaceTaskBlocks(taskId, newBlocks)`.
- `lib/notion/__tests__/tasks-blocks.test.ts` — happy path + partial-failure tests.
- `app/api/tasks/[id]/blocks/route.ts` — PATCH handler.
- `app/api/tasks/[id]/blocks/__tests__/route.test.ts` — handler tests (auth, scope, body, success).

**Modified files:**

- `package.json` — add ProseMirror data-layer deps.

## Conventions used in this plan

- Test runner: `npm run test -- <path> --run` (Vitest).
- Type check: `npm run typecheck` after touching shared types.
- Tests live next to source for pure helpers (`foo.ts` ↔ `foo.test.ts`) and in `__tests__/` folders for files that are conventionally tested separately (matches existing repo conventions: `lib/notion/__tests__/projects.test.ts`).
- Commit after every task.
- Branch: `feat/edit-tasks` (already created from `main`).

## Notion block shapes used by tests (reference)

Notion's REST API serializes blocks as JSON. The relevant shapes for this plan:

```ts
// Paragraph
{
  type: 'paragraph',
  paragraph: { rich_text: [{ plain_text: 'Hello', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null }, ...] }
}

// Heading 1/2/3
{ type: 'heading_1', heading_1: { rich_text: [...] } }

// Bulleted / numbered list item (Notion has NO list wrapper — siblings of the same type form a list)
{ type: 'bulleted_list_item', bulleted_list_item: { rich_text: [...] } }
{ type: 'numbered_list_item', numbered_list_item: { rich_text: [...] } }

// To-do (Notion's task-list item)
{ type: 'to_do', to_do: { checked: false, rich_text: [...] } }

// Quote
{ type: 'quote', quote: { rich_text: [...] } }

// Divider (atom)
{ type: 'divider', divider: {} }

// Callout
{ type: 'callout', callout: { icon: { type: 'emoji', emoji: '💡' }, rich_text: [...] } }

// Code block
{ type: 'code', code: { language: 'typescript', rich_text: [{ plain_text: 'const x = 1;' }] } }
```

For the `append` API (creating blocks), the shape is the same but Notion accepts only the writable subset — the input shape per block type is:

```ts
// Append shape (what we send back to Notion):
{
  type: 'paragraph',
  paragraph: { rich_text: [{ type: 'text', text: { content: 'Hello', link: null }, annotations: {...} }, ...] }
}
```

Note the difference: API responses use `plain_text`, but writes use `text: { content }`. The serializer must produce the write shape.

---

## Task 1: Install ProseMirror data-layer dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

Run from the project root:

```bash
npm install prosemirror-model prosemirror-state prosemirror-schema-basic prosemirror-schema-list
```

We only install the packages needed for the headless foundation. The view/keymap/inputrules/history/commands packages come in Phase 2.

- [ ] **Step 2: Verify the install added them to dependencies (not devDependencies)**

Open `package.json` and confirm the four new entries live under `"dependencies"`. If npm placed them under `devDependencies` (rare but possible if the workspace had a `--save-dev` default), move them.

- [ ] **Step 3: Run typecheck to confirm no immediate type breakage**

Run: `npm run typecheck`
Expected: PASS — adding dependencies doesn't add code, so this should be clean.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add ProseMirror data-layer packages for edit-tasks"
```

---

## Task 2: Define the ProseMirror schema

**Files:**
- Create: `lib/edit-tasks/schema.ts`
- Create: `lib/edit-tasks/schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/edit-tasks/schema.test.ts
import { describe, it, expect } from 'vitest';
import { Node } from 'prosemirror-model';
import { editTasksSchema } from './schema';

describe('editTasksSchema', () => {
  it('exposes the expected node types', () => {
    const types = Object.keys(editTasksSchema.nodes);
    expect(types).toEqual(
      expect.arrayContaining([
        'doc',
        'paragraph',
        'heading',
        'bulleted_list',
        'bulleted_list_item',
        'numbered_list',
        'numbered_list_item',
        'task_list',
        'task_item',
        'quote',
        'divider',
        'callout',
        'code_block',
        'unsupported_block',
        'text',
      ]),
    );
  });

  it('exposes the expected marks', () => {
    const marks = Object.keys(editTasksSchema.marks);
    expect(marks).toEqual(
      expect.arrayContaining(['bold', 'italic', 'strikethrough', 'code', 'link']),
    );
  });

  it('builds a valid empty document', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph'),
    ]);
    expect(doc.type.name).toBe('doc');
    expect(doc.firstChild?.type.name).toBe('paragraph');
  });

  it('builds a heading with level attribute', () => {
    const heading = editTasksSchema.node('heading', { level: 2 }, [
      editTasksSchema.text('Title'),
    ]);
    expect(heading.attrs.level).toBe(2);
    expect(heading.textContent).toBe('Title');
  });

  it('builds a callout with emoji attribute', () => {
    const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text('Note')]);
    const callout = editTasksSchema.node('callout', { emoji: '💡' }, [para]);
    expect(callout.attrs.emoji).toBe('💡');
  });

  it('builds a task_item with checked attribute', () => {
    const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text('Do it')]);
    const item = editTasksSchema.node('task_item', { checked: true }, [para]);
    expect(item.attrs.checked).toBe(true);
  });

  it('builds a code_block with language attribute and text content', () => {
    const code = editTasksSchema.node(
      'code_block',
      { language: 'typescript' },
      [editTasksSchema.text('const x = 1;')],
    );
    expect(code.attrs.language).toBe('typescript');
    expect(code.textContent).toBe('const x = 1;');
  });

  it('serializes to JSON and back via Node.fromJSON', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('Hello')]),
    ]);
    const json = doc.toJSON();
    const back = Node.fromJSON(editTasksSchema, json);
    expect(back.eq(doc)).toBe(true);
  });

  it('supports nested marks on the same span', () => {
    const bold = editTasksSchema.marks.bold!.create();
    const italic = editTasksSchema.marks.italic!.create();
    const text = editTasksSchema.text('Hi', [bold, italic]);
    expect(text.marks.length).toBe(2);
  });

  it('treats divider as an atom block', () => {
    expect(editTasksSchema.nodes.divider!.spec.atom).toBe(true);
  });

  it('treats unsupported_block as an atom block', () => {
    expect(editTasksSchema.nodes.unsupported_block!.spec.atom).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/edit-tasks/schema.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the schema**

```ts
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
    excludes: '_',
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/edit-tasks/schema.test.ts --run`
Expected: PASS — all 10 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/schema.ts lib/edit-tasks/schema.test.ts
git commit -m "feat(edit-tasks): add ProseMirror schema for editable Notion blocks"
```

---

## Task 3: `notionBlocksToProseMirror` — base block types (TDD)

**Files:**
- Create: `lib/edit-tasks/serialize-from-notion.ts`
- Create: `lib/edit-tasks/serialize-from-notion.test.ts`

This task covers the simpler block types: paragraph, heading 1/2/3, divider, quote, callout, code, plus the `unsupported_block` fallback. Lists and task lists come in Task 4. Inline marks come in Task 5.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation (base block types only — list-item handling comes in Task 4)**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: PASS — all 11 tests green. Lists/task-list/marks tests are added in subsequent tasks.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/serialize-from-notion.ts lib/edit-tasks/serialize-from-notion.test.ts
git commit -m "feat(edit-tasks): notion→ProseMirror for base block types"
```

---

## Task 4: `notionBlocksToProseMirror` — lists, numbered lists, task lists

**Files:**
- Modify: `lib/edit-tasks/serialize-from-notion.ts`
- Modify: `lib/edit-tasks/serialize-from-notion.test.ts`

Notion has no list wrapper — consecutive `bulleted_list_item` blocks form a list. The serializer must group consecutive list-item siblings into a wrapping `bulleted_list` / `numbered_list` / `task_list` PM node.

- [ ] **Step 1: Append failing tests**

Append the following inside the existing `describe('notionBlocksToProseMirror — base blocks', ...)` block, OR add a new `describe` block at the end of the file. Use a new `describe`:

```ts
describe('notionBlocksToProseMirror — lists', () => {
  it('groups consecutive bulleted_list_item blocks under a bulleted_list', () => {
    const blocks = [
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('a')] } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('b')] } },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'bulleted_list',
          content: [
            {
              type: 'bulleted_list_item',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
              ],
            },
            {
              type: 'bulleted_list_item',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
              ],
            },
          ],
        },
      ],
    });
  });

  it('groups consecutive numbered_list_item blocks under a numbered_list', () => {
    const blocks = [
      { type: 'numbered_list_item', numbered_list_item: { rich_text: [text('one')] } },
      { type: 'numbered_list_item', numbered_list_item: { rich_text: [text('two')] } },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect((out.content[0] as { type: string }).type).toBe('numbered_list');
    expect((out.content[0] as { content: unknown[] }).content).toHaveLength(2);
  });

  it('groups consecutive to_do blocks under a task_list with checked attrs', () => {
    const blocks = [
      { type: 'to_do', to_do: { checked: true, rich_text: [text('done')] } },
      { type: 'to_do', to_do: { checked: false, rich_text: [text('open')] } },
    ];
    expect(notionBlocksToProseMirror(blocks)).toEqual({
      type: 'doc',
      content: [
        {
          type: 'task_list',
          content: [
            {
              type: 'task_item',
              attrs: { checked: true },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'done' }] },
              ],
            },
            {
              type: 'task_item',
              attrs: { checked: false },
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'open' }] },
              ],
            },
          ],
        },
      ],
    });
  });

  it('starts a new list when the type changes', () => {
    const blocks = [
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('a')] } },
      { type: 'numbered_list_item', numbered_list_item: { rich_text: [text('1')] } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('b')] } },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content.map((n) => (n as { type: string }).type)).toEqual([
      'bulleted_list',
      'numbered_list',
      'bulleted_list',
    ]);
  });

  it('breaks a list when an unrelated block sits between items', () => {
    const blocks = [
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('a')] } },
      { type: 'paragraph', paragraph: { rich_text: [text('mid')] } },
      { type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text('b')] } },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content.map((n) => (n as { type: string }).type)).toEqual([
      'bulleted_list',
      'paragraph',
      'bulleted_list',
    ]);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: FAIL — the new list tests fail because the current implementation produces `unsupported_block` for list items.

- [ ] **Step 3: Update the implementation**

Replace the body of the exported `notionBlocksToProseMirror` function with this version that groups list-items, AND add the three new `case` branches for list-item block types in `blockToNode`:

```ts
// At the top of the file, near other internal types, add:
type ListWrapperType = 'bulleted_list' | 'numbered_list' | 'task_list';

const LIST_ITEM_TO_WRAPPER: Record<string, ListWrapperType> = {
  bulleted_list_item: 'bulleted_list',
  numbered_list_item: 'numbered_list',
  to_do: 'task_list',
};

const LIST_ITEM_TO_PM_TYPE: Record<string, string> = {
  bulleted_list_item: 'bulleted_list_item',
  numbered_list_item: 'numbered_list_item',
  to_do: 'task_item',
};

// Inside blockToNode, ADD these cases BEFORE the default:
case 'bulleted_list_item':
case 'numbered_list_item': {
  const inner = block[block.type] as { rich_text?: NotionRichText[] };
  return {
    type: LIST_ITEM_TO_PM_TYPE[block.type]!,
    content: [paragraphFromRichText(inner?.rich_text)],
  };
}
case 'to_do': {
  const inner = block.to_do as { checked?: boolean; rich_text?: NotionRichText[] };
  return {
    type: 'task_item',
    attrs: { checked: inner?.checked === true },
    content: [paragraphFromRichText(inner?.rich_text)],
  };
}

// Replace the exported function with this:
export function notionBlocksToProseMirror(blocks: unknown[]): PMNode {
  if (!blocks || blocks.length === 0) {
    return { type: 'doc', content: [{ type: 'paragraph' }] };
  }
  const content: PMNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i] as NotionBlock;
    const wrapperType = LIST_ITEM_TO_WRAPPER[block.type];
    if (wrapperType) {
      // Collect consecutive items of the same Notion type
      const items: PMNode[] = [];
      while (i < blocks.length) {
        const next = blocks[i] as NotionBlock;
        if (LIST_ITEM_TO_WRAPPER[next.type] !== wrapperType) break;
        items.push(blockToNode(next));
        i++;
      }
      content.push({ type: wrapperType, content: items });
    } else {
      content.push(blockToNode(block));
      i++;
    }
  }
  return { type: 'doc', content };
}
```

NOTE: The two `LIST_ITEM_TO_*` constants and the new `case` branches are *additions* to `blockToNode`. The original `default` case (returning `unsupported_block`) remains for genuinely unknown types. Make sure the new cases sit BEFORE the `default`.

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: PASS — 11 base tests + 5 list tests = 16 green.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/serialize-from-notion.ts lib/edit-tasks/serialize-from-notion.test.ts
git commit -m "feat(edit-tasks): notion→ProseMirror groups list-items into wrappers"
```

---

## Task 5: `notionBlocksToProseMirror` — inline marks

**Files:**
- Modify: `lib/edit-tasks/serialize-from-notion.ts`
- Modify: `lib/edit-tasks/serialize-from-notion.test.ts`

Notion expresses inline formatting via per-rich-text-run `annotations` and `href`. We map: `bold → bold`, `italic → italic`, `strikethrough → strikethrough`, `code → code` (mark, not block), `href → link mark with href attr`. Underline and color are dropped (out of scope).

- [ ] **Step 1: Append failing tests**

Add a new `describe` block to the test file:

```ts
describe('notionBlocksToProseMirror — inline marks', () => {
  it('emits bold mark when annotations.bold=true', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              plain_text: 'Hi',
              annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false },
              href: null,
            },
          ],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content[0]).toEqual({
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hi', marks: [{ type: 'bold' }] }],
    });
  });

  it('emits multiple marks when several annotations are true', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              plain_text: 'mix',
              annotations: { bold: true, italic: true, strikethrough: true, underline: true, code: true },
              href: null,
            },
          ],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    const para = out.content[0] as { content: { marks: { type: string }[] }[] };
    const markNames = para.content[0]!.marks.map((m) => m.type).sort();
    // underline is dropped
    expect(markNames).toEqual(['bold', 'code', 'italic', 'strikethrough']);
  });

  it('emits link mark when href is set', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              plain_text: 'click',
              annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false },
              href: 'https://example.com',
            },
          ],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content[0]).toEqual({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'click',
          marks: [{ type: 'link', attrs: { href: 'https://example.com' } }],
        },
      ],
    });
  });

  it('preserves multiple consecutive runs as separate text nodes', () => {
    const blocks = [
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { plain_text: 'a', annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false }, href: null },
            { plain_text: 'b', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null },
          ],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    const para = out.content[0] as { content: unknown[] };
    expect(para.content).toEqual([
      { type: 'text', text: 'a', marks: [{ type: 'bold' }] },
      { type: 'text', text: 'b' },
    ]);
  });

  it('does not apply marks inside code_block content', () => {
    // Code blocks are text-only with no marks per the schema; the serializer
    // should already strip annotations because it joins rich_text plain.
    const blocks = [
      {
        type: 'code',
        code: {
          language: 'js',
          rich_text: [
            { plain_text: 'const x = ', annotations: { bold: true, italic: false, strikethrough: false, underline: false, code: false }, href: null },
            { plain_text: '1;', annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false }, href: null },
          ],
        },
      },
    ];
    const out = notionBlocksToProseMirror(blocks);
    expect(out.content[0]).toEqual({
      type: 'code_block',
      attrs: { language: 'js' },
      content: [{ type: 'text', text: 'const x = 1;' }],
    });
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: FAIL — mark assertions fail.

- [ ] **Step 3: Update `richTextToInlines`**

Replace the body of `richTextToInlines` in `lib/edit-tasks/serialize-from-notion.ts` with:

```ts
function richTextToInlines(rt: NotionRichText[] | undefined): PMNode[] {
  if (!rt || rt.length === 0) return [];
  return rt
    .filter((r) => r.plain_text.length > 0)
    .map((r) => {
      const marks: { type: string; attrs?: Record<string, unknown> }[] = [];
      const ann = r.annotations ?? {};
      if (ann.bold) marks.push({ type: 'bold' });
      if (ann.italic) marks.push({ type: 'italic' });
      if (ann.strikethrough) marks.push({ type: 'strikethrough' });
      if (ann.code) marks.push({ type: 'code' });
      if (typeof r.href === 'string' && r.href.length > 0) {
        marks.push({ type: 'link', attrs: { href: r.href } });
      }
      const node: PMNode = { type: 'text', text: r.plain_text };
      if (marks.length > 0) node.marks = marks;
      return node;
    });
}
```

The `code_block` test passes because `blockToNode`'s `case 'code'` branch builds its content from `rich_text.map(r => r.plain_text).join('')` — it never touches marks.

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/serialize-from-notion.test.ts --run`
Expected: PASS — 16 (Task 4) + 5 (Task 5) = 21 green.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/serialize-from-notion.ts lib/edit-tasks/serialize-from-notion.test.ts
git commit -m "feat(edit-tasks): notion→ProseMirror inline mark mapping"
```

---

## Task 6: `proseMirrorToNotionBlocks` — full reverse serializer (TDD)

**Files:**
- Create: `lib/edit-tasks/serialize-to-notion.ts`
- Create: `lib/edit-tasks/serialize-to-notion.test.ts`

Reverses Task 3-5 in one step. Must produce the **write shape** Notion accepts in `blocks.children.append`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/serialize-to-notion.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
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
      return [node.attrs?.raw];
    default:
      // Unknown PM node — skip it. Should never happen if the schema is enforced.
      return [];
  }
}

export function proseMirrorToNotionBlocks(doc: PMNode): unknown[] {
  if (doc.type !== 'doc' || !doc.content) return [];
  return doc.content.flatMap(nodeToBlocks);
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/serialize-to-notion.test.ts --run`
Expected: PASS — all 12 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/serialize-to-notion.ts lib/edit-tasks/serialize-to-notion.test.ts
git commit -m "feat(edit-tasks): ProseMirror→notion reverse serializer"
```

---

## Task 7: `replaceTaskBlocks` server-side helper (TDD)

**Files:**
- Create: `lib/notion/tasks-blocks.ts`
- Create: `lib/notion/__tests__/tasks-blocks.test.ts`

The helper deletes existing children in reverse order (so block IDs stay stable while iterating) and appends the new ones. Returns the updated `last_edited_time` from a follow-up `pages.retrieve` call.

- [ ] **Step 1: Write the failing test**

```ts
// lib/notion/__tests__/tasks-blocks.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  blocks: {
    children: {
      list: vi.fn(),
      append: vi.fn(),
    },
    delete: vi.fn(),
  },
  pages: {
    retrieve: vi.fn(),
  },
};

import { replaceTaskBlocks } from '../tasks-blocks';

describe('replaceTaskBlocks', () => {
  beforeEach(() => {
    mockNotion.blocks.children.list.mockReset();
    mockNotion.blocks.children.append.mockReset();
    mockNotion.blocks.delete.mockReset();
    mockNotion.pages.retrieve.mockReset();
  });

  it('lists, deletes (reverse), appends, then returns last_edited_time', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [
        { id: 'b-1' },
        { id: 'b-2' },
        { id: 'b-3' },
      ],
    });
    mockNotion.blocks.delete.mockResolvedValue({});
    mockNotion.blocks.children.append.mockResolvedValueOnce({});
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const newBlocks = [
      { type: 'paragraph', paragraph: { rich_text: [] } },
    ];
    const out = await replaceTaskBlocks('task-id', newBlocks);

    // Verify order of calls and reverse-deletion order
    expect(mockNotion.blocks.children.list).toHaveBeenCalledWith({
      block_id: 'task-id',
      page_size: 100,
    });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(1, { block_id: 'b-3' });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(2, { block_id: 'b-2' });
    expect(mockNotion.blocks.delete).toHaveBeenNthCalledWith(3, { block_id: 'b-1' });
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: newBlocks,
    });
    expect(mockNotion.pages.retrieve).toHaveBeenCalledWith({ page_id: 'task-id' });
    expect(out).toEqual({ ok: true, lastEditedTime: '2026-04-29T12:00:00.000Z' });
  });

  it('skips delete and append when there are no existing children and the new array is empty', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const out = await replaceTaskBlocks('task-id', []);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
    expect(out.ok).toBe(true);
  });

  it('still appends when the page had no children but new blocks were given', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({ results: [] });
    mockNotion.blocks.children.append.mockResolvedValueOnce({});
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      last_edited_time: '2026-04-29T12:00:00.000Z',
    });

    const blocks = [{ type: 'paragraph', paragraph: { rich_text: [] } }];
    await replaceTaskBlocks('task-id', blocks);

    expect(mockNotion.blocks.delete).not.toHaveBeenCalled();
    expect(mockNotion.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-id',
      children: blocks,
    });
  });

  it('returns a stage:"delete" failure when delete throws', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [{ id: 'b-1' }, { id: 'b-2' }],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({}); // first ok
    mockNotion.blocks.delete.mockRejectedValueOnce(new Error('boom'));

    await expect(replaceTaskBlocks('task-id', [])).rejects.toMatchObject({
      stage: 'delete',
      remaining: expect.any(Number),
    });
    expect(mockNotion.blocks.children.append).not.toHaveBeenCalled();
  });

  it('returns a stage:"append" failure when append throws after deletes succeed', async () => {
    mockNotion.blocks.children.list.mockResolvedValueOnce({
      results: [{ id: 'b-1' }],
    });
    mockNotion.blocks.delete.mockResolvedValueOnce({});
    mockNotion.blocks.children.append.mockRejectedValueOnce(new Error('rate limit'));

    await expect(
      replaceTaskBlocks('task-id', [
        { type: 'paragraph', paragraph: { rich_text: [] } },
      ]),
    ).rejects.toMatchObject({ stage: 'append' });
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/notion/__tests__/tasks-blocks.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/notion/__tests__/tasks-blocks.test.ts --run`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/notion/tasks-blocks.ts lib/notion/__tests__/tasks-blocks.test.ts
git commit -m "feat(notion): add replaceTaskBlocks server-side helper"
```

---

## Task 8: PATCH `/api/tasks/[id]/blocks` route (TDD)

**Files:**
- Create: `app/api/tasks/[id]/blocks/route.ts`
- Create: `app/api/tasks/[id]/blocks/__tests__/route.test.ts`

Follows the exact pattern of `app/api/tasks/[id]/status/route.ts`: Supabase auth → `resolveContext` → fetch task → check `customerId` → parse body → delegate. The delegate here is `replaceTaskBlocks` after running `proseMirrorToNotionBlocks` on the body's `doc` field.

- [ ] **Step 1: Write the failing test**

```ts
// app/api/tasks/[id]/blocks/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const getUser = vi.fn();
const resolveContext = vi.fn();
const getTask = vi.fn();
const replaceTaskBlocks = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: getUser() } }) },
  }),
}));
vi.mock('@/lib/auth/context', () => ({
  resolveContext: (email: string) => resolveContext(email),
  TAREAS_SCOPE_COOKIE: 'unused',
}));
vi.mock('@/lib/notion/tasks', () => ({
  getTask: (id: string) => getTask(id),
}));
vi.mock('@/lib/notion/tasks-blocks', () => ({
  replaceTaskBlocks: (id: string, blocks: unknown[]) => replaceTaskBlocks(id, blocks),
}));

import { PATCH } from '../route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/tasks/t1/blocks', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const params = Promise.resolve({ id: 't1' });

describe('PATCH /api/tasks/[id]/blocks', () => {
  beforeEach(() => {
    getUser.mockReset();
    resolveContext.mockReset();
    getTask.mockReset();
    replaceTaskBlocks.mockReset();
  });

  it('401 when not authenticated', async () => {
    getUser.mockReturnValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(401);
  });

  it('403 when user has no customer context', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(403);
  });

  it('404 when task does not exist', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce(null);
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(404);
  });

  it('403 when task belongs to another customer', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'OTHER' });
    const res = await PATCH(makeRequest({ doc: { type: 'doc', content: [] } }), { params });
    expect(res.status).toBe(403);
  });

  it('400 when body is missing doc', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const res = await PATCH(makeRequest({}), { params });
    expect(res.status).toBe(400);
  });

  it('200 on success and delegates serialized blocks', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    replaceTaskBlocks.mockResolvedValueOnce({
      ok: true,
      lastEditedTime: '2026-04-29T12:00:00.000Z',
    });

    const doc = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
    };
    const res = await PATCH(makeRequest({ doc }), { params });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      ok: true,
      lastEditedTime: '2026-04-29T12:00:00.000Z',
    });
    expect(replaceTaskBlocks).toHaveBeenCalledTimes(1);
    const [taskId, blocks] = replaceTaskBlocks.mock.calls[0]!;
    expect(taskId).toBe('t1');
    expect(blocks).toEqual([
      {
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Hi', link: null },
              annotations: {
                bold: false, italic: false, strikethrough: false,
                code: false, underline: false, color: 'default',
              },
            },
          ],
        },
      },
    ]);
  });

  it('returns 503 with stage info when replaceTaskBlocks throws stage:"append"', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const err = Object.assign(new Error('append failed'), { stage: 'append' });
    replaceTaskBlocks.mockRejectedValueOnce(err);

    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
    const res = await PATCH(makeRequest({ doc }), { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('append-failed');
  });

  it('returns 503 with stage info when replaceTaskBlocks throws stage:"delete"', async () => {
    getUser.mockReturnValueOnce({ email: 'a@b.com' });
    resolveContext.mockResolvedValueOnce({ customerId: 'c1', memberId: 'm1' });
    getTask.mockResolvedValueOnce({ id: 't1', customerId: 'c1' });
    const err = Object.assign(new Error('delete failed'), { stage: 'delete', remaining: 2 });
    replaceTaskBlocks.mockRejectedValueOnce(err);

    const doc = { type: 'doc', content: [{ type: 'paragraph' }] };
    const res = await PATCH(makeRequest({ doc }), { params });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('delete-failed');
    expect(body.remaining).toBe(2);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- "app/api/tasks/[id]/blocks/__tests__/route.test.ts" --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// app/api/tasks/[id]/blocks/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { getTask } from '@/lib/notion/tasks';
import { replaceTaskBlocks } from '@/lib/notion/tasks-blocks';
import { proseMirrorToNotionBlocks } from '@/lib/edit-tasks/serialize-to-notion';

const bodySchema = z.object({
  doc: z.object({
    type: z.literal('doc'),
    content: z.array(z.unknown()).optional(),
  }).passthrough(),
});

type StagedError = Error & { stage?: 'delete' | 'append'; remaining?: number };

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const ctx = await resolveContext(user.email);
  if (!ctx) {
    return NextResponse.json({ error: 'no-access' }, { status: 403 });
  }

  const task = await getTask(id);
  if (!task) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  if (task.customerId !== ctx.customerId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }

  const blocks = proseMirrorToNotionBlocks(parsed.data.doc as Parameters<typeof proseMirrorToNotionBlocks>[0]);

  try {
    const result = await replaceTaskBlocks(id, blocks);
    return NextResponse.json({ ok: true, lastEditedTime: result.lastEditedTime });
  } catch (rawErr) {
    const err = rawErr as StagedError;
    if (err.stage === 'delete') {
      return NextResponse.json(
        { error: 'delete-failed', remaining: err.remaining ?? null },
        { status: 503 },
      );
    }
    if (err.stage === 'append') {
      return NextResponse.json({ error: 'append-failed' }, { status: 503 });
    }
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- "app/api/tasks/[id]/blocks/__tests__/route.test.ts" --run`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add "app/api/tasks/[id]/blocks/route.ts" "app/api/tasks/[id]/blocks/__tests__/route.test.ts"
git commit -m "feat(api): add PATCH /api/tasks/[id]/blocks for body replacement"
```

---

## Task 9: Final gates

**Files:** none

- [ ] **Step 1: Full suite + typecheck**

Run: `npm run typecheck` → expect PASS.
Run: `npm run test -- --run` → expect PASS, with at least 50 tests in `lib/edit-tasks/` + the new route test (52+ tests added on top of the prior baseline).

- [ ] **Step 2: Build**

Run: `npm run build` → expect SUCCESS. Confirms the new API route is registered and the imports resolve.

If any gate fails, fix before reporting Phase 1 complete.

- [ ] **Step 3: No commit needed for this task** — green is the deliverable.

---

## Done.

After Task 9 finishes green, Phase 1 is complete:

- ProseMirror schema defined.
- Both serializers shipped under TDD with full block-type coverage.
- Server-side replace helper with reverse-delete + append.
- PATCH route wired with auth + scope + Zod validation + stage-aware error handling.

You can verify end-to-end with curl as shown in the Phase boundary section at the top of this plan.

The Phase 2 plan (`docs/superpowers/plans/<date>-edit-tasks-phase-2-ui.md`, written separately) builds the React editor on top of this API: TaskEditor component with view + history + inputrules + keymap, slash menu, inline toolbar, callout/code pickers, edit/read toggle in `task-detail.tsx`, banner for unsupported blocks, mobile gating.
