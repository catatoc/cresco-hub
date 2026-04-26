# Quick‑Create estilo Linear — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el flujo de quick‑create estilo Linear definido en `docs/superpowers/specs/2026-04-26-quick-create-design.md`: shortcut `C` global + botón **+ Crear** en sidebar abren un modal centrado para crear **Tarea** (default) o **Wiki**, heredando contexto de la URL.

**Architecture:** Provider con `useGlobalHotkey('c')` montado en `app/(app)/layout.tsx`. `CreateModal` reutiliza el patrón de `Dialog` de shadcn/base-ui ya en uso por `SearchPalette`. Forms locales (React state, no RHF). `POST /api/create` con discriminated union Zod, `GET /api/create/options` para chips async. Notion mapping reusa los helpers ya tipados en `lib/notion/{tasks,wiki}.ts`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Zod, base-ui Dialog, Tailwind v4, sonner, vitest + Testing Library, Notion SDK.

**Convenciones del codebase a respetar:**
- Tests con `vitest` + `vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }))` (ver `lib/notion/__tests__/tasks.test.ts`).
- Componentes de UI desde `@/components/ui/*` (Dialog, Sheet, Button, etc.).
- `requireContext()` (en `lib/auth/require-context.ts`) devuelve `AppContext` ya autenticado para Server Components / route handlers.
- `taskPrioritySchema` actual = `Low | Medium | High` (sin `Urgent`, contrario al spec — usaremos los 3 reales).
- `wikiCategorySchema` actual = enum fijo de 5 valores (`Proposal`, `Customer research`, `Strategy doc`, `Planning`, `Documentation`).

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `schemas/create.ts` | Zod inputs/outputs del endpoint `/api/create` (discriminated union). |
| `schemas/__tests__/create.test.ts` | Tests de validación de los schemas. |
| `app/api/create/route.ts` | `POST` handler — auth, validate, dispatch a `createTask`/`createWikiPage`. |
| `app/api/create/__tests__/route.test.ts` | Tests del handler. |
| `app/api/create/options/route.ts` | `GET` handler — devuelve opciones para chips (sprints/projects/team/meetings). |
| `app/api/create/options/__tests__/route.test.ts` | Tests del options handler. |
| `hooks/use-create-context.ts` | Lee `usePathname()` + `useSearchParams()` y devuelve `{ sprintId?, projectId?, meetingId? }`. |
| `hooks/__tests__/use-create-context.test.ts` | Tests del hook. |
| `components/create/create-provider.tsx` | Context + `useGlobalHotkey('c')` con guards. Expone `open(type?)` y `close()`. |
| `components/create/__tests__/create-provider.test.tsx` | Tests de hotkey y guards. |
| `components/create/create-trigger.tsx` | Botón **+ Crear** con `kbd C` (sidebar). |
| `components/create/__tests__/create-trigger.test.tsx` | Tests del trigger. |
| `components/create/create-modal.tsx` | `Dialog` shell — toggle Tarea/Wiki, body por tipo, footer con shortcuts. Decide `Dialog` vs `Sheet` según viewport. |
| `components/create/__tests__/create-modal.test.tsx` | Tests de toggle, esc/confirm, foco. |
| `components/create/tarea-form.tsx` | Form Tarea: title + descripción + chips. State local. |
| `components/create/__tests__/tarea-form.test.tsx` | Tests de submit, validation, "crear otra". |
| `components/create/wiki-form.tsx` | Form Wiki: emoji + title + chips. |
| `components/create/__tests__/wiki-form.test.tsx` | Tests de submit, redirect, "crear otra". |
| `components/create/chips/chip-priority.tsx` | Popover select estático Low/Medium/High. |
| `components/create/chips/chip-date.tsx` | Popover date input nativo. |
| `components/create/chips/chip-category.tsx` | Popover multi‑select de las 5 categorías fijas. |
| `components/create/chips/chip-sprint.tsx` | Popover async (`/api/create/options?type=sprint`). |
| `components/create/chips/chip-project.tsx` | Popover async (`/api/create/options?type=project`). |
| `components/create/chips/chip-team.tsx` | Popover async multi‑select (`/api/create/options?type=team&q=...`). |
| `components/create/chips/chip-meeting.tsx` | Popover async (`/api/create/options?type=meeting`). |
| `components/create/chips/__tests__/chips.test.tsx` | Tests de los 7 chips. |
| `lib/auth/require-context.ts` | Helper si no existe — wrapper de `resolveContext` para route handlers. **Verificar antes de crear.** |

### Modified files

| Path | Change |
|---|---|
| `lib/notion/tasks.ts` | Extender `createTask` para aceptar `description?, projectId?, assigneeIds?, priority?, dueDate?`. Description → `blocks.children.append` con `paragraph`. |
| `lib/notion/__tests__/tasks.test.ts` | Añadir tests de la firma extendida. |
| `lib/notion/wiki.ts` | Añadir `createWikiPage(...)`. |
| `lib/notion/__tests__/wiki.test.ts` | Añadir tests de `createWikiPage`. |
| `app/(app)/layout.tsx` | Envolver con `<CreateProvider customerId={ctx.customerId}>`. |
| `components/shell/sidebar.tsx` | Montar `<CreateTrigger />` justo debajo de `<SearchTrigger />`. |

---

## Task 1: Zod schemas para el endpoint

**Files:**
- Create: `schemas/create.ts`
- Test: `schemas/__tests__/create.test.ts`

- [ ] **Step 1: Create the failing test**

```ts
// schemas/__tests__/create.test.ts
import { describe, it, expect } from 'vitest';
import { createTaskInput, createWikiInput, createInput } from '../create';

describe('createTaskInput', () => {
  const base = {
    type: 'task' as const,
    customerId: 'cust-1',
    title: 'Hola mundo',
  };

  it('accepts minimal valid payload', () => {
    expect(() => createTaskInput.parse(base)).not.toThrow();
  });

  it('rejects empty title', () => {
    expect(() => createTaskInput.parse({ ...base, title: '   ' })).toThrow();
  });

  it('rejects title > 200 chars', () => {
    expect(() => createTaskInput.parse({ ...base, title: 'a'.repeat(201) })).toThrow();
  });

  it('rejects empty customerId', () => {
    expect(() => createTaskInput.parse({ ...base, customerId: '' })).toThrow();
  });

  it('defaults assigneeIds to []', () => {
    const out = createTaskInput.parse(base);
    expect(out.assigneeIds).toEqual([]);
  });

  it('only accepts Low/Medium/High priority', () => {
    expect(() => createTaskInput.parse({ ...base, priority: 'Urgent' })).toThrow();
    expect(() => createTaskInput.parse({ ...base, priority: 'High' })).not.toThrow();
  });
});

describe('createWikiInput', () => {
  const base = {
    type: 'wiki' as const,
    customerId: 'cust-1',
    title: 'Onboarding doc',
  };

  it('defaults emoji to 📄', () => {
    const out = createWikiInput.parse(base);
    expect(out.emoji).toBe('📄');
  });

  it('defaults categories to []', () => {
    const out = createWikiInput.parse(base);
    expect(out.categories).toEqual([]);
  });

  it('only accepts the 5 wikiCategory values', () => {
    expect(() =>
      createWikiInput.parse({ ...base, categories: ['Other'] }),
    ).toThrow();
    expect(() =>
      createWikiInput.parse({ ...base, categories: ['Documentation'] }),
    ).not.toThrow();
  });
});

describe('createInput discriminated union', () => {
  it('rejects payload missing type', () => {
    expect(() => createInput.parse({ customerId: 'c', title: 't' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run schemas/__tests__/create.test.ts`
Expected: FAIL with "Cannot find module '../create'".

- [ ] **Step 3: Create the schemas**

```ts
// schemas/create.ts
import { z } from 'zod';
import { taskPrioritySchema } from './task';
import { wikiCategorySchema } from './wiki';

export const createTaskInput = z.object({
  type: z.literal('task'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  sprintId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).default([]), // Team relation
  priority: taskPrioritySchema.nullable().optional(),
  dueDate: z.string().date().nullable().optional(), // YYYY-MM-DD
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

export const createWikiInput = z.object({
  type: z.literal('wiki'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  emoji: z.string().max(8).default('📄'),
  categories: z.array(wikiCategorySchema).default([]),
  projectId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
});
export type CreateWikiInput = z.infer<typeof createWikiInput>;

export const createInput = z.discriminatedUnion('type', [
  createTaskInput,
  createWikiInput,
]);
export type CreateInput = z.infer<typeof createInput>;

export const createResult = z.object({
  id: z.string(),
  url: z.string(),
});
export type CreateResult = z.infer<typeof createResult>;
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run schemas/__tests__/create.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add schemas/create.ts schemas/__tests__/create.test.ts
git commit -m "feat(create): add Zod schemas for quick-create payloads"
```

