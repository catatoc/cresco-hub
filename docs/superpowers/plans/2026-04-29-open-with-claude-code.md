# Open with Claude Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Open with Claude Code" affordance to every task surface in the Notion Hub. Clicking it opens `claude.ai/code` and copies a structured prompt (title, status, priority, project, repo URL, Notion link, description) to the clipboard.

**Architecture:** Three pure helper modules in `lib/claude-code/` (build prompt, extract plain text, open helper) consumed by one shared `OpenWithClaudeButton` component with three visual variants (`row`, `card`, `cta`). Wire that button into the home `MyTasks`, the project tasks module, the kanban `TaskCard`, and the task detail footer. A new `Repo URL` property on the Notion Projects database flows through `parseProject` into the prompt.

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind v4, TypeScript, Zod for schemas, Vitest + Testing Library + jsdom for tests, Sonner for toasts (already wired in `app/(app)/layout.tsx`), Lucide for icons, `@notionhq/client` for the Notion API.

---

## Spec reference

`docs/superpowers/specs/2026-04-29-open-with-claude-code-design.md`

## File map

**New:**

- `lib/claude-code/constants.ts` — single source for the Claude Code URL.
- `lib/claude-code/extract-plain-text.ts` — pure: walks Notion blocks → string.
- `lib/claude-code/extract-plain-text.test.ts` — co-located unit tests.
- `lib/claude-code/build-prompt.ts` — pure: `(task, project, description) → string`.
- `lib/claude-code/build-prompt.test.ts` — co-located unit tests.
- `lib/claude-code/open-with-claude-code.ts` — client side-effect: window.open + clipboard + toast.
- `lib/claude-code/open-with-claude-code.test.ts` — co-located unit tests with mocked browser APIs.
- `components/common/open-with-claude-button.tsx` — three-variant button.
- `components/common/__tests__/open-with-claude-button.test.tsx` — component tests.

**Modified:**

- `schemas/project.ts` — add `repoUrl` field.
- `lib/notion/projects.ts` — read `Repo URL` property.
- `lib/notion/__tests__/` — add fixture/test for `parseProject` if such a test file exists; if not, skip.
- `components/home/my-tasks.tsx` — render row variant; receive `projectsById` map.
- `app/page.tsx` (or wherever `MyTasks` is composed) — pass `projectsById` map.
- `components/projects/project-tasks-module.tsx` — render row variant.
- `components/kanban/card.tsx` — render card variant in upper-right.
- `components/kanban/task-detail.tsx` — render CTA variant + register `⌘⇧.` listener.

**Notion-side (manual, documented in Task 14):**

- Add `Repo URL` (URL property) to the Projects database in Notion.

---

## Conventions used in this plan

- Test runner: `npm run test -- <path>` (Vitest, defined in `package.json`). Watch mode is the default; we filter by file path.
- Type check: `npm run typecheck` after touching schemas or shared types.
- Tests live next to source (`foo.ts` ↔ `foo.test.ts`) for pure helpers, and in `__tests__/` folders for components (matching the existing convention in `components/kanban/__tests__/`).
- Commit after every task completes its tests.

---

## Task 1: Add `Repo URL` to the project schema

**Files:**
- Modify: `schemas/project.ts`

- [ ] **Step 1: Update the Zod schema and type**

Edit `schemas/project.ts` and add `repoUrl: z.string().url().nullable()` immediately after the `summary` field. The full field block becomes:

```ts
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  summary: z.string().nullable(),
  repoUrl: z.string().url().nullable(),
  status: projectStatusSchema.nullable(),
  priority: projectPrioritySchema.nullable(),
  completion: z.number().nullable(),
  ownerIds: z.array(z.string()),
  customerId: z.string().nullable(),
  teamIds: z.array(z.string()),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  url: z.string().url(),
});
```

- [ ] **Step 2: Run typecheck to find every consumer that needs updating**

Run: `npm run typecheck`
Expected: PASS — `repoUrl` is nullable so existing constructions of `Project` that were not using `parseProject` would fail, but every consumer in this codebase goes through `parseProject` (which we update next), so this should still pass. If it fails, the failing files are listed and become Task 2's input.

- [ ] **Step 3: Commit**

```bash
git add schemas/project.ts
git commit -m "feat(schemas): add repoUrl field to project schema"
```

---

## Task 2: Read `Repo URL` from Notion in `parseProject`

**Files:**
- Modify: `lib/notion/projects.ts:5-22`

- [ ] **Step 1: Update `parseProject` to read the new property**

Inside `parseProject` in `lib/notion/projects.ts`, add the `repoUrl` line right after `summary`:

```ts
function parseProject(row: any): Project {
  const p = row.properties as Record<string, any>;
  const icon = (row as any).icon;
  return projectSchema.parse({
    id: row.id,
    name: p['Project name']?.title?.[0]?.plain_text ?? '',
    icon: icon?.type === 'emoji' ? icon.emoji : null,
    summary: p.Summary?.rich_text?.[0]?.plain_text ?? null,
    repoUrl: p['Repo URL']?.url ?? null,
    status: p.Status?.status?.name ?? null,
    priority: p.Priority?.select?.name ?? null,
    completion: typeof p.Completion?.rollup?.number === 'number' ? p.Completion.rollup.number : null,
    ownerIds: (p.Owner?.people ?? []).map((u: { id: string }) => u.id),
    customerId: p.Customer?.relation?.[0]?.id ?? null,
    teamIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
    startDate: p.Dates?.date?.start ?? null,
    endDate: p.Dates?.date?.end ?? null,
    url: row.url,
  });
}
```

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/notion/projects.ts
git commit -m "feat(notion): map Notion 'Repo URL' property into Project.repoUrl"
```

---

## Task 3: Add the URL constant module

**Files:**
- Create: `lib/claude-code/constants.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/claude-code/constants.ts

