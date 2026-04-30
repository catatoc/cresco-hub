# Team / Customer Scoping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limitar Home / Reuniones / Tareas / Proyectos a "lo del usuario logueado dentro del Customer activo", con toggle `Yo · Equipo` y paginación real para `/tareas` (cap 500).

**Architecture:** 4 capas — (1) Notion query layer con paginación + variantes filtradas por member; (2) `lib/scope/` con resolver y server action genéricos + 4 cookies independientes; (3) páginas que ramifican según scope; (4) `<ScopePill>` compartido en `components/common/` + `<TruncationBanner>` en /tareas.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Vitest, Notion SDK (`@notionhq/client`), Tailwind 4, motion, Zod, Supabase Auth (SSR), `date-fns`.

**Spec:** `docs/superpowers/specs/2026-04-30-team-customer-scoping-design.md`

**Repo conventions a respetar:**
- Tests con Vitest. Mock pattern típico:
  ```ts
  vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
  vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));
  const mockNotion = { dataSources: { query: vi.fn() } };
  ```
- Tests existentes a referenciar: `lib/notion/__tests__/projects.test.ts`, `lib/tareas/__tests__/scope.test.ts`, `lib/home/__tests__/queries.test.ts`.
- Comandos:
  - Tests acotados: `npm run test:run -- <path>`
  - Suite completa: `npm run test:run`
  - Type check: `npm run typecheck`
  - Dev server: `npm run dev` (puerto 4000)
- Estilo Linear-ish ya establecido: bg `#eeeffc`, text `#5e6ad2`, border `#c9cbe8`. Empty states con `border-dashed border-border`.
- `'use server'` siempre al tope del archivo si la función es una server action.
- Cookies: `cookies()` de `next/headers`, opciones `{ path: '/', maxAge: ONE_YEAR, sameSite: 'lax' }`.
- Redirects post-server-action: `redirect()` de `next/navigation`.

---

## PR1 — Pagination Core + Tasks /team paginado con cap

**Outcome:** `/tareas?scope=team` deja de perder filas silenciosamente. Si se topan 500 tareas, se muestra banner ámbar guiando a filtrar. Sin cambios en `mine`.

### Task 1.1 — Crear helper `queryAllPages` con tests primero

**Files:**
- Create: `lib/notion/pagination.ts`
- Test: `lib/notion/__tests__/pagination.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/notion/__tests__/pagination.test.ts
import { describe, it, expect, vi } from 'vitest';
import { queryAllPages } from '../pagination';

describe('queryAllPages', () => {
  it('returns single page when has_more=false', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      results: [1, 2, 3],
      has_more: false,
      next_cursor: null,
    });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1, 2, 3]);
    expect(out.truncated).toBe(false);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(undefined);
  });

  it('loops until has_more=false using next_cursor', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1, 2], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [3, 4], has_more: true, next_cursor: 'c2' })
      .mockResolvedValueOnce({ results: [5], has_more: false, next_cursor: null });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1, 2, 3, 4, 5]);
    expect(out.truncated).toBe(false);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 'c1');
    expect(fetchPage).toHaveBeenNthCalledWith(3, 'c2');
  });

  it('truncates exactly at cap and sets truncated=true', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1, 2, 3], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [4, 5, 6], has_more: true, next_cursor: 'c2' });
    const out = await queryAllPages(fetchPage, { cap: 5 });
    expect(out.items).toEqual([1, 2, 3, 4, 5]);
    expect(out.truncated).toBe(true);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('cap=Infinity loops without ever truncating', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: Array(100).fill(0), has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: Array(100).fill(0), has_more: false, next_cursor: null });
    const out = await queryAllPages(fetchPage, { cap: Infinity });
    expect(out.items).toHaveLength(200);
    expect(out.truncated).toBe(false);
  });

  it('propagates errors from underlying fetcher', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ results: [1], has_more: true, next_cursor: 'c1' })
      .mockRejectedValueOnce(new Error('boom'));
    await expect(queryAllPages(fetchPage, { cap: 100 })).rejects.toThrow('boom');
  });

  it('does not call fetcher again after has_more=false even if next_cursor is set', async () => {
    const fetchPage = vi.fn().mockResolvedValueOnce({
      results: [1],
      has_more: false,
      next_cursor: 'c1',
    });
    const out = await queryAllPages(fetchPage, { cap: 100 });
    expect(out.items).toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test:run -- lib/notion/__tests__/pagination.test.ts`
Expected: FAIL — module `../pagination` not found.

- [ ] **Step 3: Implement minimal**

```ts
// lib/notion/pagination.ts
type Page<T> = {
  results: T[];
  has_more: boolean;
  next_cursor: string | null;
};

/**
 * Loop a Notion paginated query using start_cursor / has_more / next_cursor
 * until exhausted or `cap` items are collected. Pass `cap: Infinity` for
 * uncapped (small-volume) collections.
 *
 * `truncated` is true iff the cap was hit before exhaustion.
 */
export async function queryAllPages<T>(
  fetchPage: (cursor?: string) => Promise<Page<T>>,
  opts: { cap: number },
): Promise<{ items: T[]; truncated: boolean }> {
  const { cap } = opts;
  const items: T[] = [];
  let cursor: string | undefined = undefined;

  while (true) {
    const page = await fetchPage(cursor);
    items.push(...page.results);

    if (items.length >= cap) {
      return { items: items.slice(0, cap), truncated: true };
    }

    if (!page.has_more) {
      return { items, truncated: false };
    }

    cursor = page.next_cursor ?? undefined;
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- lib/notion/__tests__/pagination.test.ts`
Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/notion/pagination.ts lib/notion/__tests__/pagination.test.ts
git commit -m "feat(notion): 📄 add queryAllPages helper with cap support"
```

### Task 1.2 — Agregar `queryTasksByCustomerAndSprintPaginated` con tests

**Files:**
- Modify: `lib/notion/tasks.ts` (add new export, keep existing for now)
- Test: `lib/notion/__tests__/tasks-paginated.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/notion/__tests__/tasks-paginated.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryTasksByCustomerAndSprintPaginated } from '../tasks';