---

## Task 2: Extender `createTask` con campos opcionales

**Files:**
- Modify: `lib/notion/tasks.ts:82-101`
- Modify: `lib/notion/__tests__/tasks.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `lib/notion/__tests__/tasks.test.ts` (inside the same file, top‑level new `describe`):

```ts
import { createTask } from '../tasks';

const mockNotionWithCreate = {
  ...mockNotion,
  pages: { ...mockNotion.pages, create: vi.fn() },
  blocks: { children: { append: vi.fn() } },
};

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotionWithCreate }));

describe('createTask (extended)', () => {
  beforeEach(() => {
    mockNotionWithCreate.pages.create.mockReset();
    mockNotionWithCreate.blocks.children.append.mockReset();
  });

  it('maps assigneeIds to Team relation (NOT Assignee people)', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({
      id: 'task-x',
      url: 'https://notion.so/task-x',
    });
    await createTask({
      customerId: 'cust-1',
      title: 'New task',
      assigneeIds: ['team-1', 'team-2'],
    });
    const call = mockNotionWithCreate.pages.create.mock.calls[0]![0];
    expect(call.properties.Team).toEqual({
      relation: [{ id: 'team-1' }, { id: 'team-2' }],
    });
    expect(call.properties.Assignee).toBeUndefined();
  });

  it('maps projectId, priority, dueDate', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({
      id: 't', url: 'u',
    });
    await createTask({
      customerId: 'c',
      title: 't',
      projectId: 'proj-1',
      priority: 'High',
      dueDate: '2026-05-01',
    });
    const props = mockNotionWithCreate.pages.create.mock.calls[0]![0].properties;
    expect(props.Project).toEqual({ relation: [{ id: 'proj-1' }] });
    expect(props.Priority).toEqual({ select: { name: 'High' } });
    expect(props.Due).toEqual({ date: { start: '2026-05-01' } });
  });

  it('appends description as paragraph block when present', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({
      id: 'task-y', url: 'u',
    });
    await createTask({
      customerId: 'c',
      title: 't',
      description: 'Hello body',
    });
    expect(mockNotionWithCreate.blocks.children.append).toHaveBeenCalledWith({
      block_id: 'task-y',
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'Hello body' } }],
          },
        },
      ],
    });
  });

  it('does NOT call blocks.append when description is empty', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({ id: 'x', url: 'u' });
    await createTask({ customerId: 'c', title: 't' });
    expect(mockNotionWithCreate.blocks.children.append).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/notion/__tests__/tasks.test.ts`
Expected: FAIL — `createTask` doesn't accept the new fields and doesn't append blocks.

- [ ] **Step 3: Extend `createTask`**

Replace the existing `createTask` in `lib/notion/tasks.ts` (lines 82‑101) with:

```ts
export async function createTask(args: {
  customerId: string;
  title: string;
  description?: string;
  sprintId?: string | null;
  projectId?: string | null;
  assigneeIds?: string[];
  priority?: 'Low' | 'Medium' | 'High' | null;
  dueDate?: string | null;
}): Promise<{ id: string; url: string }> {
  const notion = getNotion();
  const properties: Record<string, any> = {
    'Task name': { title: [{ text: { content: args.title } }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: args.customerId }] },
  };
  if (args.sprintId) properties.Sprint = { relation: [{ id: args.sprintId }] };
  if (args.projectId) properties.Project = { relation: [{ id: args.projectId }] };
  if (args.assigneeIds && args.assigneeIds.length > 0) {
    properties.Team = { relation: args.assigneeIds.map((id) => ({ id })) };
  }
  if (args.priority) properties.Priority = { select: { name: args.priority } };
  if (args.dueDate) properties.Due = { date: { start: args.dueDate } };

  const res = await notion.pages.create({
    parent: { database_id: serverEnv.NOTION_DB_TASKS },
    properties,
  });
  const id = (res as any).id as string;

  if (args.description && args.description.trim().length > 0) {
    await notion.blocks.children.append({
      block_id: id,
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: args.description } }],
          },
        },
      ],
    });
  }

  return { id, url: (res as any).url as string };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run lib/notion/__tests__/tasks.test.ts`
Expected: all pass (existing tests + 4 new).

- [ ] **Step 5: Commit**

```bash
git add lib/notion/tasks.ts lib/notion/__tests__/tasks.test.ts
git commit -m "feat(tasks): extend createTask with description, project, team, priority, dueDate"
```

---

## Task 3: Añadir `createWikiPage`

**Files:**
- Modify: `lib/notion/wiki.ts`
- Modify: `lib/notion/__tests__/wiki.test.ts`

- [ ] **Step 1: Add the failing test**

Append to `lib/notion/__tests__/wiki.test.ts`:

```ts
import { createWikiPage } from '../wiki';

const mockNotionWithCreate = {
  ...mockNotion,
  pages: { create: vi.fn() },
};
vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotionWithCreate }));