/**
 * Base URL for Claude Code on the web.
 * If/when claude.ai/code accepts a `?prompt=` query parameter, swap this
 * to a builder function — every caller goes through `openWithClaudeCode`.
 */
export const CLAUDE_CODE_WEB_URL = 'https://claude.ai/code';
```

- [ ] **Step 2: Commit**

```bash
git add lib/claude-code/constants.ts
git commit -m "feat(claude-code): add web URL constant"
```

---

## Task 4: Pure helper — `extractPlainText` (TDD)

**Files:**
- Create: `lib/claude-code/extract-plain-text.test.ts`
- Create: `lib/claude-code/extract-plain-text.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/claude-code/extract-plain-text.test.ts
import { describe, it, expect } from 'vitest';
import { extractPlainText } from './extract-plain-text';

const para = (text: string) => ({
  type: 'paragraph',
  paragraph: { rich_text: [{ plain_text: text }] },
});

const heading = (level: 1 | 2 | 3, text: string) => ({
  type: `heading_${level}`,
  [`heading_${level}`]: { rich_text: [{ plain_text: text }] },
});

const bulletItem = (text: string) => ({
  type: 'bulleted_list_item',
  bulleted_list_item: { rich_text: [{ plain_text: text }] },
});

const numberedItem = (text: string) => ({
  type: 'numbered_list_item',
  numbered_list_item: { rich_text: [{ plain_text: text }] },
});

const todo = (text: string, checked: boolean) => ({
  type: 'to_do',
  to_do: { checked, rich_text: [{ plain_text: text }] },
});

const quote = (text: string) => ({
  type: 'quote',
  quote: { rich_text: [{ plain_text: text }] },
});

const code = (text: string, language = 'plain text') => ({
  type: 'code',
  code: { language, rich_text: [{ plain_text: text }] },
});

const image = () => ({ type: 'image', image: { external: { url: 'https://x' } } });
const divider = () => ({ type: 'divider', divider: {} });