const taskRow = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  properties: {
    'Task name': { title: [{ plain_text: id }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: 'cust-1' }] },
  },
});

describe('queryTasksByCustomerAndSprintPaginated', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses Customer + Sprint filter when sprintId provided', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [taskRow('t1')],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('tasks-ds');
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Sprint', relation: { contains: 'sprint-7' } },
      ],
    });
  });

  it('uses only Customer filter when sprintId is null', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerAndSprintPaginated('cust-1', null);
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({ property: 'Customer', relation: { contains: 'cust-1' } });
  });

  it('paginates with start_cursor until has_more=false', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: [taskRow('t1'), taskRow('t2')],
        has_more: true,
        next_cursor: 'cur-1',
      })
      .mockResolvedValueOnce({
        results: [taskRow('t3')],
        has_more: false,
        next_cursor: null,
      });

    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    expect(out.tasks.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    expect(out.truncated).toBe(false);
    expect(mockNotion.dataSources.query.mock.calls[1]![0].start_cursor).toBe('cur-1');
  });

  it('caps at 500 by default and reports truncated=true', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`a${i}`)),
        has_more: true,
        next_cursor: 'c1',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`b${i}`)),
        has_more: true,
        next_cursor: 'c2',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`c${i}`)),
        has_more: true,
        next_cursor: 'c3',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`d${i}`)),
        has_more: true,
        next_cursor: 'c4',
      })
      .mockResolvedValueOnce({
        results: Array.from({ length: 100 }, (_, i) => taskRow(`e${i}`)),
        has_more: true,
        next_cursor: 'c5',
      });

    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', 'sprint-7');
    expect(out.tasks).toHaveLength(500);
    expect(out.truncated).toBe(true);
    expect(mockNotion.dataSources.query).toHaveBeenCalledTimes(5);
  });

  it('honors custom cap', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: Array.from({ length: 10 }, (_, i) => taskRow(`x${i}`)),
      has_more: true,
      next_cursor: 'c1',
    });
    const out = await queryTasksByCustomerAndSprintPaginated('cust-1', null, 5);
    expect(out.tasks).toHaveLength(5);
    expect(out.truncated).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- lib/notion/__tests__/tasks-paginated.test.ts`
Expected: FAIL — `queryTasksByCustomerAndSprintPaginated` not exported.

- [ ] **Step 3: Implement in `lib/notion/tasks.ts`**

Add at the bottom of the file (don't remove `queryTasksByCustomerAndSprint` yet — other callers still use it):

```ts
import { queryAllPages } from './pagination';

export async function queryTasksByCustomerAndSprintPaginated(
  customerId: string,
  sprintId: string | null,
  cap: number = 500,
): Promise<{ tasks: Task[]; truncated: boolean }> {
  const notion = getNotion();
  const baseFilter = { property: 'Customer', relation: { contains: customerId } };
  const filter = sprintId
    ? { and: [baseFilter, { property: 'Sprint', relation: { contains: sprintId } }] }
    : baseFilter;

  const { items, truncated } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_TASKS,
        filter,
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap },
  );

  const tasks = items
    .filter((r: any): r is any => 'properties' in r)
    .map(parseTask);
  return { tasks, truncated };
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- lib/notion/__tests__/tasks-paginated.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/notion/tasks.ts lib/notion/__tests__/tasks-paginated.test.ts
git commit -m "feat(notion): 📄 add paginated tasks query with cap=500"
```

### Task 1.3 — `<TruncationBanner>` componente con tests

**Files:**
- Create: `components/kanban/truncation-banner.tsx`
- Test: `components/kanban/__tests__/truncation-banner.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
// components/kanban/__tests__/truncation-banner.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TruncationBanner } from '../truncation-banner';

describe('TruncationBanner', () => {
  it('renders cap and a subtle warning when shown', () => {
    render(<TruncationBanner cap={500} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/sprint|proyecto|Mías/i)).toBeInTheDocument();
  });
});
```

> If `@testing-library/react` is not installed, check `package.json`. If missing, the smaller scope is to skip this RTL test and write a snapshot/render-string test instead. Run `npm ls @testing-library/react` first.

- [ ] **Step 2: Verify RTL is installed**

Run: `npm ls @testing-library/react`
- If installed: continue with the test above.
- If not installed: replace the test with a minimal type-only smoke:
  ```tsx
  import { describe, it, expect } from 'vitest';
  import { TruncationBanner } from '../truncation-banner';
  describe('TruncationBanner', () => {
    it('is a function component', () => {
      expect(typeof TruncationBanner).toBe('function');
    });
  });
  ```

- [ ] **Step 3: Run — expect FAIL**

Run: `npm run test:run -- components/kanban/__tests__/truncation-banner.test.tsx`
Expected: FAIL.

- [ ] **Step 4: Implement component**

```tsx
// components/kanban/truncation-banner.tsx
import { AlertTriangle } from 'lucide-react';

type Props = { cap: number };