describe('createWikiPage', () => {
  beforeEach(() => mockNotionWithCreate.pages.create.mockReset());

  it('maps Doc name, Customer, icon emoji, default emoji 📄', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({
      id: 'wiki-x',
      url: 'https://notion.so/wiki-x',
    });
    const out = await createWikiPage({
      customerId: 'cust-1',
      title: 'Onboarding',
      emoji: '📘',
    });
    const call = mockNotionWithCreate.pages.create.mock.calls[0]![0];
    expect(call.properties['Doc name']).toEqual({
      title: [{ text: { content: 'Onboarding' } }],
    });
    expect(call.properties.Customer).toEqual({
      relation: [{ id: 'cust-1' }],
    });
    expect(call.icon).toEqual({ type: 'emoji', emoji: '📘' });
    expect(out).toEqual({ id: 'wiki-x', url: 'https://notion.so/wiki-x' });
  });

  it('maps categories as multi_select', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({
      customerId: 'c',
      title: 't',
      emoji: '📄',
      categories: ['Documentation', 'Planning'],
    });
    const props = mockNotionWithCreate.pages.create.mock.calls[0]![0].properties;
    expect(props.Category).toEqual({
      multi_select: [{ name: 'Documentation' }, { name: 'Planning' }],
    });
  });

  it('maps projectId and meetingId as relations when present', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({
      customerId: 'c',
      title: 't',
      emoji: '📄',
      projectId: 'proj-1',
      meetingId: 'meet-1',
    });
    const props = mockNotionWithCreate.pages.create.mock.calls[0]![0].properties;
    expect(props.Projects).toEqual({ relation: [{ id: 'proj-1' }] });
    expect(props.Meetings).toEqual({ relation: [{ id: 'meet-1' }] });
  });

  it('omits Projects/Meetings when not provided', async () => {
    mockNotionWithCreate.pages.create.mockResolvedValueOnce({ id: 'w', url: 'u' });
    await createWikiPage({ customerId: 'c', title: 't', emoji: '📄' });
    const props = mockNotionWithCreate.pages.create.mock.calls[0]![0].properties;
    expect(props.Projects).toBeUndefined();
    expect(props.Meetings).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/notion/__tests__/wiki.test.ts`
Expected: FAIL — `createWikiPage` not exported.

- [ ] **Step 3: Implement `createWikiPage`**

Append to `lib/notion/wiki.ts`:

```ts
export async function createWikiPage(args: {
  customerId: string;
  title: string;
  emoji: string;
  categories?: string[];
  projectId?: string | null;
  meetingId?: string | null;
}): Promise<{ id: string; url: string }> {
  const notion = getNotion();
  const properties: Record<string, any> = {
    'Doc name': { title: [{ text: { content: args.title } }] },
    Customer: { relation: [{ id: args.customerId }] },
  };
  if (args.categories && args.categories.length > 0) {
    properties.Category = {
      multi_select: args.categories.map((name) => ({ name })),
    };
  }
  if (args.projectId) properties.Projects = { relation: [{ id: args.projectId }] };
  if (args.meetingId) properties.Meetings = { relation: [{ id: args.meetingId }] };

  const res = await notion.pages.create({
    parent: { database_id: serverEnv.NOTION_DB_WIKI },
    icon: { type: 'emoji', emoji: args.emoji },
    properties,
  });
  return { id: (res as any).id, url: (res as any).url };
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run lib/notion/__tests__/wiki.test.ts`
Expected: PASS (existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add lib/notion/wiki.ts lib/notion/__tests__/wiki.test.ts
git commit -m "feat(wiki): add createWikiPage helper"
```

---

## Task 4: Endpoint `POST /api/create`

**Files:**
- Create: `app/api/create/route.ts`
- Test: `app/api/create/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/api/create/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));
vi.mock('@/lib/auth/context', () => ({
  resolveContext: vi.fn(),
}));
vi.mock('@/lib/notion/tasks', () => ({
  createTask: vi.fn(async () => ({ id: 'task-1', url: 'https://notion.so/task-1' })),
}));
vi.mock('@/lib/notion/wiki', () => ({
  createWikiPage: vi.fn(async () => ({ id: 'wiki-1', url: 'https://notion.so/wiki-1' })),
}));

import { resolveContext } from '@/lib/auth/context';
import { createTask } from '@/lib/notion/tasks';
import { createWikiPage } from '@/lib/notion/wiki';
import { POST } from '../route';

function req(body: unknown) {
  return new Request('http://localhost/api/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no user', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(req({ type: 'task', customerId: 'c', title: 't' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when no app context', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce(null);
    const res = await POST(req({ type: 'task', customerId: 'c', title: 't' }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when body customerId differs from ctx customerId', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'real-cust' });
    const res = await POST(req({ type: 'task', customerId: 'fake', title: 't' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 with first issue.message on Zod fail', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(req({ type: 'task', customerId: 'cust-1', title: '' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/title|small|String|empty/i);
  });

  it('dispatches task -> createTask, returns id+url', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(
      req({
        type: 'task',
        customerId: 'cust-1',
        title: 'Hola',
        sprintId: 'sp-1',
        priority: 'High',
      }),
    );
    expect(res.status).toBe(200);
    expect(createTask).toHaveBeenCalledWith({
      customerId: 'cust-1',
      title: 'Hola',
      description: undefined,
      sprintId: 'sp-1',
      projectId: undefined,
      assigneeIds: [],
      priority: 'High',
      dueDate: undefined,
    });
    const body = await res.json();
    expect(body).toEqual({ id: 'task-1', url: 'https://notion.so/task-1' });
  });

  it('dispatches wiki -> createWikiPage', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    const res = await POST(
      req({ type: 'wiki', customerId: 'cust-1', title: 'Doc' }),
    );
    expect(res.status).toBe(200);
    expect(createWikiPage).toHaveBeenCalled();
    const body = await res.json();
    expect(body.id).toBe('wiki-1');
  });

  it('returns 500 with toast-friendly error on createTask throw', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({
      data: { user: { email: 'x@y.com' } },
    });
    (resolveContext as any).mockResolvedValueOnce({ customerId: 'cust-1' });
    (createTask as any).mockRejectedValueOnce(new Error('Notion exploded'));
    const res = await POST(
      req({ type: 'task', customerId: 'cust-1', title: 't' }),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run app/api/create/__tests__/route.test.ts`
Expected: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Implement the route**

```ts
// app/api/create/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { createTask } from '@/lib/notion/tasks';
import { createWikiPage } from '@/lib/notion/wiki';
import { createInput } from '@/schemas/create';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
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

  const json = await req.json().catch(() => null);
  const parsed = createInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid-body' },
      { status: 400 },
    );
  }

  if (parsed.data.customerId !== ctx.customerId) {
    return NextResponse.json({ error: 'customer-mismatch' }, { status: 401 });
  }

  try {
    if (parsed.data.type === 'task') {
      const t = parsed.data;
      const created = await createTask({
        customerId: t.customerId,
        title: t.title,
        description: t.description,
        sprintId: t.sprintId ?? null,
        projectId: t.projectId ?? null,
        assigneeIds: t.assigneeIds,
        priority: t.priority ?? null,
        dueDate: t.dueDate ?? null,
      });
      return NextResponse.json({ id: created.id, url: created.url });
    } else {
      const w = parsed.data;
      const created = await createWikiPage({
        customerId: w.customerId,
        title: w.title,
        emoji: w.emoji,
        categories: w.categories,
        projectId: w.projectId ?? null,
        meetingId: w.meetingId ?? null,
      });
      return NextResponse.json({ id: created.id, url: created.url });
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'create-failed' },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run app/api/create/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/create/route.ts app/api/create/__tests__/route.test.ts
git commit -m "feat(api): POST /api/create — discriminated union task|wiki"
```

---

## Task 5: Endpoint `GET /api/create/options` (chip data)

Para que los chips async no llamen a Notion desde el cliente.

**Files:**
- Create: `app/api/create/options/route.ts`
- Test: `app/api/create/options/__tests__/route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// app/api/create/options/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = { auth: { getUser: vi.fn() } };
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));
vi.mock('@/lib/auth/context', () => ({ resolveContext: vi.fn() }));
vi.mock('@/lib/notion/sprints', () => ({
  listSprints: vi.fn(async () => [
    { id: 's1', sprintId: 12, name: 'Sprint 12', status: 'Current', startDate: null, endDate: null },
  ]),
}));
vi.mock('@/lib/notion/projects', () => ({
  queryProjectsByCustomer: vi.fn(async () => [
    { id: 'p1', name: 'Mogos', icon: '🚀', summary: null, status: null, priority: null, completion: null, ownerIds: [], customerId: 'c1', teamIds: [], startDate: null, endDate: null, url: 'u' },
  ]),
}));
vi.mock('@/lib/notion/team', () => ({
  queryMembersByCustomerAndName: vi.fn(async () => [
    { id: 'm1', name: 'Carlos', email: 'c@x', role: null, area: null, customerIds: ['c1'], projectIds: [] },
  ]),
}));
vi.mock('@/lib/notion/meetings', () => ({
  queryMeetingsByCustomer: vi.fn(async () => [
    { id: 'mt1', title: 'Standup', createdTime: '2026-04-26', date: null, endDate: null, meetingType: null, summary: null, attendeeIds: [], customerId: 'c1', projectIds: [], teamIds: [], taskIds: [], wikiIds: [], url: 'u' },
  ]),
}));

import { resolveContext } from '@/lib/auth/context';
import { GET } from '../route';

function req(query: string) {
  return new Request(`http://localhost/api/create/options?${query}`);
}

describe('GET /api/create/options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { email: 'x@y' } } });
    (resolveContext as any).mockResolvedValue({ customerId: 'c1' });
  });

  it('401 when no user', async () => {
    mockSupabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(req('type=sprint'));
    expect(res.status).toBe(401);
  });

  it('returns sprints array', async () => {
    const res = await GET(req('type=sprint'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.options).toHaveLength(1);
    expect(body.options[0]).toMatchObject({ id: 's1', label: expect.stringContaining('Sprint 12') });
  });

  it('returns projects array', async () => {
    const res = await GET(req('type=project'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'p1', label: 'Mogos' });
  });

  it('returns team members filtered by q', async () => {
    const res = await GET(req('type=team&q=car'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'm1', label: 'Carlos' });
  });

  it('returns meetings array', async () => {
    const res = await GET(req('type=meeting'));
    const body = await res.json();
    expect(body.options[0]).toMatchObject({ id: 'mt1', label: 'Standup' });
  });

  it('400 on unknown type', async () => {
    const res = await GET(req('type=unknown'));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run app/api/create/options/__tests__/route.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the route**

```ts
// app/api/create/options/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { listSprints } from '@/lib/notion/sprints';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { queryMembersByCustomerAndName } from '@/lib/notion/team';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';

export const dynamic = 'force-dynamic';

export type Option = { id: string; label: string; sublabel?: string };

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type');
  const q = url.searchParams.get('q') ?? '';

  let options: Option[] = [];
  if (type === 'sprint') {
    const sprints = await listSprints();
    options = sprints.map((s) => ({
      id: s.id,
      label: s.name,
      sublabel: s.status ?? undefined,
    }));
  } else if (type === 'project') {
    const projects = await queryProjectsByCustomer(ctx.customerId);
    options = projects.map((p) => ({
      id: p.id,
      label: p.name,
      sublabel: p.icon ?? undefined,
    }));
  } else if (type === 'team') {
    const members = await queryMembersByCustomerAndName(ctx.customerId, q);
    options = members.map((m) => ({
      id: m.id,
      label: m.name,
      sublabel: m.email,
    }));
  } else if (type === 'meeting') {
    const meetings = await queryMeetingsByCustomer(ctx.customerId);
    options = meetings.map((m) => ({
      id: m.id,
      label: m.title,
      sublabel: m.date ?? undefined,
    }));
  } else {
    return NextResponse.json({ error: 'invalid-type' }, { status: 400 });
  }

  return NextResponse.json({ options });
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run app/api/create/options/__tests__/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/create/options/route.ts app/api/create/options/__tests__/route.test.ts
git commit -m "feat(api): GET /api/create/options for chip data"
```

---

## Task 6: Hook `use-create-context`

**Files:**
- Create: `hooks/use-create-context.ts`
- Test: `hooks/__tests__/use-create-context.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// hooks/__tests__/use-create-context.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCreateContext } from '../use-create-context';

let mockPath = '/';
let mockParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPath,
  useSearchParams: () => mockParams,
}));

describe('useCreateContext', () => {
  it('returns sprintId when /tareas?sprint=abc', () => {
    mockPath = '/tareas';
    mockParams = new URLSearchParams('sprint=abc');
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ sprintId: 'abc' });
  });

  it('returns projectId when /proyectos/[id]', () => {
    mockPath = '/proyectos/proj-xyz';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ projectId: 'proj-xyz' });
  });

  it('returns meetingId when /reuniones/[id]', () => {
    mockPath = '/reuniones/m-1';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({ meetingId: 'm-1' });
  });

  it('returns {} when none apply', () => {
    mockPath = '/wiki';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({});
  });

  it('does not return sprintId for /tareas/[id] route', () => {
    mockPath = '/tareas/task-1';
    mockParams = new URLSearchParams();
    const { result } = renderHook(() => useCreateContext());
    expect(result.current).toEqual({});
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run hooks/__tests__/use-create-context.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

```ts
// hooks/use-create-context.ts
'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export type CreateInheritedContext = {
  sprintId?: string;
  projectId?: string;
  meetingId?: string;
};

export function useCreateContext(): CreateInheritedContext {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === '/tareas') {
    const sprint = searchParams.get('sprint');
    return sprint ? { sprintId: sprint } : {};
  }

  const projectMatch = pathname.match(/^\/proyectos\/([^/]+)$/);
  if (projectMatch) return { projectId: projectMatch[1]! };

  const meetingMatch = pathname.match(/^\/reuniones\/([^/]+)$/);
  if (meetingMatch) return { meetingId: meetingMatch[1]! };

  return {};
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run hooks/__tests__/use-create-context.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-create-context.ts hooks/__tests__/use-create-context.test.ts
git commit -m "feat(create): use-create-context hook"
```

---

## Task 7: `CreateProvider` con hotkey + guards

**Files:**
- Create: `components/create/create-provider.tsx`
- Test: `components/create/__tests__/create-provider.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/__tests__/create-provider.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProvider, useCreateContext as useCreateModalContext } from '../create-provider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Probe() {
  const ctx = useCreateModalContext();
  return (
    <div>
      <span data-testid="open">{String(ctx.isOpen)}</span>
      <span data-testid="type">{ctx.type}</span>
      <button onClick={() => ctx.open()}>open</button>
    </div>
  );
}

function setup() {
  return render(
    <CreateProvider customerId="cust-1">
      <Probe />
    </CreateProvider>,
  );
}

describe('CreateProvider', () => {
  it('starts closed with type=task', () => {
    setup();
    expect(screen.getByTestId('open').textContent).toBe('false');
    expect(screen.getByTestId('type').textContent).toBe('task');
  });

  it('opens via context.open()', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('opens when pressing C globally', () => {
    setup();
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('does NOT open when ⌘C', () => {
    setup();
    fireEvent.keyDown(window, { key: 'c', metaKey: true });
    expect(screen.getByTestId('open').textContent).toBe('false');
  });

  it('does NOT open when focus is on an input', () => {
    setup();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('false');
    document.body.removeChild(input);
  });

  it('does NOT open when another dialog is open', () => {
    setup();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('data-state', 'open');
    document.body.appendChild(dialog);
    fireEvent.keyDown(window, { key: 'c' });
    expect(screen.getByTestId('open').textContent).toBe('false');
    document.body.removeChild(dialog);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/__tests__/create-provider.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement provider**

```tsx
// components/create/create-provider.tsx
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { CreateModal } from './create-modal';

export type CreateType = 'task' | 'wiki';

type CreateContextValue = {
  isOpen: boolean;
  type: CreateType;
  open: (type?: CreateType) => void;
  close: () => void;
  setType: (type: CreateType) => void;
};

const CreateContext = createContext<CreateContextValue | null>(null);

export function useCreateContext(): CreateContextValue {
  const v = useContext(CreateContext);
  if (!v) throw new Error('useCreateContext must be used inside <CreateProvider>');
  return v;
}

const STORAGE_KEY = 'create:last-type';

function readInitialType(): CreateType {
  if (typeof window === 'undefined') return 'task';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'wiki' ? 'wiki' : 'task';
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function isAnotherDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}

export function CreateProvider({
  customerId,
  children,
}: {
  customerId: string;
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setTypeState] = useState<CreateType>('task');

  // Restore last type once on mount.
  useEffect(() => {
    setTypeState(readInitialType());
  }, []);

  const open = useCallback((t?: CreateType) => {
    if (t) {
      setTypeState(t);
      window.localStorage.setItem(STORAGE_KEY, t);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const setType = useCallback((t: CreateType) => {
    setTypeState(t);
    window.localStorage.setItem(STORAGE_KEY, t);
  }, []);

  // Global C hotkey with guards.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() !== 'c') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      if (isAnotherDialogOpen()) return;
      e.preventDefault();
      // Override contextual: if URL is /wiki/..., open as wiki.
      if (window.location.pathname.startsWith('/wiki/')) {
        setTypeState('wiki');
      }
      setIsOpen(true);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <CreateContext.Provider value={{ isOpen, type, open, close, setType }}>
      {children}
      {isOpen && <CreateModal customerId={customerId} />}
    </CreateContext.Provider>
  );
}
```

Note: this references `CreateModal` which doesn't exist yet — Task 9 implements it. To unblock the test, also create a stub:

```tsx
// components/create/create-modal.tsx (STUB — replaced in Task 9)
'use client';
export function CreateModal({ customerId: _customerId }: { customerId: string }) {
  return null;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run components/create/__tests__/create-provider.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/create/create-provider.tsx components/create/create-modal.tsx components/create/__tests__/create-provider.test.tsx
git commit -m "feat(create): provider with global C hotkey + guards"
```

---

## Task 8: `CreateTrigger` botón + montar en Sidebar

**Files:**
- Create: `components/create/create-trigger.tsx`
- Test: `components/create/__tests__/create-trigger.test.tsx`
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/__tests__/create-trigger.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CreateProvider, useCreateContext } from '../create-provider';
import { CreateTrigger } from '../create-trigger';

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Probe() {
  const ctx = useCreateContext();
  return <span data-testid="open">{String(ctx.isOpen)}</span>;
}

describe('CreateTrigger', () => {
  it('opens the modal when clicked', () => {
    render(
      <CreateProvider customerId="cust-1">
        <CreateTrigger />
        <Probe />
      </CreateProvider>,
    );
    expect(screen.getByTestId('open').textContent).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: /Crear/i }));
    expect(screen.getByTestId('open').textContent).toBe('true');
  });

  it('renders kbd C', () => {
    render(
      <CreateProvider customerId="cust-1">
        <CreateTrigger />
      </CreateProvider>,
    );
    expect(screen.getByText('C')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/__tests__/create-trigger.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement trigger** (mirrors `SearchTrigger`)

```tsx
// components/create/create-trigger.tsx
'use client';

import { Plus } from 'lucide-react';
import { useCreateContext } from './create-provider';

export function CreateTrigger() {
  const { open } = useCreateContext();
  return (
    <button
      onClick={() => open()}
      aria-label="Crear (C)"
      aria-keyshortcuts="c"
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-[13px] font-normal text-muted-foreground hover:bg-black/[0.04] hover:text-foreground transition-colors cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">Crear</span>
      <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground font-[inherit]">
        C
      </kbd>
    </button>
  );
}
```

- [ ] **Step 4: Mount it in the sidebar**

Edit `components/shell/sidebar.tsx`. Add the import and put `<CreateTrigger />` directly under `<SearchTrigger />`:

```tsx
import { SearchTrigger } from '@/components/search/search-trigger';
import { CreateTrigger } from '@/components/create/create-trigger';
// ...
<div className="pb-3">
  <SearchTrigger />
  <CreateTrigger />
  <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />} exact>
    Home
  </NavItem>
</div>
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run components/create/__tests__/create-trigger.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/create/create-trigger.tsx components/create/__tests__/create-trigger.test.tsx components/shell/sidebar.tsx
git commit -m "feat(create): + Crear trigger button in sidebar"
```

---

## Task 9: Wire `CreateProvider` en `app/(app)/layout.tsx`

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Edit layout**

Add `CreateProvider` wrapping `SearchProvider` (or the other way; either works). Final shape:

```tsx
import { CreateProvider } from '@/components/create/create-provider';
// ...
<CreateProvider customerId={ctx.customerId}>
  <SearchProvider customerId={ctx.customerId}>
    <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
      <Sidebar context={ctx} />
      <AnimatedMain>{children}</AnimatedMain>
    </div>
    {modal}
  </SearchProvider>
</CreateProvider>
```

- [ ] **Step 2: Smoke-check the dev server boots**

Run: `npm run dev`. Open http://localhost:3000 (or the port the project uses), log in, press `C`. The empty `CreateModal` stub renders nothing visible yet — that's expected. Press `Esc` (no effect yet, fine). Confirm no console errors.

- [ ] **Step 3: Commit**

```bash
git add app/(app)/layout.tsx
git commit -m "feat(create): mount CreateProvider in app layout"
```

---

## Task 10: `CreateModal` shell (toggle + footer + close confirmation)

**Files:**
- Modify: `components/create/create-modal.tsx` (replace stub)
- Test: `components/create/__tests__/create-modal.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/__tests__/create-modal.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CreateProvider, useCreateContext } from '../create-provider';

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function Opener() {
  const ctx = useCreateContext();
  return <button onClick={() => ctx.open('task')}>open</button>;
}

function setup() {
  return render(
    <CreateProvider customerId="cust-1">
      <Opener />
    </CreateProvider>,
  );
}

describe('CreateModal shell', () => {
  it('renders the type toggle (Tarea active by default)', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    const tarea = screen.getByRole('button', { name: /Tipo: Tarea/i });
    expect(tarea).toHaveAttribute('aria-pressed', 'true');
  });

  it('switching to Wiki preserves the title', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.change(screen.getByPlaceholderText(/Título/i), {
      target: { value: 'Hola' },
    });
    fireEvent.click(screen.getByRole('button', { name: /cambiar a Wiki/i }));
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument();
  });

  it('shows the shortcut footer', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    expect(screen.getByText(/⌘↵.*Crear/)).toBeInTheDocument();
    expect(screen.getByText(/⇧⌘↵.*otra/)).toBeInTheDocument();
    expect(screen.getByText(/Esc.*cerrar/)).toBeInTheDocument();
  });

  it('Esc with empty title closes silently', () => {
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByPlaceholderText(/Título/i)).not.toBeInTheDocument();
  });

  it('Esc with non-empty title prompts confirm', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    setup();
    fireEvent.click(screen.getByText('open'));
    fireEvent.change(screen.getByPlaceholderText(/Título/i), {
      target: { value: 'Hola' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(confirmSpy).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Hola')).toBeInTheDocument(); // not closed
    confirmSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/__tests__/create-modal.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the modal shell**

```tsx
// components/create/create-modal.tsx (REPLACE the stub)
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateContext, type CreateType } from './create-provider';
import { TareaForm } from './tarea-form';
import { WikiForm } from './wiki-form';

export function CreateModal({ customerId }: { customerId: string }) {
  const { isOpen, type, setType, close } = useCreateContext();

  // Title/description shared across type switches (preserved per spec).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  // Esc handler with confirm
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (title.trim().length === 0) {
        close();
      } else {
        const ok = window.confirm('¿Descartar?');
        if (ok) close();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, title, close]);

  function handleOpenChange(open: boolean) {
    if (open) return;
    if (title.trim().length === 0) close();
    else if (window.confirm('¿Descartar?')) close();
  }

  const isTask = type === 'task';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogTitle className="sr-only">Crear {isTask ? 'tarea' : 'wiki'}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick‑create modal. Tab to navigate, ⌘↵ to submit.
        </DialogDescription>

        <div className="px-4 pt-3 pb-2 flex items-center gap-1.5 border-b">
          <TypePill
            active={isTask}
            label="📝 Tarea"
            ariaLabel={`Tipo: Tarea${isTask ? ', activo' : ', presiona para cambiar a Tarea'}`}
            onClick={() => setType('task')}
          />
          <TypePill
            active={!isTask}
            label="📖 Wiki"
            ariaLabel={`Tipo: Wiki${!isTask ? ', activo' : ', presiona para cambiar a Wiki'}`}
            onClick={() => setType('wiki')}
          />
        </div>

        <div className="px-4 py-3">
          {isTask ? (
            <TareaForm
              customerId={customerId}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              titleRef={titleRef}
            />
          ) : (
            <WikiForm
              customerId={customerId}
              title={title}
              onTitleChange={setTitle}
              titleRef={titleRef}
            />
          )}
        </div>

        <div className="px-4 py-2.5 border-t bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>⌘↵ Crear · ⇧⌘↵ Crear otra · Esc cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypePill({
  active,
  label,
  ariaLabel,
  onClick,
}: {
  active: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={
        'text-[12px] px-2.5 py-1 rounded-md transition-colors ' +
        (active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-black/[0.04]')
      }
    >
      {label}
    </button>
  );
}
```

Stub the two forms minimally so the test compiles (they get fleshed out in Tasks 13–14):

```tsx
// components/create/tarea-form.tsx (STUB)
'use client';
import type { Ref } from 'react';
export function TareaForm({
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={titleRef}
      autoFocus
      placeholder="Título de la tarea…"
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      className="w-full text-base outline-none bg-transparent"
    />
  );
}

// components/create/wiki-form.tsx (STUB)
'use client';
import type { Ref } from 'react';
export function WikiForm({
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={titleRef}
      autoFocus
      placeholder="Título de la página…"
      value={title}
      onChange={(e) => onTitleChange(e.target.value)}
      className="w-full text-base outline-none bg-transparent"
    />
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run components/create/__tests__/create-modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/create/create-modal.tsx components/create/tarea-form.tsx components/create/wiki-form.tsx components/create/__tests__/create-modal.test.tsx
git commit -m "feat(create): modal shell with type toggle and shortcut footer"
```

---

## Task 11: Static chips (priority, date, category)

**Files:**
- Create: `components/create/chips/chip-priority.tsx`
- Create: `components/create/chips/chip-date.tsx`
- Create: `components/create/chips/chip-category.tsx`
- Create: `components/create/chips/__tests__/chips-static.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// components/create/chips/__tests__/chips-static.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChipPriority } from '../chip-priority';
import { ChipDate } from '../chip-date';
import { ChipCategory } from '../chip-category';

describe('ChipPriority', () => {
  it('renders + Prioridad when value is null', () => {
    render(<ChipPriority value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Prioridad')).toBeInTheDocument();
  });

  it('shows the selected value', () => {
    render(<ChipPriority value="High" onChange={() => {}} />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('calls onChange when an option is picked', () => {
    const onChange = vi.fn();
    render(<ChipPriority value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Prioridad'));
    fireEvent.click(screen.getByText('Medium'));
    expect(onChange).toHaveBeenCalledWith('Medium');
  });

  it('clears via the ✕ button when value is set', () => {
    const onChange = vi.fn();
    render(<ChipPriority value="High" onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/Quitar prioridad/i));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});

describe('ChipDate', () => {
  it('renders + Fecha when value is null', () => {
    render(<ChipDate value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Fecha')).toBeInTheDocument();
  });

  it('shows YYYY-MM-DD when set', () => {
    render(<ChipDate value="2026-05-01" onChange={() => {}} />);
    expect(screen.getByText('2026-05-01')).toBeInTheDocument();
  });

  it('calls onChange with new date', () => {
    const onChange = vi.fn();
    render(<ChipDate value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Fecha'));
    const input = screen.getByLabelText(/Fecha/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '2026-05-10' } });
    expect(onChange).toHaveBeenCalledWith('2026-05-10');
  });
});

describe('ChipCategory', () => {
  it('renders + Categoría when empty', () => {
    render(<ChipCategory value={[]} onChange={() => {}} />);
    expect(screen.getByText('+ Categoría')).toBeInTheDocument();
  });

  it('shows count when categories selected', () => {
    render(
      <ChipCategory value={['Documentation', 'Planning']} onChange={() => {}} />,
    );
    expect(screen.getByText(/Categoría · 2/)).toBeInTheDocument();
  });

  it('toggles a category', () => {
    const onChange = vi.fn();
    render(<ChipCategory value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Categoría'));
    fireEvent.click(screen.getByText('Documentation'));
    expect(onChange).toHaveBeenCalledWith(['Documentation']);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/chips/__tests__/chips-static.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the chips**

```tsx
// components/create/chips/chip-priority.tsx
'use client';
import { useState } from 'react';
import type { TaskPriority } from '@/schemas/task';

const OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High'];

export function ChipPriority({
  value,
  onChange,
}: {
  value: TaskPriority | null;
  onChange: (v: TaskPriority | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        {value}
        <button
          type="button"
          aria-label="Quitar prioridad"
          onClick={() => onChange(null)}
          className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center"
        >
          ✕
        </button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground"
      >
        + Prioridad
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[120px]">
          {OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
              onClick={() => {
                onChange(p);
                setOpen(false);
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
```

```tsx
// components/create/chips/chip-date.tsx
'use client';
import { useState } from 'react';

export function ChipDate({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        {value}
        <button
          type="button"
          aria-label="Quitar fecha"
          onClick={() => onChange(null)}
          className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center"
        >
          ✕
        </button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground"
      >
        + Fecha
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-2">
          <label className="text-[11px] block text-muted-foreground mb-1" htmlFor="chip-date-input">
            Fecha
          </label>
          <input
            id="chip-date-input"
            aria-label="Fecha"
            type="date"
            className="text-[12px] border rounded px-1.5 py-1"
            onChange={(e) => {
              const v = e.target.value;
              if (v) {
                onChange(v);
                setOpen(false);
              }
            }}
          />
        </div>
      )}
    </span>
  );
}
```

```tsx
// components/create/chips/chip-category.tsx
'use client';
import { useState } from 'react';
import type { WikiCategory } from '@/schemas/wiki';

const OPTIONS: WikiCategory[] = [
  'Proposal',
  'Customer research',
  'Strategy doc',
  'Planning',
  'Documentation',
];

export function ChipCategory({
  value,
  onChange,
}: {
  value: WikiCategory[];
  onChange: (v: WikiCategory[]) => void;
}) {
  const [open, setOpen] = useState(false);
  function toggle(cat: WikiCategory) {
    onChange(value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat]);
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          value.length > 0
            ? 'px-2 py-0.5 rounded-md text-[11px] bg-amber-50 text-amber-700'
            : 'px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground'
        }
      >
        {value.length > 0 ? `Categoría · ${value.length}` : '+ Categoría'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[180px]">
          {OPTIONS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggle(c)}
              className="flex items-center gap-2 w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
            >
              <span className="w-3 inline-block">{value.includes(c) ? '✓' : ''}</span>
              {c}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npx vitest run components/create/chips/__tests__/chips-static.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/create/chips/chip-priority.tsx components/create/chips/chip-date.tsx components/create/chips/chip-category.tsx components/create/chips/__tests__/chips-static.test.tsx
git commit -m "feat(create): static chips (priority, date, category)"
```

---

## Task 12: Async chips (sprint, project, team, meeting)

Comparten el patrón "fetch + popover + select". Implementa un helper `useChipOptions(type, q?)` y los 4 chips.

**Files:**
- Create: `components/create/chips/use-chip-options.ts`
- Create: `components/create/chips/chip-sprint.tsx`
- Create: `components/create/chips/chip-project.tsx`
- Create: `components/create/chips/chip-team.tsx`
- Create: `components/create/chips/chip-meeting.tsx`
- Create: `components/create/chips/__tests__/chips-async.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/chips/__tests__/chips-async.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChipSprint } from '../chip-sprint';
import { ChipTeam } from '../chip-team';

const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal('fetch', mockFetch);
});

describe('ChipSprint', () => {
  it('shows + Sprint when empty', () => {
    render(<ChipSprint value={null} onChange={() => {}} />);
    expect(screen.getByText('+ Sprint')).toBeInTheDocument();
  });

  it('fetches and lists options on open', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        options: [{ id: 's1', label: 'Sprint 12', sublabel: 'Current' }],
      }),
    });
    render(<ChipSprint value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByText('+ Sprint'));
    await waitFor(() => {
      expect(screen.getByText('Sprint 12')).toBeInTheDocument();
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/create/options?type=sprint');
  });

  it('selecting an option calls onChange with id+label', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ options: [{ id: 's1', label: 'Sprint 12' }] }),
    });
    const onChange = vi.fn();
    render(<ChipSprint value={null} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Sprint'));
    await waitFor(() => screen.getByText('Sprint 12'));
    fireEvent.click(screen.getByText('Sprint 12'));
    expect(onChange).toHaveBeenCalledWith({ id: 's1', label: 'Sprint 12' });
  });
});

describe('ChipTeam (multi-select with q)', () => {
  it('debounces search query', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [{ id: 'm1', label: 'Carlos' }] }),
    });
    render(<ChipTeam value={[]} onChange={() => {}} />);
    fireEvent.click(screen.getByText('+ Asignar'));
    const input = screen.getByPlaceholderText(/Buscar/i);
    fireEvent.change(input, { target: { value: 'car' } });
    await waitFor(() => screen.getByText('Carlos'));
    expect(mockFetch).toHaveBeenCalledWith('/api/create/options?type=team&q=car');
  });

  it('toggles a member into the value array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ options: [{ id: 'm1', label: 'Carlos' }] }),
    });
    const onChange = vi.fn();
    render(<ChipTeam value={[]} onChange={onChange} />);
    fireEvent.click(screen.getByText('+ Asignar'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar/i), {
      target: { value: 'car' },
    });
    await waitFor(() => screen.getByText('Carlos'));
    fireEvent.click(screen.getByText('Carlos'));
    expect(onChange).toHaveBeenCalledWith([{ id: 'm1', label: 'Carlos' }]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/chips/__tests__/chips-async.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the helper hook**

```ts
// components/create/chips/use-chip-options.ts
'use client';
import { useEffect, useState } from 'react';

export type ChipOption = { id: string; label: string; sublabel?: string };

export function useChipOptions(
  type: 'sprint' | 'project' | 'team' | 'meeting',
  q?: string,
  enabled?: boolean,
) {
  const [data, setData] = useState<ChipOption[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const params = new URLSearchParams({ type });
    if (q && q.length > 0) params.set('q', q);
    setLoading(true);
    fetch(`/api/create/options?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.resolve({ options: [] })))
      .then((j: { options: ChipOption[] }) => {
        if (!cancelled) setData(j.options);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, q, enabled]);

  return { data, loading };
}
```

- [ ] **Step 4: Implement the four chips**

```tsx
// components/create/chips/chip-sprint.tsx
'use client';
import { useState } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipSprint({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useChipOptions('sprint', undefined, open);

  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        🏃 {value.label}
        <button
          type="button"
          aria-label="Quitar sprint"
          onClick={() => onChange(null)}
          className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center"
        >
          ✕
        </button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground"
      >
        + Sprint
      </button>
      {open && (
        <Popover loading={loading} options={data}
          onPick={(opt) => { onChange({ id: opt.id, label: opt.label }); setOpen(false); }} />
      )}
    </span>
  );
}

function Popover({
  loading,
  options,
  onPick,
}: {
  loading: boolean;
  options: ChipOption[] | null;
  onPick: (o: ChipOption) => void;
}) {
  return (
    <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[200px] max-h-[240px] overflow-y-auto">
      {loading && !options ? (
        <div className="space-y-1 p-1">
          {[0,1,2].map((i) => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}
        </div>
      ) : options && options.length > 0 ? (
        options.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onPick(o)}
            className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
          >
            {o.label}
            {o.sublabel && <span className="ml-1 text-muted-foreground">{o.sublabel}</span>}
          </button>
        ))
      ) : (
        <div className="px-2 py-1 text-[12px] text-muted-foreground">Sin resultados</div>
      )}
    </div>
  );
}
```

```tsx
// components/create/chips/chip-project.tsx — same shape as ChipSprint, type='project', label '+ Proyecto', icon '📂'
'use client';
import { useState } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipProject({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useChipOptions('project', undefined, open);
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        📂 {value.label}
        <button type="button" aria-label="Quitar proyecto" onClick={() => onChange(null)} className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center">✕</button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground">
        + Proyecto
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[200px] max-h-[240px] overflow-y-auto">
          {loading && !data ? <Skeleton /> : (data && data.length > 0
            ? data.map((o: ChipOption) => (
                <button key={o.id} type="button" onClick={() => { onChange({ id: o.id, label: o.label }); setOpen(false); }} className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded">
                  {o.label}
                </button>
              ))
            : <div className="px-2 py-1 text-[12px] text-muted-foreground">Sin resultados</div>)}
        </div>
      )}
    </span>
  );
}
function Skeleton() {
  return <div className="space-y-1 p-1">{[0,1,2].map((i) => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}</div>;
}
```

```tsx
// components/create/chips/chip-team.tsx (multi-select with debounced q)
'use client';
import { useState, useEffect } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipTeam({
  value,
  onChange,
}: {
  value: ChipValue[];
  onChange: (v: ChipValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  const { data, loading } = useChipOptions('team', debouncedQ, open && debouncedQ.length > 0);

  function toggle(o: ChipOption) {
    const idx = value.findIndex((v) => v.id === o.id);
    if (idx >= 0) onChange(value.filter((v) => v.id !== o.id));
    else onChange([...value, { id: o.id, label: o.label }]);
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          value.length > 0
            ? 'px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700'
            : 'px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground'
        }
      >
        {value.length > 0 ? `Asignar · ${value.length}` : '+ Asignar'}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[220px]">
          <input
            autoFocus
            placeholder="Buscar miembro…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full text-[12px] px-2 py-1 outline-none border-b mb-1"
          />
          {loading ? (
            <div className="space-y-1 p-1">
              {[0,1].map((i) => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}
            </div>
          ) : data && data.length > 0 ? (
            data.map((o) => {
              const checked = value.some((v) => v.id === o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => toggle(o)}
                  className="flex items-center gap-2 w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded"
                >
                  <span className="w-3 inline-block">{checked ? '✓' : ''}</span>
                  {o.label}
                </button>
              );
            })
          ) : debouncedQ ? (
            <div className="px-2 py-1 text-[12px] text-muted-foreground">Sin resultados</div>
          ) : null}
        </div>
      )}
    </span>
  );
}
```

```tsx
// components/create/chips/chip-meeting.tsx — same shape as ChipSprint, type='meeting', label '+ Reunión', icon '📅'
'use client';
import { useState } from 'react';
import { useChipOptions, type ChipOption } from './use-chip-options';

export type ChipValue = { id: string; label: string };

export function ChipMeeting({
  value,
  onChange,
}: {
  value: ChipValue | null;
  onChange: (v: ChipValue | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data, loading } = useChipOptions('meeting', undefined, open);
  if (value) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-indigo-50 text-indigo-700">
        📅 {value.label}
        <button type="button" aria-label="Quitar reunión" onClick={() => onChange(null)} className="hover:bg-black/[0.06] rounded-sm w-3 h-3 inline-flex items-center justify-center">✕</button>
      </span>
    );
  }
  return (
    <span className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="px-2 py-0.5 rounded-md text-[11px] border border-dashed text-muted-foreground hover:text-foreground">
        + Reunión
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 min-w-[220px] max-h-[240px] overflow-y-auto">
          {loading && !data ? (
            <div className="space-y-1 p-1">{[0,1,2].map((i) => <div key={i} className="h-5 bg-muted rounded animate-pulse" />)}</div>
          ) : data && data.length > 0 ? (
            data.map((o: ChipOption) => (
              <button key={o.id} type="button" onClick={() => { onChange({ id: o.id, label: o.label }); setOpen(false); }} className="block w-full text-left px-2 py-1 text-[12px] hover:bg-black/[0.04] rounded">
                {o.label}
              </button>
            ))
          ) : (
            <div className="px-2 py-1 text-[12px] text-muted-foreground">Sin resultados</div>
          )}
        </div>
      )}
    </span>
  );
}
```

- [ ] **Step 5: Run tests, verify pass**

Run: `npx vitest run components/create/chips/__tests__/chips-async.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/create/chips/
git commit -m "feat(create): async chips (sprint, project, team, meeting)"
```

---

## Task 13: `TareaForm` completo + integración con context inheritance

**Files:**
- Modify: `components/create/tarea-form.tsx` (replace stub)
- Test: `components/create/__tests__/tarea-form.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/__tests__/tarea-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { TareaForm } from '../tarea-form';

const mockUseCreate = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };

vi.mock('next/navigation', () => ({
  usePathname: () => '/tareas',
  useSearchParams: () => new URLSearchParams('sprint=ctx-sprint'),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('../create-provider', () => ({
  useCreateContext: () => mockUseCreate(),
}));
vi.mock('sonner', () => ({ toast: mockToast }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ options: [] }) })),
  );
  mockUseCreate.mockReturnValue({
    isOpen: true,
    type: 'task',
    open: vi.fn(),
    close: vi.fn(),
    setType: vi.fn(),
  });
});

describe('TareaForm', () => {
  it('renders pre-filled Sprint chip from context', () => {
    render(
      <TareaForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText(/ctx-sprint|Sprint/i)).toBeInTheDocument();
  });

  it('does NOT render a Customer chip', () => {
    render(
      <TareaForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.queryByText(/Customer|c1/i)).not.toBeInTheDocument();
  });

  it('shows char counter when over 200', () => {
    const long = 'a'.repeat(205);
    render(
      <TareaForm
        customerId="c1"
        title={long}
        onTitleChange={() => {}}
        description=""
        onDescriptionChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText(/205\/200/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/__tests__/tarea-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement TareaForm**

```tsx
// components/create/tarea-form.tsx (REPLACE the stub)
'use client';

import { useEffect, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateContext } from './create-provider';
import { useCreateContext as useInheritedContext } from '@/hooks/use-create-context';
import { ChipSprint } from './chips/chip-sprint';
import { ChipProject } from './chips/chip-project';
import { ChipTeam, type ChipValue as TeamValue } from './chips/chip-team';
import { ChipPriority } from './chips/chip-priority';
import { ChipDate } from './chips/chip-date';
import type { TaskPriority } from '@/schemas/task';

type ChipValue = { id: string; label: string };

export function TareaForm({
  customerId,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  const router = useRouter();
  const { close } = useCreateContext();
  const inherited = useInheritedContext();

  const [sprint, setSprint] = useState<ChipValue | null>(
    inherited.sprintId ? { id: inherited.sprintId, label: 'Sprint heredado' } : null,
  );
  const [project, setProject] = useState<ChipValue | null>(
    inherited.projectId ? { id: inherited.projectId, label: 'Proyecto heredado' } : null,
  );
  const [assignees, setAssignees] = useState<TeamValue[]>([]);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const tooLong = title.length > 200;
  const canSubmit = title.trim().length > 0 && !tooLong && !submitting;

  async function submit(opts: { another: boolean }) {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          customerId,
          title: title.slice(0, 200),
          description: description || undefined,
          sprintId: sprint?.id ?? null,
          projectId: project?.id ?? null,
          assigneeIds: assignees.map((a) => a.id),
          priority,
          dueDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'No pude crear la tarea');
        setSubmitting(false);
        return;
      }
      const created = await res.json();
      toast.success('Tarea creada', {
        action: {
          label: 'Ver',
          onClick: () => router.push(`/tareas/${created.id}`),
        },
      });
      if (window.location.pathname.startsWith('/tareas')) router.refresh();
      if (opts.another) {
        // Preserve type, sprint, project. Clear the rest. Refocus title.
        onTitleChange('');
        onDescriptionChange('');
        setAssignees([]);
        setPriority(null);
        setDueDate(null);
        setSubmitting(false);
        if (titleRef && 'current' in titleRef && titleRef.current) {
          titleRef.current.focus();
        }
      } else {
        close();
      }
    } catch (e) {
      toast.error('No pude crear la tarea. Reintentar');
      setSubmitting(false);
    }
  }

  // Cmd+Enter / Cmd+Shift+Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      submit({ another: e.shiftKey });
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, sprint, project, assignees, priority, dueDate]);

  return (
    <div className="space-y-3">
      <input
        ref={titleRef}
        autoFocus
        placeholder="Título de la tarea…"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full text-base outline-none bg-transparent placeholder:text-muted-foreground"
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={2}
        className="w-full text-[13px] outline-none bg-transparent resize-none placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <ChipSprint value={sprint} onChange={setSprint} />
        <ChipProject value={project} onChange={setProject} />
        <ChipTeam value={assignees} onChange={setAssignees} />
        <ChipPriority value={priority} onChange={setPriority} />
        <ChipDate value={dueDate} onChange={setDueDate} />
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
          />
          Crear otra (⇧⌘↵)
        </label>
        <div className="flex items-center gap-2">
          {tooLong && (
            <span className="text-[11px] text-red-600">{title.length}/200</span>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit({ another: createAnother })}
            className="text-[12px] px-3 py-1 rounded-md bg-foreground text-background disabled:opacity-50"
          >
            {submitting ? 'Creando…' : 'Crear ⌘↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/create/__tests__/tarea-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/create/tarea-form.tsx components/create/__tests__/tarea-form.test.tsx
git commit -m "feat(create): TareaForm with chips, context inheritance, submit, crear otra"
```

---

## Task 14: `WikiForm` completo

**Files:**
- Modify: `components/create/wiki-form.tsx` (replace stub)
- Test: `components/create/__tests__/wiki-form.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/create/__tests__/wiki-form.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createRef } from 'react';
import { WikiForm } from '../wiki-form';

const mockPush = vi.fn();
const mockClose = vi.fn();
const mockToast = { success: vi.fn(), error: vi.fn() };

vi.mock('next/navigation', () => ({
  usePathname: () => '/proyectos/proj-1',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
}));
vi.mock('../create-provider', () => ({
  useCreateContext: () => ({
    isOpen: true,
    type: 'wiki',
    open: vi.fn(),
    close: mockClose,
    setType: vi.fn(),
  }),
}));
vi.mock('sonner', () => ({ toast: mockToast }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('WikiForm', () => {
  it('renders default emoji 📄', () => {
    render(
      <WikiForm
        customerId="c1"
        title=""
        onTitleChange={() => {}}
        titleRef={createRef()}
      />,
    );
    expect(screen.getByText('📄')).toBeInTheDocument();
  });

  it('on submit OK redirects to /wiki/[id]', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wiki-1', url: 'u' }),
    });
    let title = 'Doc';
    render(
      <WikiForm
        customerId="c1"
        title={title}
        onTitleChange={(v) => (title = v)}
        titleRef={createRef()}
      />,
    );
    fireEvent.click(screen.getByText(/Crear/i));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/wiki/wiki-1'));
    expect(mockClose).toHaveBeenCalled();
  });

  it('"Crear otra" with Wiki does NOT redirect, shows toast with Abrir', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'wiki-1', url: 'u' }),
    });
    render(
      <WikiForm
        customerId="c1"
        title="Doc"
        onTitleChange={() => {}}
        titleRef={createRef()}
      />,
    );
    fireEvent.click(screen.getByLabelText(/Crear otra/i));
    fireEvent.click(screen.getByText(/Crear/i));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalledWith('/wiki/wiki-1');
    const opts = mockToast.success.mock.calls[0][1];
    expect(opts.action.label).toBe('Abrir');
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npx vitest run components/create/__tests__/wiki-form.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement WikiForm**

```tsx
// components/create/wiki-form.tsx (REPLACE the stub)
'use client';

import { useEffect, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateContext } from './create-provider';
import { useCreateContext as useInheritedContext } from '@/hooks/use-create-context';
import { ChipProject } from './chips/chip-project';
import { ChipMeeting } from './chips/chip-meeting';
import { ChipCategory } from './chips/chip-category';
import type { WikiCategory } from '@/schemas/wiki';

type ChipValue = { id: string; label: string };

const EMOJI_CHOICES = ['📄', '📘', '📙', '📕', '📗', '🗂', '📋', '✨', '🚀', '🐛'];

export function WikiForm({
  customerId,
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  const router = useRouter();
  const { close } = useCreateContext();
  const inherited = useInheritedContext();

  const [emoji, setEmoji] = useState('📄');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [project, setProject] = useState<ChipValue | null>(
    inherited.projectId ? { id: inherited.projectId, label: 'Proyecto heredado' } : null,
  );
  const [meeting, setMeeting] = useState<ChipValue | null>(
    inherited.meetingId ? { id: inherited.meetingId, label: 'Reunión heredada' } : null,
  );
  const [submitting, setSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const tooLong = title.length > 200;
  const canSubmit = title.trim().length > 0 && !tooLong && !submitting;

  async function submit(opts: { another: boolean }) {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'wiki',
          customerId,
          title: title.slice(0, 200),
          emoji,
          categories,
          projectId: project?.id ?? null,
          meetingId: meeting?.id ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'No pude crear la wiki');
        setSubmitting(false);
        return;
      }
      const created = await res.json();
      if (opts.another) {
        toast.success('Wiki creada', {
          action: { label: 'Abrir', onClick: () => router.push(`/wiki/${created.id}`) },
        });
        onTitleChange('');
        setCategories([]);
        setSubmitting(false);
        if (titleRef && 'current' in titleRef && titleRef.current) {
          titleRef.current.focus();
        }
      } else {
        close();
        router.push(`/wiki/${created.id}`);
      }
    } catch {
      toast.error('No pude crear la wiki. Reintentar');
      setSubmitting(false);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      submit({ another: e.shiftKey });
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, emoji, categories, project, meeting]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="text-lg w-8 h-8 inline-flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100"
            aria-label="Cambiar emoji"
          >
            {emoji}
          </button>
          {emojiOpen && (
            <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 grid grid-cols-5 gap-1">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmoji(e); setEmojiOpen(false); }}
                  className="text-lg w-7 h-7 hover:bg-black/[0.04] rounded"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </span>
        <input
          ref={titleRef}
          autoFocus
          placeholder="Título de la página…"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 text-base outline-none bg-transparent placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <ChipCategory value={categories} onChange={setCategories} />
        <ChipProject value={project} onChange={setProject} />
        <ChipMeeting value={meeting} onChange={setMeeting} />
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
            aria-label="Crear otra"
          />
          Crear otra (⇧⌘↵)
        </label>
        <div className="flex items-center gap-2">
          {tooLong && (
            <span className="text-[11px] text-red-600">{title.length}/200</span>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit({ another: createAnother })}
            className="text-[12px] px-3 py-1 rounded-md bg-foreground text-background disabled:opacity-50"
          >
            {submitting ? 'Creando…' : 'Crear y abrir ⌘↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run components/create/__tests__/wiki-form.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/create/wiki-form.tsx components/create/__tests__/wiki-form.test.tsx
git commit -m "feat(create): WikiForm with emoji picker, categories, redirect on submit"
```

---

## Task 15: Smoke run + manual end-to-end

**Files:** none (manual verification + bug fixes if found).

- [ ] **Step 1: Run typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero errors. If any TS errors, fix inline.

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: all green.

- [ ] **Step 3: Boot dev server and walk the golden path manually**

Run: `npm run dev`. Open the app in Chrome. Log in. Then:

1. Navigate to `/tareas?sprint=<some-real-sprint-id>`. Press `C`. Modal opens with Tarea active and Sprint chip pre-filled. Type "Test desde C", press `⌘↵`. Toast appears with "Ver". List refreshes, the new task is visible.
2. Navigate to `/proyectos/<some-real-project-id>`. Press `C`. Project chip pre-filled. Click toggle to Wiki — title from previous form is preserved (clear it). Type "Notas test", press `⌘↵`. Browser navigates to `/wiki/[new-id]`.
3. Press `C` while focused inside the search input (`⌘K → click input`). Confirm typing "c" inserts the letter and does NOT open the create modal.
4. Open the modal. Tick "Crear otra (⇧⌘↵)". Type a title, `⇧⌘↵`. Modal stays open with empty title. Repeat 2 more times. Confirm 3 toasts visible.
5. Open the modal, type a title, press `Esc`. Browser confirm dialog appears. Cancel → modal stays. Press `Esc` again, confirm → modal closes.
6. Press `C` while another dialog is open (open `⌘K` first). Confirm `C` types "c" into the search input, doesn't open create.

- [ ] **Step 4: Fix any bugs found in step 3, commit each fix separately.**

- [ ] **Step 5: Final commit (if any fixes)**

```bash
# Per-bug commits, e.g.:
git commit -m "fix(create): <specific bug>"
```

---

## Self-Review Notes

**Spec coverage check:**

- ✅ Section 1 (resumen) → Tasks 7–14.
- ✅ Section 2 (archivos) → Tasks 1, 2, 3 (libs), 4, 5 (api), 6 (hook), 7 (provider), 8 (trigger+sidebar), 9 (layout), 10 (modal), 11–12 (chips), 13–14 (forms).
- ✅ Section 3 (apertura, context, submit, crear otra, cierre, guards) → Tasks 7 (provider/hotkey/guards), 6 (context), 10 (modal/Esc), 13–14 (submit + crear otra).
- ✅ Section 4 (schemas, endpoint, mapping, fetch, refresh) → Tasks 1, 2, 3, 4, 13, 14.
- ✅ Section 5 errores → Tasks 4 (5xx, 401, 400 server-side); Tasks 13–14 (toast.error, retry).
- ✅ Section 5 validación cliente → Tasks 13–14 (disabled button, char counter > 200).
- ✅ Section 5 edge cases (sprint borrado, customer change, race ⌘K, crear otra Wiki) → Tasks 4 (mismatch 401), 7 (guard otro dialog), 14 (no redirect en crear otra).
- ✅ Section 5 a11y (aria-label, kbd footer, autofocus, tab order) → Tasks 8 (aria-keyshortcuts), 10 (aria-label toggle, footer, sr-only title), 13–14 (autoFocus on title).
- ⚠️ Section 5 telemetría → **NOT in plan.** The spec has telemetry events but no existing telemetry infrastructure was introduced. **Decision:** drop from this iteration; the existing `search:no-results` event uses raw `window.dispatchEvent(new CustomEvent(...))` — adding the same pattern is trivial and can be a follow-up commit. Documented as known gap.
- ⚠️ Section 5 mobile/Sheet → **NOT in plan.** Drop from this iteration (desktop ships first). Documented as known gap.
- ✅ Section 6 testing → covered task by task with TDD.

**Known deviations from spec (intentional, called out):**

1. **Priority enum:** spec says `Low | Medium | High | Urgent`. Existing `taskPrioritySchema` is `Low | Medium | High`. Plan uses the existing 3 values to stay aligned with the rest of the codebase.
2. **Categoría:** spec says "multi_select" generically. Existing `wikiCategorySchema` is a fixed enum of 5. Plan uses the 5.
3. **Telemetría and Mobile Sheet:** dropped from initial scope (see above). Easy follow-ups.

**Type consistency check:** All `ChipValue = { id, label }`, `CreateType = 'task' | 'wiki'`, `useCreateContext()` (provider) vs `useCreateContext()` (inherited hook from `@/hooks`) — same name, different module. Plan imports them with the alias `useInheritedContext` in forms to avoid clash. Verified each usage.