describe('extractPlainText', () => {
  it('returns empty string for an empty array', () => {
    expect(extractPlainText([])).toBe('');
  });

  it('joins paragraphs with newlines', () => {
    const out = extractPlainText([para('First.'), para('Second.')]);
    expect(out).toBe('First.\nSecond.');
  });

  it('renders headings with leading hashes', () => {
    const out = extractPlainText([heading(1, 'Title'), heading(2, 'Sub'), heading(3, 'Sub-sub')]);
    expect(out).toBe('# Title\n## Sub\n### Sub-sub');
  });

  it('renders bulleted and numbered list items with markers', () => {
    const out = extractPlainText([bulletItem('a'), bulletItem('b'), numberedItem('c')]);
    expect(out).toBe('- a\n- b\n1. c');
  });

  it('renders to-do items with checkbox markers', () => {
    const out = extractPlainText([todo('done', true), todo('not done', false)]);
    expect(out).toBe('- [x] done\n- [ ] not done');
  });

  it('renders quotes with > prefix', () => {
    expect(extractPlainText([quote('an aphorism')])).toBe('> an aphorism');
  });

  it('renders code as fenced blocks', () => {
    expect(extractPlainText([code('let x = 1', 'typescript')])).toBe(
      '```typescript\nlet x = 1\n```',
    );
  });

  it('skips unsupported block types (image, divider)', () => {
    expect(extractPlainText([para('keep'), image(), divider(), para('also keep')])).toBe(
      'keep\nalso keep',
    );
  });

  it('caps output at maxChars and adds an ellipsis', () => {
    const long = 'x'.repeat(2500);
    const out = extractPlainText([para(long)], 2000);
    expect(out.length).toBe(2000);
    expect(out.endsWith('…')).toBe(true);
  });

  it('uses 2000 as the default cap', () => {
    const long = 'x'.repeat(3000);
    const out = extractPlainText([para(long)]);
    expect(out.length).toBe(2000);
  });

  it('handles missing rich_text gracefully', () => {
    const broken = { type: 'paragraph', paragraph: {} };
    expect(extractPlainText([broken])).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/claude-code/extract-plain-text.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/claude-code/extract-plain-text.test.ts --run`
Expected: PASS — all 11 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/claude-code/extract-plain-text.ts lib/claude-code/extract-plain-text.test.ts
git commit -m "feat(claude-code): add extractPlainText helper for Notion blocks"
```

---

## Task 5: Pure helper — `buildPrompt` (TDD)

**Files:**
- Create: `lib/claude-code/build-prompt.test.ts`
- Create: `lib/claude-code/build-prompt.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/claude-code/build-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './build-prompt';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const baseTask: Task = {
  id: 'task-id',
  title: 'Implementar deeplink a Claude Code',
  status: 'In Progress',
  priority: 'High',
  type: '🐛 Bug',
  assigneeIds: [],
  projectId: 'p1',
  customerId: 'c1',
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://www.notion.so/abcdef',
};

const baseProject: Project = {
  id: 'p1',
  name: 'Notion Hub',
  icon: null,
  summary: null,
  repoUrl: 'https://github.com/me/notion-hub',
  status: 'In Progress',
  priority: null,
  completion: null,
  ownerIds: [],
  customerId: 'c1',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://www.notion.so/p1',
};

describe('buildPrompt', () => {
  it('includes title, metadata, project, repo, Notion URL, and description', () => {
    const out = buildPrompt({
      task: baseTask,
      project: baseProject,
      description: 'Allow users to start a session.',
    });
    expect(out).toContain('Implementar deeplink a Claude Code');
    expect(out).toContain('Estado: In Progress');
    expect(out).toContain('Prioridad: High');
    expect(out).toContain('Tipo: 🐛 Bug');
    expect(out).toContain('Proyecto: Notion Hub');
    expect(out).toContain('Repo: https://github.com/me/notion-hub');
    expect(out).toContain('Notion: https://www.notion.so/abcdef');
    expect(out).toContain('Descripción:\nAllow users to start a session.');
  });

  it('omits the Repo line when project has no repoUrl', () => {
    const project = { ...baseProject, repoUrl: null };
    const out = buildPrompt({ task: baseTask, project, description: 'x' });
    expect(out).not.toContain('Repo:');
    expect(out).toContain('Proyecto: Notion Hub');
  });

  it('omits Proyecto and Repo when project is null', () => {
    const out = buildPrompt({ task: baseTask, project: null, description: 'x' });
    expect(out).not.toContain('Proyecto:');
    expect(out).not.toContain('Repo:');
    expect(out).toContain('Notion: https://www.notion.so/abcdef');
  });

  it('omits Descripción section when description is empty', () => {
    const out = buildPrompt({ task: baseTask, project: baseProject, description: '' });
    expect(out).not.toContain('Descripción:');
  });

  it('omits Prioridad and Tipo when null', () => {
    const task = { ...baseTask, priority: null, type: null };
    const out = buildPrompt({ task, project: baseProject, description: '' });
    expect(out).not.toContain('Prioridad:');
    expect(out).not.toContain('Tipo:');
    expect(out).toContain('Estado: In Progress');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/claude-code/build-prompt.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/claude-code/build-prompt.ts
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

type BuildPromptArgs = {
  task: Task;
  project: Project | null;
  /**
   * Plain-text description (already extracted from Notion blocks via
   * `extractPlainText`). Pass an empty string when the caller doesn't
   * have the blocks loaded — the Descripción section is omitted.
   */
  description: string;
};

/**
 * Build the prompt string we copy to the clipboard / paste into
 * claude.ai/code. Sections are omitted when their data is missing
 * rather than rendered as "—" so the prompt stays compact.
 */
export function buildPrompt({ task, project, description }: BuildPromptArgs): string {
  const meta: string[] = [`Estado: ${task.status}`];
  if (task.priority) meta.push(`Prioridad: ${task.priority}`);
  if (task.type) meta.push(`Tipo: ${task.type}`);

  const refs: string[] = [];
  if (project) refs.push(`Proyecto: ${project.name}`);
  if (project?.repoUrl) refs.push(`Repo: ${project.repoUrl}`);
  refs.push(`Notion: ${task.url}`);

  const sections: string[] = [
    'Trabaja en esta tarea de Notion:',
    '',
    task.title,
    '',
    meta.join(' · '),
    refs.join('\n'),
  ];

  const trimmedDescription = description.trim();
  if (trimmedDescription.length > 0) {
    sections.push('', 'Descripción:', trimmedDescription);
  }

  return sections.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/claude-code/build-prompt.test.ts --run`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/claude-code/build-prompt.ts lib/claude-code/build-prompt.test.ts
git commit -m "feat(claude-code): add buildPrompt helper"
```

---

## Task 6: Client helper — `openWithClaudeCode` (TDD with mocked browser APIs)

**Files:**
- Create: `lib/claude-code/open-with-claude-code.test.ts`
- Create: `lib/claude-code/open-with-claude-code.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/claude-code/open-with-claude-code.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openWithClaudeCode } from './open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
  },
}));

import { toast } from 'sonner';

const task: Task = {
  id: 'tid', title: 'Title', status: 'In Progress', priority: 'High',
  type: null, assigneeIds: [], projectId: null, customerId: 'c',
  sprintId: null, dueDate: null, plannedDate: null, completedAt: null,
  tags: [], progress: null, url: 'https://notion.so/tid',
};

const project: Project = {
  id: 'p', name: 'P', icon: null, summary: null, repoUrl: null,
  status: null, priority: null, completion: null, ownerIds: [],
  customerId: 'c', teamIds: [], startDate: null, endDate: null,
  url: 'https://notion.so/p',
};