export function TruncationBanner({ cap }: Props) {
  return (
    <div
      role="alert"
      className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md border border-[#e6c98a] bg-[#faf0db] text-[#7a5a1a] text-[12px]"
    >
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span className="leading-relaxed">
        Mostrando {cap} tareas. Filtra por sprint o proyecto, o cambia a
        {' '}<span className="font-medium">Mías</span> para ver todo.
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm run test:run -- components/kanban/__tests__/truncation-banner.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/kanban/truncation-banner.tsx components/kanban/__tests__/truncation-banner.test.tsx
git commit -m "feat(kanban): ⚠️ TruncationBanner component"
```

### Task 1.4 — Mount paginated query + banner en `/tareas`

**Files:**
- Modify: `app/(app)/tareas/page.tsx`
- Modify: `components/kanban/kanban-view.tsx`

- [ ] **Step 1: Edit `app/(app)/tareas/page.tsx` — usar la nueva query**

Replace the existing tasks query block:

```tsx
// OLD
const allTasks = await queryTasksByCustomerAndSprint(ctx.customerId, sprint?.id ?? null);
```

With:

```tsx
const { tasks: allTasks, truncated } = await queryTasksByCustomerAndSprintPaginated(
  ctx.customerId,
  sprint?.id ?? null,
);
```

Update the import:

```tsx
// Replace this line:
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
// With:
import { queryTasksByCustomerAndSprintPaginated } from '@/lib/notion/tasks';
```

Pass `truncated` to `<KanbanView>`:

```tsx
<KanbanView
  initialTasks={visibleTasks}
  truncated={truncated && scope === 'team'}
  sprintLabel={sprintLabel}
  currentSprintId={sprint?.id ?? null}
  allSprintIds={sprints.map((s) => s.id)}
  members={members}
  scope={scope}
  projectsById={projectsById}
/>
```

- [ ] **Step 2: Edit `components/kanban/kanban-view.tsx` — accept and render banner**

Update Props:

```ts
type Props = {
  initialTasks: Task[];
  truncated?: boolean;
  sprintLabel: string;
  currentSprintId: string | null;
  allSprintIds: string[];
  members: TeamMember[];
  scope: TareasScope;
  projectsById: Map<string, Project>;
};
```

Destructure `truncated`:

```tsx
export function KanbanView({
  initialTasks,
  truncated = false,
  sprintLabel,
  currentSprintId,
  allSprintIds,
  members,
  scope,
  projectsById,
}: Props) {
```

Import banner at top of file:

```tsx
import { TruncationBanner } from './truncation-banner';
```

Render right above the `{scope === 'team' ? ... }` ternary, inside the outer flex:

```tsx
{truncated && <TruncationBanner cap={500} />}
```

- [ ] **Step 3: Type check**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run full test suite**

Run: `npm run test:run`
Expected: all green. Existing tests for `kanban-view` (if any) keep passing because `truncated` defaults to `false`.

- [ ] **Step 5: Manual smoke**

Run: `npm run dev` — open http://localhost:4000/tareas?scope=team. Page should render. With <500 tasks no banner appears.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/tareas/page.tsx components/kanban/kanban-view.tsx
git commit -m "feat(tareas): 📄 paginate team-scope query + show truncation banner"
```

### Task 1.5 — Limpieza: marcar `queryTasksByCustomerAndSprint` como deprecated (no romper)

**Files:**
- Modify: `lib/notion/tasks.ts`

- [ ] **Step 1: Add JSDoc deprecation note above existing function**

```ts
/**
 * @deprecated Use `queryTasksByCustomerAndSprintPaginated`. This call hits the
 * Notion default page_size and silently drops results when there are >100 tasks.
 * Kept for callers that still depend on the old shape (search suggestions, home).
 * Will be removed once all call sites migrate.
 */
export async function queryTasksByCustomerAndSprint(
```

- [ ] **Step 2: Commit**

```bash
git add lib/notion/tasks.ts
git commit -m "docs(notion): 🗑️ deprecate non-paginated tasks query"
```

---

## PR2 — Generalize scope: `lib/scope/` + `<ScopePill>` compartido

**Outcome:** Existe la infra para scope `mine | team` con 4 keys. `/tareas` migra al nuevo módulo. UI no cambia visualmente.

### Task 2.1 — Crear `lib/scope/resolve.ts` con tests

**Files:**
- Create: `lib/scope/resolve.ts`
- Test: `lib/scope/__tests__/resolve.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/scope/__tests__/resolve.test.ts
import { describe, it, expect } from 'vitest';
import { resolveScope, SCOPE_COOKIE, type ScopeKey } from '../resolve';

describe('resolveScope', () => {
  const keys: ScopeKey[] = ['home', 'tareas', 'reuniones', 'proyectos'];

  it.each(keys)('defaults to "mine" for %s when no input', (key) => {
    expect(resolveScope(key, undefined, undefined)).toBe('mine');
  });

  it.each(keys)('uses URL value when valid for %s', (key) => {
    expect(resolveScope(key, 'team', undefined)).toBe('team');
  });

  it.each(keys)('falls back to cookie when URL absent for %s', (key) => {
    expect(resolveScope(key, undefined, 'team')).toBe('team');
  });

  it('URL takes precedence over cookie', () => {
    expect(resolveScope('home', 'mine', 'team')).toBe('mine');
  });

  it('ignores invalid URL value, uses cookie', () => {
    expect(resolveScope('home', 'garbage', 'team')).toBe('team');
  });

  it('ignores invalid cookie value, returns "mine"', () => {
    expect(resolveScope('home', undefined, 'garbage')).toBe('mine');
  });
});

describe('SCOPE_COOKIE', () => {
  it('exposes one cookie name per scope key', () => {
    expect(SCOPE_COOKIE.home).toBe('home-scope');
    expect(SCOPE_COOKIE.tareas).toBe('tareas-scope');
    expect(SCOPE_COOKIE.reuniones).toBe('reuniones-scope');
    expect(SCOPE_COOKIE.proyectos).toBe('proyectos-scope');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- lib/scope/__tests__/resolve.test.ts`

- [ ] **Step 3: Implement**

```ts
// lib/scope/resolve.ts
export type Scope = 'mine' | 'team';
export type ScopeKey = 'home' | 'tareas' | 'reuniones' | 'proyectos';

const VALID: readonly Scope[] = ['mine', 'team'] as const;

export const SCOPE_COOKIE: Record<ScopeKey, string> = {
  home: 'home-scope',
  tareas: 'tareas-scope',
  reuniones: 'reuniones-scope',
  proyectos: 'proyectos-scope',
};

function isValid(value: unknown): value is Scope {
  return typeof value === 'string' && (VALID as readonly string[]).includes(value);
}

/**
 * Resolve the active scope for a section using URL → cookie → default ('mine').
 */
export function resolveScope(
  _key: ScopeKey,
  urlValue: string | undefined,
  cookieValue: string | undefined,
): Scope {
  if (isValid(urlValue)) return urlValue;
  if (isValid(cookieValue)) return cookieValue;
  return 'mine';
}
```

> The `_key` arg is reserved for future per-key defaults but currently unused. Naming it makes the call sites read symmetrically.

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test:run -- lib/scope/__tests__/resolve.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/scope/resolve.ts lib/scope/__tests__/resolve.test.ts
git commit -m "feat(scope): 🧭 generalized scope resolver for 4 sections"
```

### Task 2.2 — Crear `lib/scope/actions.ts` (server action genérica)

**Files:**
- Create: `lib/scope/actions.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/scope/actions.ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SCOPE_COOKIE, type Scope, type ScopeKey } from './resolve';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Update the active scope for a section, persist it to its cookie, and
 * redirect to the section's path with the appropriate `?scope=` (and any
 * extra query params the caller wants preserved).
 */
export async function setScope(
  key: ScopeKey,
  scope: Scope,
  redirectPath: string,
  extraParams: Record<string, string> = {},
): Promise<void> {
  const store = await cookies();
  store.set(SCOPE_COOKIE[key], scope, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });

  const params = new URLSearchParams(extraParams);
  params.set('scope', scope);
  redirect(`${redirectPath}?${params.toString()}`);
}
```

- [ ] **Step 2: Type check**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add lib/scope/actions.ts
git commit -m "feat(scope): 🪝 generic setScope server action"
```

### Task 2.3 — Extraer `<ScopePill>` a `components/common/`

**Files:**
- Create: `components/common/scope-pill.tsx`
- Test: `components/common/__tests__/scope-pill.test.tsx` (only if RTL is installed; skip otherwise)

- [ ] **Step 1: Write the new component**

```tsx
// components/common/scope-pill.tsx
'use client';

import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { setScope } from '@/lib/scope/actions';
import type { Scope, ScopeKey } from '@/lib/scope/resolve';

type Props = {
  scopeKey: ScopeKey;
  scope: Scope;
  myCount: number;
  teamCount: number;
  redirectPath: string;
  extraParams?: Record<string, string>;
  labels?: { mine: string; team: string };
};

export function ScopePill({
  scopeKey,
  scope,
  myCount,
  teamCount,
  redirectPath,
  extraParams = {},
  labels = { mine: 'Yo', team: 'Equipo' },
}: Props) {
  const triggerLabel = scope === 'mine' ? labels.mine : labels.team;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md',
          'text-[12px] font-medium border cursor-pointer transition-colors shrink-0',
          'bg-[#eeeffc] text-[#5e6ad2] border-[#c9cbe8]',
          'hover:bg-[#e5e7fa] outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={`Filtrar ${scopeKey} por alcance`}
      >
        {triggerLabel}
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <ScopeItem
          active={scope === 'mine'}
          label={labels.mine}
          count={myCount}
          onClick={() => setScope(scopeKey, 'mine', redirectPath, extraParams)}
        />
        <ScopeItem
          active={scope === 'team'}
          label={labels.team}
          count={teamCount}
          onClick={() => setScope(scopeKey, 'team', redirectPath, extraParams)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScopeItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        active && 'bg-[#eeeffc] text-[#5e6ad2] font-semibold',
      )}
    >
      <span className="w-3.5 inline-flex justify-center">
        {active && <Check className="w-3 h-3" />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-[11px] text-muted-foreground">{count}</span>
    </DropdownMenuItem>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add components/common/scope-pill.tsx
git commit -m "feat(common): 🧭 extract ScopePill to components/common"
```

### Task 2.4 — Migrar `/tareas` al nuevo `<ScopePill>` y `lib/scope/`

**Files:**
- Modify: `app/(app)/tareas/page.tsx`
- Modify: `app/(app)/tareas/actions.ts` (delete; replaced by generic setScope)
- Modify: `components/kanban/scope-pill.tsx` (delete)
- Modify: `lib/tareas/scope.ts` (delete)
- Modify: `lib/auth/context.ts` (remove `TareasScope`/`TAREAS_SCOPE_COOKIE` exports)
- Modify: `lib/tareas/__tests__/scope.test.ts` (delete; replaced by `lib/scope/__tests__/resolve.test.ts`)
- Modify: `components/kanban/kanban-view.tsx` (drop `TareasScope` type import)

> **Important**: keep cookie name `tareas-scope` so existing user preferences carry over. The new `SCOPE_COOKIE.tareas === 'tareas-scope'` already does this.

- [ ] **Step 1: Update `app/(app)/tareas/page.tsx`**

Replace imports:

```tsx
// REMOVE
import { cookies } from 'next/headers';
import { TAREAS_SCOPE_COOKIE } from '@/lib/auth/context';
import { resolveScope } from '@/lib/tareas/scope';

// ADD
import { cookies } from 'next/headers';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
```

Replace scope resolution:

```tsx
const scope = resolveScope('tareas', sp.scope, cookieStore.get(SCOPE_COOKIE.tareas)?.value);
```

Replace the `<ScopePill>` block in topbar — find and update:

```tsx
// REMOVE this import
import { ScopePill } from '@/components/kanban/scope-pill';

// ADD
import { ScopePill } from '@/components/common/scope-pill';
```

Replace the JSX:

```tsx
// OLD
<ScopePill
  scope={scope}
  myCount={myTasks.length}
  teamCount={allTasks.length}
  sprintId={sprint?.id ?? null}
/>

// NEW
<ScopePill
  scopeKey="tareas"
  scope={scope}
  myCount={myTasks.length}
  teamCount={allTasks.length}
  redirectPath="/tareas"
  extraParams={sprint?.id ? { sprint: sprint.id } : {}}
  labels={{ mine: 'Mías', team: 'Equipo completo' }}
/>
```

- [ ] **Step 2: Delete the per-section action**

```bash
rm app/\(app\)/tareas/actions.ts
```

- [ ] **Step 3: Delete the old kanban ScopePill**

```bash
rm components/kanban/scope-pill.tsx
```

- [ ] **Step 4: Delete `lib/tareas/scope.ts` and its test**

```bash
rm lib/tareas/scope.ts lib/tareas/__tests__/scope.test.ts
```

- [ ] **Step 5: Update `lib/auth/context.ts` — remove TareasScope exports**

Remove these lines:

```ts
export const TAREAS_SCOPE_COOKIE = 'tareas-scope';
export type TareasScope = 'mine' | 'team';
```

- [ ] **Step 6: Update `components/kanban/kanban-view.tsx`**

Replace the import + Props type:

```tsx
// OLD
import type { TareasScope } from '@/lib/auth/context';

// NEW
import type { Scope } from '@/lib/scope/resolve';
```

Update the Props field:

```ts
scope: Scope;
```

- [ ] **Step 7: Type check**

Run: `npm run typecheck`
Expected: 0 errors. If anything else (search suggestions / home queries) imports `TareasScope`, fix to `Scope`.

- [ ] **Step 8: Run full tests**

Run: `npm run test:run`
Expected: all green. The suite no longer references `lib/tareas/scope.ts`.

- [ ] **Step 9: Smoke test in browser**

Run: `npm run dev` — visit `/tareas`, click pill, switch `Mías ↔ Equipo completo`. URL updates, data reloads, cookie persists.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "refactor(tareas): 🧭 migrate to lib/scope and shared ScopePill"
```

---

## PR3 — Home filtrado por member

**Outcome:** Home muestra solo tareas/proyectos donde estás en `Team`, y la última reunión donde participaste. Stats reflejan tu set personal. Toggle `Yo · Equipo` en topbar.

### Task 3.1 — Agregar `queryTasksByCustomerSprintAndMember` con tests

**Files:**
- Modify: `lib/notion/tasks.ts`
- Test: `lib/notion/__tests__/tasks-by-member.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/notion/__tests__/tasks-by-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };

import { queryTasksByCustomerSprintAndMember } from '../tasks';

const taskRow = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  properties: {
    'Task name': { title: [{ plain_text: id }] },
    Status: { status: { name: 'Not Started' } },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryTasksByCustomerSprintAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('builds and-filter with Customer + Sprint + Team', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [taskRow('t1')],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerSprintAndMember('cust-1', 'sprint-7', 'mem-7');
    const filter = mockNotion.dataSources.query.mock.calls[0]![0].filter;
    expect(filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Sprint', relation: { contains: 'sprint-7' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('omits Sprint when sprintId is null', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [],
      has_more: false,
      next_cursor: null,
    });
    await queryTasksByCustomerSprintAndMember('cust-1', null, 'mem-7');
    const filter = mockNotion.dataSources.query.mock.calls[0]![0].filter;
    expect(filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('paginates fully (no cap)', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({
        results: [taskRow('t1')],
        has_more: true,
        next_cursor: 'c1',
      })
      .mockResolvedValueOnce({
        results: [taskRow('t2')],
        has_more: false,
        next_cursor: null,
      });
    const tasks = await queryTasksByCustomerSprintAndMember('cust-1', null, 'mem-7');
    expect(tasks.map((t) => t.id)).toEqual(['t1', 't2']);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- lib/notion/__tests__/tasks-by-member.test.ts`

- [ ] **Step 3: Add export to `lib/notion/tasks.ts`**

```ts
export async function queryTasksByCustomerSprintAndMember(
  customerId: string,
  sprintId: string | null,
  memberId: string,
): Promise<Task[]> {
  const notion = getNotion();
  const filterParts: any[] = [
    { property: 'Customer', relation: { contains: customerId } },
  ];
  if (sprintId) filterParts.push({ property: 'Sprint', relation: { contains: sprintId } });
  filterParts.push({ property: 'Team', relation: { contains: memberId } });

  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_TASKS,
        filter: { and: filterParts },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap: Infinity },
  );

  return items.filter((r: any): r is any => 'properties' in r).map(parseTask);
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm run test:run -- lib/notion/__tests__/tasks-by-member.test.ts`

- [ ] **Step 5: Commit**

```bash
git add lib/notion/tasks.ts lib/notion/__tests__/tasks-by-member.test.ts
git commit -m "feat(notion): 👤 query tasks scoped to member + customer + sprint"
```

### Task 3.2 — Agregar `queryMeetingsByCustomerAndMember` y `queryProjectsByCustomerAndMember`

**Files:**
- Modify: `lib/notion/meetings.ts`
- Modify: `lib/notion/projects.ts`
- Test: `lib/notion/__tests__/meetings-by-member.test.ts`
- Test: `lib/notion/__tests__/projects-by-member.test.ts`

- [ ] **Step 1: Write failing test for meetings**

```ts
// lib/notion/__tests__/meetings-by-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meet-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };
import { queryMeetingsByCustomerAndMember } from '../meetings';

const row = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  created_time: '2026-04-30T00:00:00Z',
  properties: {
    Name: { title: [{ plain_text: id }] },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryMeetingsByCustomerAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses and-filter Customer + Team and sorts by created_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [row('m1')],
      has_more: false,
      next_cursor: null,
    });
    await queryMeetingsByCustomerAndMember('cust-1', 'mem-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
    expect(call.sorts).toEqual([{ timestamp: 'created_time', direction: 'descending' }]);
  });

  it('paginates fully', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({ results: [row('a')], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [row('b')], has_more: false, next_cursor: null });
    const out = await queryMeetingsByCustomerAndMember('cust-1', 'mem-7');
    expect(out.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
```

- [ ] **Step 2: Write failing test for projects**

```ts
// lib/notion/__tests__/projects-by-member.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_PROJECTS: 'proj-ds' } }));
const mockNotion = { dataSources: { query: vi.fn() } };
import { queryProjectsByCustomerAndMember } from '../projects';

const row = (id: string) => ({
  id,
  url: `https://notion.so/${id}`,
  icon: null,
  properties: {
    'Project name': { title: [{ plain_text: id }] },
    Customer: { relation: [{ id: 'cust-1' }] },
    Team: { relation: [{ id: 'mem-7' }] },
  },
});

describe('queryProjectsByCustomerAndMember', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('uses and-filter Customer + Team', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [row('p1')],
      has_more: false,
      next_cursor: null,
    });
    await queryProjectsByCustomerAndMember('cust-1', 'mem-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      and: [
        { property: 'Customer', relation: { contains: 'cust-1' } },
        { property: 'Team', relation: { contains: 'mem-7' } },
      ],
    });
  });

  it('paginates fully', async () => {
    mockNotion.dataSources.query
      .mockResolvedValueOnce({ results: [row('p1')], has_more: true, next_cursor: 'c1' })
      .mockResolvedValueOnce({ results: [row('p2')], has_more: false, next_cursor: null });
    const out = await queryProjectsByCustomerAndMember('cust-1', 'mem-7');
    expect(out.map((p) => p.id)).toEqual(['p1', 'p2']);
  });
});
```

- [ ] **Step 3: Run — expect FAIL on both**

Run: `npm run test:run -- lib/notion/__tests__/meetings-by-member.test.ts lib/notion/__tests__/projects-by-member.test.ts`

- [ ] **Step 4: Implement in `lib/notion/meetings.ts`**

Add at bottom:

```ts
import { queryAllPages } from './pagination';

export async function queryMeetingsByCustomerAndMember(
  customerId: string,
  memberId: string,
): Promise<Meeting[]> {
  const notion = getNotion();
  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_MEETINGS,
        filter: {
          and: [
            { property: 'Customer', relation: { contains: customerId } },
            { property: 'Team', relation: { contains: memberId } },
          ],
        },
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap: Infinity },
  );
  return items.filter((r: any): r is any => 'properties' in r).map(parseMeeting);
}
```

- [ ] **Step 5: Implement in `lib/notion/projects.ts`**

Add at bottom:

```ts
import { queryAllPages } from './pagination';

export async function queryProjectsByCustomerAndMember(
  customerId: string,
  memberId: string,
): Promise<Project[]> {
  const notion = getNotion();
  const { items } = await queryAllPages<any>(
    async (cursor) => {
      const res = await notion.dataSources.query({
        data_source_id: serverEnv.NOTION_DB_PROJECTS,
        filter: {
          and: [
            { property: 'Customer', relation: { contains: customerId } },
            { property: 'Team', relation: { contains: memberId } },
          ],
        },
        ...(cursor ? { start_cursor: cursor } : {}),
      });
      return {
        results: res.results,
        has_more: (res as any).has_more ?? false,
        next_cursor: (res as any).next_cursor ?? null,
      };
    },
    { cap: Infinity },
  );
  return items.filter((r: any): r is any => 'properties' in r).map(parseProject);
}
```

- [ ] **Step 6: Run — expect PASS**

Run: `npm run test:run -- lib/notion/__tests__/meetings-by-member.test.ts lib/notion/__tests__/projects-by-member.test.ts`

- [ ] **Step 7: Commit**

```bash
git add lib/notion/meetings.ts lib/notion/projects.ts lib/notion/__tests__/meetings-by-member.test.ts lib/notion/__tests__/projects-by-member.test.ts
git commit -m "feat(notion): 👤 query meetings + projects scoped to member"
```

### Task 3.3 — Extender `getHomeData` con `memberId | null`

**Files:**
- Modify: `lib/home/queries.ts`
- Modify: `lib/home/__tests__/queries.test.ts`

- [ ] **Step 1: Update test mocks and add new cases**

Edit `lib/home/__tests__/queries.test.ts`. Add new vi.mock entries at the top:

```ts
vi.mock('@/lib/notion/tasks', () => ({
  queryTasksByCustomerAndSprint: vi.fn(),
  queryTasksByCustomerSprintAndMember: vi.fn(),
}));
vi.mock('@/lib/notion/meetings', () => ({
  queryMeetingsByCustomer: vi.fn(),
  queryMeetingsByCustomerAndMember: vi.fn(),
}));
vi.mock('@/lib/notion/projects', () => ({
  queryProjectsByCustomer: vi.fn(),
  queryProjectsByCustomerAndMember: vi.fn(),
}));
```

Update imports inside the test:

```ts
import {
  queryTasksByCustomerAndSprint,
  queryTasksByCustomerSprintAndMember,
} from '@/lib/notion/tasks';
import {
  queryMeetingsByCustomer,
  queryMeetingsByCustomerAndMember,
} from '@/lib/notion/meetings';
import {
  queryProjectsByCustomer,
  queryProjectsByCustomerAndMember,
} from '@/lib/notion/projects';
```

Add a new `describe` block at the bottom:

```ts
describe('getHomeData with memberId', () => {
  it('uses *ByMember queries when memberId provided', async () => {
    vi.mocked(queryTasksByCustomerSprintAndMember).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomerAndMember).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomerAndMember).mockResolvedValueOnce([]);

    await getHomeData('cust-1', 'sprint-7', 'mem-7');

    expect(queryTasksByCustomerSprintAndMember).toHaveBeenCalledWith('cust-1', 'sprint-7', 'mem-7');
    expect(queryMeetingsByCustomerAndMember).toHaveBeenCalledWith('cust-1', 'mem-7');
    expect(queryProjectsByCustomerAndMember).toHaveBeenCalledWith('cust-1', 'mem-7');
    expect(queryTasksByCustomerAndSprint).not.toHaveBeenCalled();
    expect(queryMeetingsByCustomer).not.toHaveBeenCalled();
    expect(queryProjectsByCustomer).not.toHaveBeenCalled();
  });

  it('uses *ByCustomer queries when memberId is null', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([]);

    await getHomeData('cust-1', 'sprint-7', null);

    expect(queryTasksByCustomerAndSprint).toHaveBeenCalledWith('cust-1', 'sprint-7');
    expect(queryMeetingsByCustomer).toHaveBeenCalledWith('cust-1');
    expect(queryProjectsByCustomer).toHaveBeenCalledWith('cust-1');
    expect(queryTasksByCustomerSprintAndMember).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect existing tests still pass + new fails**

Run: `npm run test:run -- lib/home/__tests__/queries.test.ts`
Expected: existing 7 tests pass (because old `getHomeData('c','s')` defaults `memberId` to `null` once we update the implementation). 2 new tests fail.

> The existing tests pass `getHomeData('c', 'sprint-17')` with two arguments. Make `memberId` an optional 3rd arg with default `null` so they keep working.

- [ ] **Step 3: Implement — update `lib/home/queries.ts`**

```ts
import {
  queryTasksByCustomerAndSprint,
  queryTasksByCustomerSprintAndMember,
} from '@/lib/notion/tasks';
import {
  queryMeetingsByCustomer,
  queryMeetingsByCustomerAndMember,
} from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import {
  queryProjectsByCustomer,
  queryProjectsByCustomerAndMember,
} from '@/lib/notion/projects';
// ... (rest of imports unchanged)

export async function getHomeData(
  customerId: string,
  sprintId: string | null,
  memberId: string | null = null,
) {
  const [tasks, meetings, wiki, projects] = await Promise.all([
    memberId
      ? queryTasksByCustomerSprintAndMember(customerId, sprintId, memberId)
      : queryTasksByCustomerAndSprint(customerId, sprintId),
    memberId
      ? queryMeetingsByCustomerAndMember(customerId, memberId)
      : queryMeetingsByCustomer(customerId),
    queryWikiByCustomer(customerId),
    memberId
      ? queryProjectsByCustomerAndMember(customerId, memberId)
      : queryProjectsByCustomer(customerId),
  ]);

  // (everything below unchanged: stats, lastMeeting, recentWiki, myTasksToday, activeProjects)
  // ...
}
```

- [ ] **Step 4: Run — expect all PASS**

Run: `npm run test:run -- lib/home/__tests__/queries.test.ts`
Expected: 9 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/home/queries.ts lib/home/__tests__/queries.test.ts
git commit -m "feat(home): 👤 getHomeData accepts optional memberId for scoping"
```

### Task 3.4 — Mount scope + ScopePill en `app/(app)/page.tsx`

**Files:**
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Update imports**

Add at top:

```tsx
import { cookies } from 'next/headers';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { ScopePill } from '@/components/common/scope-pill';
```

Update the type:

```tsx
type SearchParams = Promise<{ scope?: string }>;
```

Update signature:

```tsx
export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
```

- [ ] **Step 2: Resolve scope and load data**

Right after `const ctx = await requireContext();`:

```tsx
const sp = await searchParams;
const cookieStore = await cookies();
const scope = resolveScope('home', sp.scope, cookieStore.get(SCOPE_COOKIE.home)?.value);
const sprint = await getCurrentSprint();

// "mine" data: scoped to memberId
const data = await getHomeData(
  ctx.customerId,
  sprint?.id ?? null,
  scope === 'mine' ? ctx.memberId : null,
);
```

(Remove the previous `const sprint = await getCurrentSprint();` line if duplicated — there's already one in the file; keep a single declaration.)

- [ ] **Step 3: Compute `myCount` / `teamCount` for the pill**

After the `data` computation, add:

```tsx
// counts to feed the pill — keep cheap: derive from already-loaded data when in mine,
// otherwise approximate from the loaded set (we don't need exact counts on the alt mode).
const myCount =
  scope === 'mine'
    ? data.stats.total
    : data.tasks.filter((t) => t.assigneeIds.includes(ctx.memberId)).length;
const teamCount = scope === 'team' ? data.stats.total : data.tasks.length;
```

> Note: this is a UX hint, not a hard count. Exact counts would need a second query — out of scope.

- [ ] **Step 4: Add the pill in the topbar children slot**

Update the `<Topbar>` element:

```tsx
<Topbar crumbs={[{ label: 'Home' }]}>
  <ScopePill
    scopeKey="home"
    scope={scope}
    myCount={myCount}
    teamCount={teamCount}
    redirectPath="/"
  />
  <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white max-w-[55vw] truncate">
    <Clock className="w-3 h-3 shrink-0" />
    <span className="truncate">{sprintLabel}</span>
  </span>
</Topbar>
```

- [ ] **Step 5: Type check**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 6: Tests**

Run: `npm run test:run`
Expected: green.

- [ ] **Step 7: Manual smoke**

`npm run dev` → http://localhost:4000/. Pill shows. Toggle changes URL + cookie. Tasks/projects/last meeting reflect your member scope.

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(home): 👤 default to mine-scope with ScopePill toggle"
```

---

## PR4 — Reuniones filtrado por member + empty state CTA

**Outcome:** `/reuniones` muestra solo donde participo (Team relation). Si vacío con scope=mine, CTA para abrir a Equipo. Detalle de reunión sin cambios.

### Task 4.1 — Update `/reuniones/page.tsx`

**Files:**
- Modify: `app/(app)/reuniones/page.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { cookies } from 'next/headers';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { ScopePill } from '@/components/common/scope-pill';
import {
  queryMeetingsByCustomer,
  queryMeetingsByCustomerAndMember,
} from '@/lib/notion/meetings';
```

Add `searchParams` to the page:

```tsx
type SearchParams = Promise<{ scope?: string }>;

export default async function ReunionesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope('reuniones', sp.scope, cookieStore.get(SCOPE_COOKIE.reuniones)?.value);

  const meetings = scope === 'mine'
    ? await queryMeetingsByCustomerAndMember(ctx.customerId, ctx.memberId)
    : await queryMeetingsByCustomer(ctx.customerId);
```

- [ ] **Step 2: Compute counts (cheap UX hint)**

Below the `meetings` declaration:

```tsx
// fast count: load both lists only when truly needed; otherwise reuse loaded set.
const myCount = scope === 'mine'
  ? meetings.length
  : meetings.filter((m) => m.teamIds.includes(ctx.memberId)).length;
const teamCount = scope === 'team' ? meetings.length : meetings.length /* placeholder */;
```

> When `scope='mine'`, `teamCount` is unknown without a second query. Show "—" instead. Update the ScopePill's labels API isn't strictly needed; we just pass the best signal. To avoid lying, when `scope='mine'`, set `teamCount = myCount`. The pill copy will read accurately on the active row.

Replace with the simpler form:

```tsx
const myCount = scope === 'mine'
  ? meetings.length
  : meetings.filter((m) => m.teamIds.includes(ctx.memberId)).length;
const teamCount = scope === 'team' ? meetings.length : myCount;
```

- [ ] **Step 3: Add ScopePill to Topbar**

```tsx
<Topbar
  crumbs={[
    { label: 'Reuniones' },
    { label: current?.title ?? 'Sin reuniones', muted: true },
  ]}
>
  <ScopePill
    scopeKey="reuniones"
    scope={scope}
    myCount={myCount}
    teamCount={teamCount}
    redirectPath="/reuniones"
  />
  <MobileHistoryTrigger meetings={meetings} currentId={current?.id} />
</Topbar>
```

- [ ] **Step 4: Empty-state CTA cuando mine + sin reuniones**

Replace `<MeetingsEmpty />` invocation:

```tsx
) : (
  <MeetingsEmpty scope={scope} />
)}
```

- [ ] **Step 5: Type check**

Run: `npm run typecheck`
Expected: error in `MeetingsEmpty` (prop not declared yet). Move to next task.

### Task 4.2 — Extender `<MeetingsEmpty>` con prop `scope`

**Files:**
- Modify: `components/meetings/meetings-empty.tsx`

- [ ] **Step 1: Read current implementation**

Run: `cat components/meetings/meetings-empty.tsx`
Expected: simple empty state component.

- [ ] **Step 2: Add scope prop and CTA when scope='mine'**

```tsx
import Link from 'next/link';
import type { Scope } from '@/lib/scope/resolve';

type Props = { scope?: Scope };

export function MeetingsEmpty({ scope = 'team' }: Props) {
  const isMine = scope === 'mine';
  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
      {isMine ? (
        <>
          <p className="mb-3">No tienes reuniones todavía.</p>
          <Link
            href="/reuniones?scope=team"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5e6ad2] hover:underline"
          >
            Ver todas las del cliente →
          </Link>
        </>
      ) : (
        <p>Aún no hay reuniones registradas para este cliente.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Type check**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run tests**

Run: `npm run test:run`
Expected: green.

- [ ] **Step 5: Manual smoke**

`npm run dev` → http://localhost:4000/reuniones. Toggle pill. With scope=mine and no meetings, CTA appears.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/reuniones/page.tsx components/meetings/meetings-empty.tsx
git commit -m "feat(reuniones): 👤 default to mine-scope with empty-state CTA"
```

> **Note:** the meeting detail page (`app/(app)/reuniones/[meetingId]/page.tsx`) is **not** modified. Action items, blocks, attendees inside a meeting still show the full set — confirmed exception in the spec.

---

## PR5 — Proyectos filtrado por member + empty state CTA

**Outcome:** `/proyectos` muestra solo donde estoy en Team. Toggle `Mis · Equipo`. Empty state con CTA.

### Task 5.1 — Update `/proyectos/page.tsx` con scope + ScopePill

**Files:**
- Modify: `app/(app)/proyectos/page.tsx`

- [ ] **Step 1: Update imports**

```tsx
import { cookies } from 'next/headers';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { ScopePill } from '@/components/common/scope-pill';
import {
  queryProjectsByCustomer,
  queryProjectsByCustomerAndMember,
} from '@/lib/notion/projects';
```

Add searchParams:

```tsx
type SearchParams = Promise<{ scope?: string }>;

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope('proyectos', sp.scope, cookieStore.get(SCOPE_COOKIE.proyectos)?.value);

  const projects = scope === 'mine'
    ? await queryProjectsByCustomerAndMember(ctx.customerId, ctx.memberId)
    : await queryProjectsByCustomer(ctx.customerId);

  const myCount = scope === 'mine'
    ? projects.length
    : projects.filter((p) => p.teamIds.includes(ctx.memberId)).length;
  const teamCount = scope === 'team' ? projects.length : myCount;
```

- [ ] **Step 2: Add ScopePill in Topbar**

```tsx
<Topbar crumbs={[{ label: 'Proyectos' }]}>
  <ScopePill
    scopeKey="proyectos"
    scope={scope}
    myCount={myCount}
    teamCount={teamCount}
    redirectPath="/proyectos"
    labels={{ mine: 'Mis', team: 'Equipo' }}
  />
</Topbar>
```

- [ ] **Step 3: Empty state CTA dentro de `<ProjectsView>`**

The component already handles its own empty state per-tab. We need a new top-level empty state for "no projects at all" when `scope=mine`. Wrap the render:

```tsx
{projects.length === 0 && scope === 'mine' ? (
  <div className="border border-dashed border-border rounded-xl p-6 sm:p-10 text-center text-sm text-muted-foreground">
    <p className="mb-3">No estás en proyectos del cliente todavía.</p>
    <a
      href="/proyectos?scope=team"
      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5e6ad2] hover:underline"
    >
      Ver todos los del cliente →
    </a>
  </div>
) : (
  <ProjectsView projects={projects} />
)}
```

- [ ] **Step 4: Type check + tests**

Run: `npm run typecheck && npm run test:run`
Expected: green.

- [ ] **Step 5: Manual smoke**

`npm run dev` → http://localhost:4000/proyectos. Toggle pill. Empty state when no projects in mine.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/proyectos/page.tsx
git commit -m "feat(proyectos): 👤 default to mine-scope with empty-state CTA"
```

---

## TODO v1.1 (out of scope, documented for future PR)

Add `notionUserId` to `AppContext`. In `lib/auth/context.ts`:

```ts
// Pseudocode for future implementation
const users = await notion.users.list({ page_size: 100 });
const notionUser = users.results.find((u) => u.type === 'person' && u.person?.email === email);
const notionUserId = notionUser?.id ?? null;
```

Once available, change `queryMeetingsByCustomerAndMember` to:

```ts
filter: {
  and: [
    { property: 'Customer', relation: { contains: customerId } },
    {
      or: [
        ...(notionUserId ? [{ property: 'Attendees', people: { contains: notionUserId } }] : []),
        { property: 'Team', relation: { contains: memberId } },
      ],
    },
  ],
}
```

This requires a TeamMember row to also store its `notionUserId` (or resolve via `users.list` cached at boot).

---

## Self-review checklist (run after writing — done inline)

- ✅ All 5 PRs cover the spec sections (Pagination, Scope, Home, Reuniones, Proyectos).
- ✅ Each PR ends with at least one commit.
- ✅ All tasks have actual code, not placeholders.
- ✅ Types match across tasks: `Scope`/`ScopeKey`/`SCOPE_COOKIE` defined in 2.1, used in 2.2/2.3/3.4/4.1/5.1.
- ✅ `queryAllPages` defined in 1.1, used in 1.2/3.1/3.2.
- ✅ Cookie name `tareas-scope` preserved during refactor (Task 2.4 explicit note).
- ✅ Meeting detail page unchanged (exception spec'd).
- ✅ TODO v1.1 documented and not pretended to be implemented.