describe('openWithClaudeCode', () => {
  let originalOpen: typeof window.open;
  let originalClipboard: Clipboard | undefined;
  const writeText = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    originalOpen = window.open;
    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    writeText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.open = originalOpen;
    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: originalClipboard,
      });
    }
  });

  it('opens claude.ai/code in a new tab with noopener,noreferrer', async () => {
    const open = vi.fn().mockReturnValue({} as Window);
    window.open = open;

    await openWithClaudeCode({ task, project, description: '' });

    expect(open).toHaveBeenCalledWith(
      'https://claude.ai/code',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('writes the built prompt to the clipboard and shows a success toast', async () => {
    window.open = vi.fn().mockReturnValue({} as Window);

    await openWithClaudeCode({ task, project, description: 'Body.' });

    expect(writeText).toHaveBeenCalledTimes(1);
    const written = writeText.mock.calls[0][0] as string;
    expect(written).toContain('Title');
    expect(written).toContain('Notion: https://notion.so/tid');
    expect(written).toContain('Descripción:\nBody.');
    expect(toast.success).toHaveBeenCalledWith(
      'Sesión abierta en Claude Code',
      expect.objectContaining({ description: expect.stringContaining('copiado') }),
    );
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('shows the popup-blocked toast when window.open returns null', async () => {
    window.open = vi.fn().mockReturnValue(null);

    await openWithClaudeCode({ task, project, description: '' });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('bloqueó'),
      expect.any(Object),
    );
  });

  it('shows the clipboard-failed toast and console.info-logs the prompt when writeText rejects', async () => {
    window.open = vi.fn().mockReturnValue({} as Window);
    writeText.mockRejectedValueOnce(new Error('denied'));
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    await openWithClaudeCode({ task, project, description: '' });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('no pude copiar'),
      expect.any(Object),
    );
    expect(info).toHaveBeenCalled();
    info.mockRestore();
  });

  it('still attempts the clipboard write when popup is blocked', async () => {
    window.open = vi.fn().mockReturnValue(null);

    await openWithClaudeCode({ task, project, description: '' });

    expect(writeText).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- lib/claude-code/open-with-claude-code.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/claude-code/open-with-claude-code.ts
'use client';

import { toast } from 'sonner';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import { CLAUDE_CODE_WEB_URL } from './constants';
import { buildPrompt } from './build-prompt';

type Args = {
  task: Task;
  project: Project | null;
  /**
   * Plain-text description. Empty string is fine when the caller
   * doesn't have the Notion blocks loaded (e.g. list rows). The
   * detail surface should pass the extracted text so Claude gets
   * full context.
   */
  description: string;
};

const POPUP_BLOCKED_TITLE = 'Tu navegador bloqueó la pestaña';
const POPUP_BLOCKED_DESC = 'Habilita popups para abrir Claude Code automáticamente.';
const CLIPBOARD_OK_TITLE = 'Sesión abierta en Claude Code';
const CLIPBOARD_OK_DESC = 'Prompt copiado · pégalo si no se prellenó.';
const CLIPBOARD_FAIL_TITLE = 'Abrí Claude Code, pero no pude copiar el prompt';
const CLIPBOARD_FAIL_DESC = 'Pégalo desde la consola del navegador (devtools).';

export async function openWithClaudeCode({ task, project, description }: Args): Promise<void> {
  const prompt = buildPrompt({ task, project, description });

  const popup = window.open(CLAUDE_CODE_WEB_URL, '_blank', 'noopener,noreferrer');
  const popupBlocked = popup === null;

  let clipboardOk = false;
  try {
    await navigator.clipboard.writeText(prompt);
    clipboardOk = true;
  } catch {
    clipboardOk = false;
    // eslint-disable-next-line no-console
    console.info('[open-with-claude-code] prompt:\n', prompt);
  }

  if (popupBlocked) {
    toast.error(POPUP_BLOCKED_TITLE, { description: POPUP_BLOCKED_DESC });
    return;
  }
  if (!clipboardOk) {
    toast.error(CLIPBOARD_FAIL_TITLE, { description: CLIPBOARD_FAIL_DESC });
    return;
  }
  toast.success(CLIPBOARD_OK_TITLE, { description: CLIPBOARD_OK_DESC });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- lib/claude-code/open-with-claude-code.test.ts --run`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/claude-code/open-with-claude-code.ts lib/claude-code/open-with-claude-code.test.ts lib/claude-code/constants.ts
git commit -m "feat(claude-code): add openWithClaudeCode client helper with clipboard + sonner"
```

---

## Task 7: `OpenWithClaudeButton` component (3 variants, TDD)

**Files:**
- Create: `components/common/__tests__/open-with-claude-button.test.tsx`
- Create: `components/common/open-with-claude-button.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/common/__tests__/open-with-claude-button.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenWithClaudeButton } from '../open-with-claude-button';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

const open = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/claude-code/open-with-claude-code', () => ({
  openWithClaudeCode: (args: unknown) => open(args),
}));

const task: Task = {
  id: 'tid', title: 'T', status: 'In Progress', priority: null,
  type: null, assigneeIds: [], projectId: null, customerId: 'c',
  sprintId: null, dueDate: null, plannedDate: null, completedAt: null,
  tags: [], progress: null, url: 'https://notion.so/tid',
};

const project: Project = {
  id: 'p', name: 'P', icon: null, summary: null, repoUrl: null,
  status: null, priority: null, completion: null, ownerIds: [],
  customerId: 'c', teamIds: [], startDate: null, endDate: null,
  url: 'https://notion.so/p',
};

beforeEach(() => open.mockClear());

describe('OpenWithClaudeButton', () => {
  it('renders an icon-only button with aria-label in row variant', () => {
    render(<OpenWithClaudeButton variant="row" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toBeInTheDocument();
  });

  it('renders an icon-only button in card variant', () => {
    render(<OpenWithClaudeButton variant="card" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toBeInTheDocument();
  });

  it('renders a labeled gradient button in cta variant', () => {
    render(<OpenWithClaudeButton variant="cta" task={task} project={null} description="" />);
    expect(screen.getByRole('button', { name: /abrir con claude code/i })).toHaveTextContent(
      /Abrir con Claude Code/i,
    );
  });

  it('calls openWithClaudeCode with the right args on click', async () => {
    const user = userEvent.setup();
    render(
      <OpenWithClaudeButton
        variant="row"
        task={task}
        project={project}
        description="hello"
      />,
    );
    await user.click(screen.getByRole('button', { name: /abrir con claude code/i }));
    expect(open).toHaveBeenCalledWith({ task, project, description: 'hello' });
  });

  it('stops propagation on click so it does not trigger ancestor handlers', async () => {
    const ancestorClick = vi.fn();
    const user = userEvent.setup();
    render(
      <div onClick={ancestorClick}>
        <OpenWithClaudeButton variant="row" task={task} project={null} description="" />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /abrir con claude code/i }));
    expect(open).toHaveBeenCalledTimes(1);
    expect(ancestorClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/common/__tests__/open-with-claude-button.test.tsx --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// components/common/open-with-claude-button.tsx
'use client';

import { SquareTerminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openWithClaudeCode } from '@/lib/claude-code/open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

export type OpenWithClaudeVariant = 'row' | 'card' | 'cta';

type Props = {
  variant: OpenWithClaudeVariant;
  task: Task;
  project: Project | null;
  /**
   * Plain-text description. Pass an empty string from list/kanban
   * surfaces — they don't have Notion blocks loaded. The detail
   * surface should pass the extracted text.
   */
  description: string;
  className?: string;
};

const ARIA_LABEL = 'Abrir con Claude Code';

export function OpenWithClaudeButton({ variant, task, project, description, className }: Props) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void openWithClaudeCode({ task, project, description });
  }

  if (variant === 'cta') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ARIA_LABEL}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] sm:min-h-0 rounded-md',
          'text-[12px] font-medium text-white',
          'bg-[linear-gradient(135deg,#c15f3c_0%,#d97a4f_100%)] shadow-[0_1px_2px_rgba(193,95,60,.25)]',
          'transition-[transform,filter] duration-(--duration-fast) ease-(--ease-linear)',
          'hover:brightness-105 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c15f3c]',
          className,
        )}
      >
        <SquareTerminal className="w-3.5 h-3.5" aria-hidden />
        Abrir con Claude Code
      </button>
    );
  }

  // row + card share the icon-only style; sizing differs slightly.
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ARIA_LABEL}
      className={cn(
        'inline-grid place-items-center rounded-md text-muted-foreground shrink-0',
        'transition-[background-color,color,border-color] duration-(--duration-fast) ease-(--ease-linear)',
        'border border-transparent',
        'hover:text-[#c15f3c] hover:border-[#f5d4bb] hover:bg-[linear-gradient(135deg,#fef3ec_0%,#ffe8db_100%)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c15f3c]',
        variant === 'row' && 'w-9 h-9 sm:w-[26px] sm:h-[26px]',
        variant === 'card' && 'w-[22px] h-[22px]',
        className,
      )}
    >
      <SquareTerminal
        className={cn(variant === 'row' ? 'w-[14px] h-[14px]' : 'w-[13px] h-[13px]')}
        aria-hidden
      />
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- components/common/__tests__/open-with-claude-button.test.tsx --run`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add components/common/open-with-claude-button.tsx components/common/__tests__/open-with-claude-button.test.tsx
git commit -m "feat(common): add OpenWithClaudeButton (row/card/cta variants)"
```

---

## Task 8: Wire button into home `MyTasks`

**Files:**
- Modify: `components/home/my-tasks.tsx`
- Modify: caller of `MyTasks` (find via grep — likely `app/page.tsx` or `app/(app)/page.tsx`)

- [ ] **Step 1: Locate the `MyTasks` caller**

Run: `grep -rn "MyTasks" app components --include="*.tsx" | grep -v "my-tasks.tsx"`
Note the file and line — that's the caller. Read it to confirm it has access to a list of `Project` records (it should, since `Tu día`/home composes both tasks and projects).

- [ ] **Step 2: Update `MyTasks` to accept and use `projectsById`**

Change the `Props` type and the row markup. Replace the entire `Props` type and the `Link` body with the new versions:

```tsx
// near the top of components/home/my-tasks.tsx, alongside existing imports
import type { Project } from '@/schemas/project';
import { OpenWithClaudeButton } from '@/components/common/open-with-claude-button';
```

```tsx
type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  projectsById: Map<string, Project>;
};

export function MyTasks({ tasks, membersById, projectsById }: Props) {
  // ... existing empty-state branch unchanged ...
```

Inside the `tasks.map(...)` block, after the `<AssigneeStack ... />` div, add the button. Wrap the existing `<Link>` row contents so the button can sit alongside the `Link` *as a sibling* — `<button>` inside `<a>` is invalid HTML. The fix: change the row container from `<Link>` to a relatively-positioned `<div>` that contains both a `<Link>` (covering the row via `absolute inset-0`) and the button (with `relative z-10`):

Replace the existing `<Link href={...} key={t.id} ...>...</Link>` with:

```tsx
<div
  key={t.id}
  className={cn(
    'relative flex items-center gap-2.5 px-3 sm:px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 hover:bg-[#f7f7f8] active:bg-[#f0f0f1] transition-colors',
    i < tasks.length - 1 && 'border-b border-border',
  )}
>
  <Link
    href={`/tareas/${t.id}`}
    className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    aria-label={t.title}
  />
  <span
    className={cn(
      'relative w-3.5 h-3.5 rounded-full border-[1.5px] shrink-0',
      t.status === 'Done' && 'bg-[#3f9f5c] border-[#3f9f5c]',
      t.status === 'In Progress' && 'border-[#5e6ad2]',
      (t.status === 'Not Started' || t.status === 'Refining') && 'border-muted-foreground',
    )}
    style={
      t.status === 'In Progress'
        ? { background: 'conic-gradient(#5e6ad2 0 60%, transparent 60% 100%)' }
        : undefined
    }
  />
  <PriorityIcon priority={t.priority} />
  <span className="relative text-[13px] flex-1 min-w-0 truncate">{t.title}</span>
  {t.tags[0] && (
    <span className="relative hidden sm:inline">
      <TagChip tag={t.tags[0]} />
    </span>
  )}
  <span className="relative hidden sm:inline shrink-0">
    <DueCell dueDate={t.dueDate} />
  </span>
  <div className="relative shrink-0 min-w-[20px]">
    <AssigneeStack assignees={assignees} size={20} />
  </div>
  <div className="relative shrink-0">
    <OpenWithClaudeButton
      variant="row"
      task={t}
      project={t.projectId ? (projectsById.get(t.projectId) ?? null) : null}
      description=""
    />
  </div>
</div>
```

The trick: the `<Link>` is absolutely positioned over the row and is the row's main click target. Children carrying `relative` win the z-stack, and the button with its own click handler that calls `e.stopPropagation()` won't trigger the link's navigation. This avoids invalid HTML (button-in-anchor) and keeps the row tappable.

- [ ] **Step 3: Update the caller of `MyTasks` to pass `projectsById`**

Open the file from Step 1. If it already fetches projects (it almost certainly does — the home `ActiveProjects` module needs them), build a Map and pass it:

```tsx
const projectsById = new Map(projects.map((p) => [p.id, p]));
// ...
<MyTasks tasks={...} membersById={...} projectsById={projectsById} />
```

If projects aren't fetched yet, add `queryProjectsByCustomer(ctx.customerId)` to the `Promise.all` block alongside the existing fetches.

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — every caller of `MyTasks` has been updated.

- [ ] **Step 5: Update existing `MyTasks` tests if any**

Run: `ls components/home/__tests__ 2>/dev/null` — if there are existing tests for `MyTasks`, they will fail because the new `projectsById` prop is required. Add `projectsById={new Map()}` to those test renders so they still pass. If no tests exist for `MyTasks`, skip this step.

Run: `npm run test -- components/home --run`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/home/my-tasks.tsx app/page.tsx app/\(app\)/page.tsx components/home/__tests__/ 2>/dev/null
git commit -m "feat(home): add Open with Claude Code button to MyTasks rows"
```

---

## Task 9: Wire button into `ProjectTasksModule`

**Files:**
- Modify: `components/projects/project-tasks-module.tsx`

- [ ] **Step 1: Update props and import the button**

Top of file:

```tsx
import { OpenWithClaudeButton } from '@/components/common/open-with-claude-button';
import type { Project } from '@/schemas/project';
```

Change the props from `{ tasks: Task[] }` to `{ tasks: Task[]; project: Project }`:

```tsx
export function ProjectTasksModule({ tasks, project }: { tasks: Task[]; project: Project }) {
```

- [ ] **Step 2: Switch each row from `<Link>` to relative-positioned div + add button**

Same pattern as Task 8 Step 2. Replace the inner `<Link href={`/tareas/${t.id}`} ...>` with a wrapping `<div>` that contains an absolute-positioned `<Link>` and the row's existing children + the button. Result for the `<li>` body:

```tsx
<li key={t.id}>
  <div className="relative flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors">
    <Link
      href={`/tareas/${t.id}`}
      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset rounded"
      aria-label={t.title}
    />
    <span
      className={cn(
        'relative w-3.5 h-3.5 rounded border-[1.5px] shrink-0',
        done ? 'bg-[#3f9f5c] border-[#3f9f5c]' : 'border-[#c9cbe8]',
      )}
    />
    <span className={cn('relative text-[12.5px] flex-1 min-w-0 truncate', done && 'line-through text-muted-foreground')}>
      {t.title}
    </span>
    {t.dueDate && !done && (
      <span className="relative text-[10px] text-muted-foreground shrink-0">{fmtDue(t.dueDate)}</span>
    )}
    <span
      className={cn(
        'relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium shrink-0',
        pill.bg,
        pill.text,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', pill.dot)} />
      {t.status}
    </span>
    <div className="relative shrink-0">
      <OpenWithClaudeButton variant="row" task={t} project={project} description="" />
    </div>
  </div>
</li>
```

- [ ] **Step 3: Update the caller — find via grep**

Run: `grep -rn "ProjectTasksModule" app components --include="*.tsx" | grep -v "project-tasks-module.tsx"`

In the caller, pass the `project` prop (the project being detailed is already in scope at that level).

- [ ] **Step 4: Update existing test**

`components/projects/__tests__/project-tasks-module.test.tsx` exists. Run it to see what breaks:

Run: `npm run test -- components/projects/__tests__/project-tasks-module.test.tsx --run`
Expected: FAIL — the test now needs to pass `project`.

Fix the test by adding a `project` fixture and passing it. Then re-run:

Run: `npm run test -- components/projects/__tests__/project-tasks-module.test.tsx --run`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add components/projects/project-tasks-module.tsx components/projects/__tests__/project-tasks-module.test.tsx components/projects/project-detail.tsx 2>/dev/null
git commit -m "feat(projects): add Open with Claude Code button to ProjectTasksModule rows"
```

---

## Task 10: Wire button into kanban `TaskCard`

**Files:**
- Modify: `components/kanban/card.tsx`

- [ ] **Step 1: Import the button and accept `project` in props**

Top of file:

```tsx
import { OpenWithClaudeButton } from '@/components/common/open-with-claude-button';
import type { Project } from '@/schemas/project';
```

Update the `Props` type:

```tsx
type Props = {
  task: Task;
  assignees?: TeamMember[];
  project?: Project | null;
  showDayChip?: boolean;
  isOverlay?: boolean;
};
```

Change the destructure:

```tsx
export function TaskCard({ task, assignees = [], project = null, showDayChip, isOverlay }: Props) {
```

- [ ] **Step 2: Render the button as an absolute-positioned overlay**

Inside the outer `<div ref={setNodeRef} ...>`, add the button as the first child. Set the parent to `relative group` (already has `relative` siblings via children — add `group` to the className list and `relative` if not already there — the existing className starts with `bg-white border ... rounded-md p-2.5 ...`, add `group relative`):

Replace `'bg-white border border-border rounded-md ...'` with `'group relative bg-white border border-border rounded-md ...'`.

Add this just inside the `<div ref={setNodeRef} ...>` opening, before the `<div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1 min-w-0">`:

```tsx
{!isOverlay && (
  <div
    onPointerDown={(e) => e.stopPropagation()}
    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 sm:transition-opacity duration-150 max-sm:opacity-100"
  >
    <OpenWithClaudeButton variant="card" task={task} project={project} description="" />
  </div>
)}
```

The `onPointerDown` stopPropagation defends against `useSortable`'s drag handlers picking up the click. The `max-sm:opacity-100` keeps it always-visible on touch devices where `:hover` is unreliable.

- [ ] **Step 3: Update callers of `TaskCard` to pass `project`**

Run: `grep -rn "<TaskCard" components --include="*.tsx"`

For each caller (`column.tsx`, `board-classic.tsx`, `board-by-person.tsx`, `board-week.tsx`, `kanban-view.tsx` — likely the column/board components), thread a `projectsById` map down and pass `project={projectsById.get(task.projectId ?? '') ?? null}`.

The cleanest place to thread it is `KanbanView` — it's the top of the kanban tree. Have `KanbanView` accept a `projectsById: Map<string, Project>` prop, then pass it through `column.tsx` and the `board-*` components down to `TaskCard`. `app/(app)/tareas/page.tsx` already builds the kanban; have it call `queryProjectsByCustomer(ctx.customerId)` and build the map.

For `kanban-view.tsx` (and parents that don't yet have project data), add the prop in this order:
1. `app/(app)/tareas/page.tsx` — add `queryProjectsByCustomer` to the `Promise.all`, build `projectsById`, pass to `<KanbanView projectsById={projectsById} ... />`.
2. `KanbanView` — accept `projectsById`, pass to all board variants.
3. `board-classic.tsx`, `board-by-person.tsx`, `board-week.tsx` — accept and pass through.
4. `column.tsx` — accept and pass to `<TaskCard>`.

If the project tasks module's local board (if there is one) reuses `TaskCard`, do the same threading.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 5: Run existing kanban tests**

Run: `npm run test -- components/kanban --run`
Expected: PASS — none of the existing tests assert on the new button, so they should continue to pass with `project` defaulting to `null` where omitted.

- [ ] **Step 6: Commit**

```bash
git add components/kanban/ "app/(app)/tareas/page.tsx"
git commit -m "feat(kanban): add Open with Claude Code button to TaskCard"
```

---

## Task 11: Wire CTA into `TaskDetail` footer

**Files:**
- Modify: `components/kanban/task-detail.tsx`

- [ ] **Step 1: Import the button and the plain-text extractor**

Top of file:

```tsx
import { OpenWithClaudeButton } from '@/components/common/open-with-claude-button';
import { extractPlainText } from '@/lib/claude-code/extract-plain-text';
```

- [ ] **Step 2: Compute `description` once**

Inside the component body, just after the `crumbs` const:

```tsx
const description = extractPlainText(blocks);
```

- [ ] **Step 3: Replace the footer**

Replace the existing footer block:

```tsx
{/* Footer */}
<div className="px-4 sm:px-6 py-2 sm:py-2.5 border-t border-border bg-[#fafafa] flex items-center justify-between gap-3 shrink-0">
  <span className="hidden sm:inline text-[11px] text-muted-foreground">
    Esc para volver
  </span>
  <a ...>Abrir en Notion ...</a>
</div>
```

with:

```tsx
{/* Footer */}
<div className="px-4 sm:px-6 py-2 sm:py-2.5 border-t border-border bg-[#fafafa] flex items-center justify-between gap-3 flex-wrap shrink-0">
  <span className="hidden sm:inline text-[11px] text-muted-foreground">
    Esc para volver · <kbd className="font-mono text-[10px] bg-[#eef0f2] rounded px-1 py-[1px]">⌘⇧.</kbd> abrir con Claude
  </span>
  <div className="flex items-center gap-2 ml-auto">
    <a
      href={task.url}
      target="_blank"
      rel="noreferrer"
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-[40px] sm:min-h-0')}
    >
      Abrir en Notion <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
    </a>
    <OpenWithClaudeButton
      variant="cta"
      task={task}
      project={project}
      description={description}
    />
  </div>
</div>
```

- [ ] **Step 4: Create the keyboard shortcut component**

`task-detail.tsx` is a server component (no `'use client'` directive). The keyboard listener needs `useEffect`, so we extract a small invisible client component dedicated to shortcuts.

Create `components/kanban/task-detail-shortcuts.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { openWithClaudeCode } from '@/lib/claude-code/open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

type Props = { task: Task; project: Project | null; description: string };

/**
 * Renders nothing — registers the ⌘⇧. (Cmd/Ctrl+Shift+.) shortcut
 * that triggers `openWithClaudeCode` from the task detail page.
 */
export function TaskDetailShortcuts({ task, project, description }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.shiftKey && e.key === '.') {
        e.preventDefault();
        void openWithClaudeCode({ task, project, description });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, project, description]);
  return null;
}
```

In `task-detail.tsx`, import it and render once at the top of the returned JSX (right after the opening `<article>` tag):

```tsx
import { TaskDetailShortcuts } from './task-detail-shortcuts';
// ...
return (
  <article className="flex flex-col h-full overflow-hidden">
    <TaskDetailShortcuts task={task} project={project} description={description} />
    <TaskDetailHeader crumbs={crumbs} />
    {/* ...rest unchanged... */}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Run existing detail tests**

Run: `npm run test -- components/kanban/__tests__ --run`
Expected: PASS — `TaskDetailHeader` tests don't touch the footer, so they're unaffected.

- [ ] **Step 7: Manual smoke check**

Run: `npm run dev`. Open `http://localhost:4000`, navigate to any task detail. Verify:
1. The "Abrir con Claude Code" button appears in the footer with the orange gradient.
2. Clicking it opens `claude.ai/code` in a new tab and shows the success toast.
3. Pressing `⌘⇧.` (Mac) or `Ctrl+Shift+.` triggers the same flow.
4. The hint `⌘⇧. abrir con Claude` appears in the footer on screens ≥ `sm`.

If any of those four checks fail, return to the relevant step and fix before committing.

- [ ] **Step 8: Commit**

```bash
git add components/kanban/task-detail.tsx components/kanban/task-detail-shortcuts.tsx
git commit -m "feat(detail): add Open with Claude Code CTA + ⌘⇧. shortcut"
```

---

## Task 12: Full test suite + typecheck

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npm run test -- --run`
Expected: PASS — all suites green.

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS — no type errors.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: PASS — no lint errors.

- [ ] **Step 4: If anything failed, fix it. No commit needed for this task — green is the deliverable.**

---

## Task 13: Manual mobile smoke check

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Open Chrome DevTools mobile emulation at iPhone 12 Pro size and verify:**

1. Home `/` — `MyTasks` rows show the terminal icon at the right edge; tap area is at least 40×40px (use the inspector ruler).
2. `/tareas` — kanban cards show the icon in the top-right (always visible on touch since hover doesn't apply).
3. Project detail (`/proyectos/[id]`) — task rows show the icon.
4. Task detail (`/tareas/[id]`) — the orange CTA wraps below the "Abrir en Notion" button on narrow viewports rather than overflowing.
5. Tapping any of the icons opens `claude.ai/code` and triggers the toast.

- [ ] **Step 3: If layout breaks at any size, fix in the relevant component file and re-verify before continuing.**

No commit needed — adjustments roll into the next commit if any are required.

---

## Task 14: Notion-side documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-04-29-open-with-claude-code-design.md` (add a "Manual setup" appendix if not already present)

- [ ] **Step 1: Document the Notion property setup in the spec**

Append to the spec:

```markdown
## Manual setup (one-time)

In the Notion **Projects** database:
1. Add a new property of type **URL**, named exactly `Repo URL`.
2. For each project that should support "Open with Claude Code", paste the GitHub repo URL (e.g. `https://github.com/me/notion-hub`). Leave empty for projects without a repo — the button still works, the prompt just omits the `Repo:` line.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/specs/2026-04-29-open-with-claude-code-design.md
git commit -m "docs(spec): document Notion 'Repo URL' property setup"
```

- [ ] **Step 3: Tell the user**

Remind the user to add the `Repo URL` property in Notion and fill it in for at least one project so the end-to-end flow can be tested with a real repo URL in the prompt.

---

## Done.

The full feature is implemented across the four surfaces (home rows, project rows, kanban cards, detail CTA) with keyboard shortcut, three pure helpers under unit tests, one shared component, and a Notion property mapping. The toast UX handles popup-blocked, clipboard-failed, and success cases.
