# Tareas Mías ↔ Equipo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir un toggle Mías ↔ Equipo a `/tareas` (default Mías) con vista Equipo agrupada por persona en acordeones, y mostrar nombres completos de asignados (no solo iniciales) en cada card.

**Architecture:** Filtrado server-side en `app/(app)/tareas/page.tsx` controlado por `?scope=` (URL) con fallback a cookie `tareas-scope`. UI: pill `Mías ▾` en `Topbar.children` (slot existente) que abre dropdown con 2 opciones; al seleccionar, Server Action escribe la cookie y `redirect()` con `?scope=` actualizado. Vista Equipo renderiza un nuevo `BoardByPerson` que agrupa tareas por `assigneeIds[0]` y delega a `BoardClassic`/`BoardWeek` por persona. Card refactorizada para mostrar línea inferior con stack de avatares + nombres.

**Tech Stack:** Next.js 16 App Router (RSC + Server Actions), React 19, Tailwind v4, `@base-ui/react` (DropdownMenu via `components/ui/dropdown-menu.tsx`), `@dnd-kit/core`, Zod, Vitest.

---

## File Structure

**New files:**
- `lib/tareas/scope.ts` — pure helpers: `resolveScope(searchParams, cookieValue)`, type `TareasScope`, constant `TAREAS_SCOPE_COOKIE`
- `lib/tareas/__tests__/scope.test.ts` — unit tests for `resolveScope`
- `lib/tareas/group-by-person.ts` — pure helper: `groupTasksByPerson(tasks, members)` returning ordered `{ member|null, tasks }[]`
- `lib/tareas/__tests__/group-by-person.test.ts` — unit tests
- `app/(app)/tareas/actions.ts` — Server Action `setTareasScope(scope)` writing cookie + `redirect()`
- `components/kanban/scope-pill.tsx` — presentational pill + dropdown
- `components/kanban/assignee-line.tsx` — new card subcomponent (line with stack + names)
- `components/kanban/board-by-person.tsx` — accordion-per-person board

**Modified files:**
- `lib/auth/context.ts` — add `TAREAS_SCOPE_COOKIE` and `TareasScope` exports
- `components/kanban/card.tsx` — replace `AssigneeStack` usage in `TaskCard` with `AssigneeLine` (keep `AssigneeStack` exported for `home/my-tasks.tsx`)
- `components/kanban/kanban-view.tsx` — accept `scope`, switch between `BoardClassic`/`BoardWeek` and `BoardByPerson`
- `app/(app)/tareas/page.tsx` — read scope, filter tasks server-side, count both buckets, pass `<ScopePill>` as Topbar children

---

### Task 1: Constants & types for scope persistence

**Files:**
- Modify: `lib/auth/context.ts:1-7` (add new exports at top)

- [ ] **Step 1: Add scope cookie constant and type**

Open `lib/auth/context.ts` and right under the existing `SELECTED_CUSTOMER_COOKIE` line, add:

```ts
export const TAREAS_SCOPE_COOKIE = 'tareas-scope';
export type TareasScope = 'mine' | 'team';
```

So the relevant section reads:
```ts
export const SELECTED_CUSTOMER_COOKIE = 'selected-customer-id';
export const TAREAS_SCOPE_COOKIE = 'tareas-scope';
export type TareasScope = 'mine' | 'team';
```

- [ ] **Step 2: Run typecheck to verify nothing broke**

Run: `npm run typecheck`
Expected: PASS (no new errors)

- [ ] **Step 3: Commit**

```bash
git add lib/auth/context.ts
git commit -m "feat(tareas): add scope cookie constant and type"
```

---

### Task 2: Pure scope resolver with tests (TDD)

**Files:**
- Create: `lib/tareas/scope.ts`
- Test: `lib/tareas/__tests__/scope.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/tareas/__tests__/scope.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveScope } from '../scope';

describe('resolveScope', () => {
  it('returns "mine" when no URL param and no cookie', () => {
    expect(resolveScope(undefined, undefined)).toBe('mine');
  });

  it('uses URL param when present (team)', () => {
    expect(resolveScope('team', undefined)).toBe('team');
  });

  it('uses URL param when present (mine)', () => {
    expect(resolveScope('mine', 'team')).toBe('mine');
  });

  it('falls back to cookie when no URL param', () => {
    expect(resolveScope(undefined, 'team')).toBe('team');
  });

  it('ignores invalid URL values and uses cookie', () => {
    expect(resolveScope('garbage', 'team')).toBe('team');
  });

  it('ignores invalid cookie values and returns "mine"', () => {
    expect(resolveScope(undefined, 'garbage')).toBe('mine');
  });

  it('URL takes precedence over cookie even when cookie is set', () => {
    expect(resolveScope('mine', 'team')).toBe('mine');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/tareas/__tests__/scope.test.ts`
Expected: FAIL (cannot find module `'../scope'`)

- [ ] **Step 3: Write the minimal implementation**

Create `lib/tareas/scope.ts`:
```ts
import type { TareasScope } from '@/lib/auth/context';

const VALID: readonly TareasScope[] = ['mine', 'team'] as const;

function isValid(value: unknown): value is TareasScope {
  return typeof value === 'string' && (VALID as readonly string[]).includes(value);
}

/**
 * Resolve the active scope for /tareas using URL → cookie → default.
 *
 * @param urlValue   raw `?scope=` value from searchParams (string | undefined)
 * @param cookieValue raw cookie value (string | undefined)
 */
export function resolveScope(
  urlValue: string | undefined,
  cookieValue: string | undefined,
): TareasScope {
  if (isValid(urlValue)) return urlValue;
  if (isValid(cookieValue)) return cookieValue;
  return 'mine';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/tareas/__tests__/scope.test.ts`
Expected: PASS (7/7)

- [ ] **Step 5: Commit**

```bash
git add lib/tareas/scope.ts lib/tareas/__tests__/scope.test.ts
git commit -m "feat(tareas): add resolveScope helper with unit tests"
```

---

### Task 3: Pure grouping helper for BoardByPerson with tests (TDD)

**Files:**
- Create: `lib/tareas/group-by-person.ts`
- Test: `lib/tareas/__tests__/group-by-person.test.ts`

The grouping needs to:
1. Group tasks by `assigneeIds[0]` (primary assignee).
2. Skip members with 0 tasks.
3. Order groups: more `In Progress` first, then by total task count desc.
4. Tasks with empty `assigneeIds` go into a single trailing "Sin asignar" group with `member = null`.
5. Archived tasks are excluded.

- [ ] **Step 1: Write the failing tests**

Create `lib/tareas/__tests__/group-by-person.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { groupTasksByPerson } from '../group-by-person';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

const member = (id: string, name: string): TeamMember => ({
  id,
  name,
  email: `${id}@example.com`,
  role: null,
  area: null,
  customerIds: [],
  projectIds: [],
});

const task = (overrides: Partial<Task>): Task => ({
  id: 'task-' + Math.random().toString(36).slice(2, 8),
  title: 'task',
  status: 'Not Started',
  priority: null,
  type: null,
  assigneeIds: [],
  projectId: null,
  customerId: null,
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://example.com',
  ...overrides,
});

describe('groupTasksByPerson', () => {
  it('returns empty array when there are no tasks', () => {
    expect(groupTasksByPerson([], [member('a', 'Ana')])).toEqual([]);
  });

  it('groups tasks under their primary assignee', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'] }),
      task({ id: '2', assigneeIds: ['b'] }),
      task({ id: '3', assigneeIds: ['a'] }),
    ];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    const aGroup = result.find((g) => g.member?.id === 'a')!;
    const bGroup = result.find((g) => g.member?.id === 'b')!;
    expect(aGroup.tasks.map((t) => t.id).sort()).toEqual(['1', '3']);
    expect(bGroup.tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('uses only the first assignee for multi-assigned tasks', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [task({ id: '1', assigneeIds: ['a', 'b'] })];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    expect(result.find((g) => g.member?.id === 'a')!.tasks).toHaveLength(1);
    expect(result.find((g) => g.member?.id === 'b')).toBeUndefined();
  });

  it('orders by In Progress count desc, then total desc', () => {
    const ana = member('a', 'Ana'); // 1 in progress, 1 total
    const bea = member('b', 'Bea'); // 0 in progress, 5 total
    const cam = member('c', 'Cam'); // 2 in progress, 2 total
    const tasks = [
      task({ id: '1', assigneeIds: ['a'], status: 'In Progress' }),
      task({ id: '2', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '3', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '4', assigneeIds: ['b'], status: 'Not Started' }),
      task({ id: '5', assigneeIds: ['b'], status: 'Done' }),
      task({ id: '6', assigneeIds: ['b'], status: 'Done' }),
      task({ id: '7', assigneeIds: ['c'], status: 'In Progress' }),
      task({ id: '8', assigneeIds: ['c'], status: 'In Progress' }),
    ];
    const result = groupTasksByPerson(tasks, [ana, bea, cam]);
    const ids = result.map((g) => g.member?.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('skips members without tasks', () => {
    const ana = member('a', 'Ana');
    const bea = member('b', 'Bea');
    const tasks = [task({ assigneeIds: ['a'] })];
    const result = groupTasksByPerson(tasks, [ana, bea]);
    expect(result).toHaveLength(1);
    expect(result[0]!.member?.id).toBe('a');
  });

  it('puts unassigned tasks into a trailing null-member group', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'] }),
      task({ id: '2', assigneeIds: [] }),
      task({ id: '3', assigneeIds: [] }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    expect(result).toHaveLength(2);
    expect(result[0]!.member?.id).toBe('a');
    expect(result[1]!.member).toBeNull();
    expect(result[1]!.tasks.map((t) => t.id).sort()).toEqual(['2', '3']);
  });

  it('does not create the "Sin asignar" group when there are no orphans', () => {
    const ana = member('a', 'Ana');
    const tasks = [task({ assigneeIds: ['a'] })];
    expect(groupTasksByPerson(tasks, [ana])).toHaveLength(1);
  });

  it('drops Archived tasks', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['a'], status: 'Archived' }),
      task({ id: '2', assigneeIds: ['a'], status: 'Not Started' }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    expect(result).toHaveLength(1);
    expect(result[0]!.tasks.map((t) => t.id)).toEqual(['2']);
  });

  it('drops orphans that are Archived', () => {
    const tasks = [task({ assigneeIds: [], status: 'Archived' })];
    expect(groupTasksByPerson(tasks, [])).toEqual([]);
  });

  it('skips assignee ids that are not in the members list', () => {
    const ana = member('a', 'Ana');
    const tasks = [
      task({ id: '1', assigneeIds: ['ghost'] }),
      task({ id: '2', assigneeIds: ['a'] }),
    ];
    const result = groupTasksByPerson(tasks, [ana]);
    // Tasks for unknown members fall through to "Sin asignar"
    expect(result).toHaveLength(2);
    expect(result[0]!.member?.id).toBe('a');
    expect(result[1]!.member).toBeNull();
    expect(result[1]!.tasks.map((t) => t.id)).toEqual(['1']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/tareas/__tests__/group-by-person.test.ts`
Expected: FAIL (cannot find module)

- [ ] **Step 3: Write the minimal implementation**

Create `lib/tareas/group-by-person.ts`:
```ts
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

export type PersonGroup = {
  /** null = "Sin asignar" bucket */
  member: TeamMember | null;
  tasks: Task[];
};

/**
 * Group tasks by primary assignee, drop archived tasks, and order groups by
 * how loaded each person looks (more In Progress first, then by total).
 *
 * Tasks whose first assignee id isn't in `members` (or who have none) fall into
 * a trailing "Sin asignar" group only rendered when at least one such task exists.
 */
export function groupTasksByPerson(
  tasks: Task[],
  members: TeamMember[],
): PersonGroup[] {
  const liveTasks = tasks.filter((t) => t.status !== 'Archived');
  if (liveTasks.length === 0) return [];

  const memberById = new Map(members.map((m) => [m.id, m]));
  const buckets = new Map<string, Task[]>();
  const orphans: Task[] = [];

  for (const t of liveTasks) {
    const primaryId = t.assigneeIds[0];
    if (primaryId && memberById.has(primaryId)) {
      const list = buckets.get(primaryId) ?? [];
      list.push(t);
      buckets.set(primaryId, list);
    } else {
      orphans.push(t);
    }
  }

  const personGroups: PersonGroup[] = [...buckets.entries()].map(([id, ts]) => ({
    member: memberById.get(id)!,
    tasks: ts,
  }));

  personGroups.sort((a, b) => {
    const aInProg = a.tasks.filter((t) => t.status === 'In Progress').length;
    const bInProg = b.tasks.filter((t) => t.status === 'In Progress').length;
    if (aInProg !== bInProg) return bInProg - aInProg;
    return b.tasks.length - a.tasks.length;
  });

  if (orphans.length > 0) {
    personGroups.push({ member: null, tasks: orphans });
  }

  return personGroups;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/tareas/__tests__/group-by-person.test.ts`
Expected: PASS (10/10)

- [ ] **Step 5: Commit**

```bash
git add lib/tareas/group-by-person.ts lib/tareas/__tests__/group-by-person.test.ts
git commit -m "feat(tareas): add groupTasksByPerson helper with unit tests"
```

---

### Task 4: Server Action to set scope cookie

**Files:**
- Create: `app/(app)/tareas/actions.ts`

- [ ] **Step 1: Write the action file**

Create `app/(app)/tareas/actions.ts`:
```ts
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TAREAS_SCOPE_COOKIE, type TareasScope } from '@/lib/auth/context';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Update the active /tareas scope.
 *
 * Writes the user's choice to the `tareas-scope` cookie so it persists across
 * sessions, then redirects to /tareas with the new `?scope=` and the same
 * `?sprint=` value (if any).
 */
export async function setTareasScope(
  scope: TareasScope,
  sprintId: string | null,
): Promise<void> {
  const store = await cookies();
  store.set(TAREAS_SCOPE_COOKIE, scope, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
  });

  const params = new URLSearchParams();
  if (sprintId) params.set('sprint', sprintId);
  params.set('scope', scope);
  redirect(`/tareas?${params.toString()}`);
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tareas/actions.ts
git commit -m "feat(tareas): add setTareasScope server action"
```

---

### Task 5: ScopePill presentational component

**Files:**
- Create: `components/kanban/scope-pill.tsx`

This component is **client-side** because it uses an interactive dropdown. It receives counts and current scope as props (server-computed), and on selection invokes the server action.

- [ ] **Step 1: Inspect existing dropdown styling**

Read `components/ui/dropdown-menu.tsx` to confirm the available exports. The codebase uses these shadcn-style names: `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem` (verify with `grep -E 'export.*function' components/ui/dropdown-menu.tsx`).

- [ ] **Step 2: Write the component**

Create `components/kanban/scope-pill.tsx`:
```tsx
'use client';

import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { TareasScope } from '@/lib/auth/context';
import { setTareasScope } from '@/app/(app)/tareas/actions';

type Props = {
  scope: TareasScope;
  myCount: number;
  teamCount: number;
  sprintId: string | null;
};

export function ScopePill({ scope, myCount, teamCount, sprintId }: Props) {
  const label = scope === 'mine' ? 'Mías' : 'Equipo';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
            'text-[12px] font-medium border cursor-pointer transition-colors',
            'bg-[#eeeffc] text-[#5e6ad2] border-[#c9cbe8]',
            'hover:bg-[#e5e7fa]',
          )}
        >
          {label}
          <ChevronDown className="w-3 h-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <ScopeItem
          active={scope === 'mine'}
          label="Mis tareas"
          count={myCount}
          onSelect={() => setTareasScope('mine', sprintId)}
        />
        <ScopeItem
          active={scope === 'team'}
          label="Equipo completo"
          count={teamCount}
          onSelect={() => setTareasScope('team', sprintId)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScopeItem({
  active,
  label,
  count,
  onSelect,
}: {
  active: boolean;
  label: string;
  count: number;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
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

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS. If it fails because `DropdownMenuItem` doesn't accept `onSelect` exactly that way, adapt the call to match the API exposed by `components/ui/dropdown-menu.tsx` (e.g. wrap each item's content in a button with `onClick={() => startTransition(() => setTareasScope(...))}`).

- [ ] **Step 4: Commit**

```bash
git add components/kanban/scope-pill.tsx
git commit -m "feat(tareas): add ScopePill component with dropdown"
```

---

### Task 6: AssigneeLine component (assignees with names)

**Files:**
- Create: `components/kanban/assignee-line.tsx`

- [ ] **Step 1: Write the component**

Create `components/kanban/assignee-line.tsx`:
```tsx
import type { TeamMember } from '@/schemas/team-member';
import { AssigneeAvatar } from './card';

type Props = {
  assignees: TeamMember[];
};

const MAX_AVATARS = 3;
const MAX_NAMES = 3;

/**
 * Card-bottom line: stack of avatars + comma-separated first names.
 * Returns null when there are no assignees so the card stays compact.
 */
export function AssigneeLine({ assignees }: Props) {
  if (assignees.length === 0) return null;

  const stackVisible = assignees.slice(0, MAX_AVATARS);
  const stackExtra = Math.max(0, assignees.length - MAX_AVATARS);

  const namesVisible = assignees
    .slice(0, MAX_NAMES)
    .map((m) => firstName(m.name))
    .join(', ');
  const namesExtra = Math.max(0, assignees.length - MAX_NAMES);
  const overflowNames = assignees
    .slice(MAX_NAMES)
    .map((m) => m.name)
    .join(', ');

  const namesText = namesExtra > 0 ? `${namesVisible} +${namesExtra}` : namesVisible;
  const fullTitle = assignees.map((m) => m.name).join(', ');

  return (
    <div
      className="mt-1.5 pt-1.5 border-t border-dashed border-border flex items-center gap-1.5 text-[11px] text-muted-foreground"
      title={fullTitle}
    >
      <div className="flex items-center">
        {stackVisible.map((m, i) => (
          <span
            key={m.id}
            className={i > 0 ? '-ml-1 ring-[1.5px] ring-white rounded-full' : ''}
          >
            <AssigneeAvatar member={m} size={18} />
          </span>
        ))}
        {stackExtra > 0 && (
          <span className="-ml-1 w-[18px] h-[18px] rounded-full bg-[#ececef] text-[9px] font-semibold text-muted-foreground grid place-items-center ring-[1.5px] ring-white">
            +{stackExtra}
          </span>
        )}
      </div>
      <span
        className="truncate"
        title={namesExtra > 0 ? overflowNames : undefined}
      >
        {namesText}
      </span>
    </div>
  );
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/kanban/assignee-line.tsx
git commit -m "feat(tareas): add AssigneeLine component"
```

---

### Task 7: Wire AssigneeLine into TaskCard

**Files:**
- Modify: `components/kanban/card.tsx:131-216` (the `TaskCard` body)

- [ ] **Step 1: Update the card to use AssigneeLine instead of AssigneeStack**

In `components/kanban/card.tsx`, inside `TaskCard`, the bottom row currently ends with `<AssigneeStack assignees={assignees} />`. We want:
- Keep the bottom meta row (priority, type, tag, date), **remove** the inline `AssigneeStack`
- Append a new `<AssigneeLine assignees={assignees} />` after that row

Add this import at the top of `card.tsx`:
```tsx
import { AssigneeLine } from './assignee-line';
```

Then inside `TaskCard`, replace the closing block:

**Before:**
```tsx
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {task.tags[0] && (
          <span /* ... */>{task.tags[0]}</span>
        )}
        {showDayChip && dayChip ? ( /* ... */ ) : task.dueDate ? (
          <span className="ml-auto">
            {/* date */}
          </span>
        ) : null}
        <div className="ml-auto">
          <AssigneeStack assignees={assignees} />
        </div>
      </div>
    </div>
  );
}
```

**After:**
```tsx
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {task.tags[0] && (
          <span /* ... */>{task.tags[0]}</span>
        )}
        {showDayChip && dayChip ? ( /* ... */ ) : task.dueDate ? (
          <span className="ml-auto">
            {/* date */}
          </span>
        ) : (
          <span className="ml-auto" />
        )}
      </div>
      <AssigneeLine assignees={assignees} />
    </div>
  );
}
```

Concretely the diff is: delete the `<div className="ml-auto"><AssigneeStack … /></div>` block, ensure the row above keeps `ml-auto` on the date (or an empty spacer), and add `<AssigneeLine assignees={assignees} />` right after the row's closing `</div>`.

Keep `AssigneeStack` exported from this file (it is consumed by `components/home/my-tasks.tsx`).

- [ ] **Step 2: Run typecheck and tests**

Run: `npm run typecheck && npx vitest run`
Expected: PASS

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Open http://localhost:3000/tareas — confirm cards render with avatar + first name(s) below the tag/date row. Confirm cards with no assignees are unchanged in height.

- [ ] **Step 4: Commit**

```bash
git add components/kanban/card.tsx
git commit -m "feat(tareas): show assignee names below each card"
```

---

### Task 8: BoardByPerson component

**Files:**
- Create: `components/kanban/board-by-person.tsx`

- [ ] **Step 1: Write the component**

Create `components/kanban/board-by-person.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { groupTasksByPerson } from '@/lib/tareas/group-by-person';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { AssigneeAvatar } from './card';
import { cn } from '@/lib/utils';

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  members: TeamMember[];
  membersById: Map<string, TeamMember>;
  view: 'classic' | 'week';
};

const STATUS_DOT: Record<string, string> = {
  todo: 'border-[#57575c] text-[#57575c]',
  inProgress: 'bg-[#5e6ad2] border-[#5e6ad2]',
  inReview: 'bg-[#c78a2c] border-[#c78a2c]',
  done: 'bg-[#3f9f5c] border-[#3f9f5c]',
};

export function BoardByPerson({ tasks, setTasks, members, membersById, view }: Props) {
  const groups = groupTasksByPerson(tasks, members);

  return (
    <div className="flex-1 flex flex-col gap-3 pb-5 overflow-auto">
      {groups.map((g) => (
        <PersonSection
          key={g.member?.id ?? '__unassigned__'}
          group={g}
          allTasks={tasks}
          setTasks={setTasks}
          membersById={membersById}
          view={view}
        />
      ))}
      {groups.length === 0 && (
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          No hay tareas en este sprint.
        </div>
      )}
    </div>
  );
}

function PersonSection({
  group,
  allTasks,
  setTasks,
  membersById,
  view,
}: {
  group: { member: TeamMember | null; tasks: Task[] };
  allTasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  membersById: Map<string, TeamMember>;
  view: 'classic' | 'week';
}) {
  const [open, setOpen] = useState(true);

  const counts = {
    todo: group.tasks.filter((t) => t.status === 'Not Started' || t.status === 'Refining').length,
    inProgress: group.tasks.filter((t) => t.status === 'In Progress').length,
    inReview: group.tasks.filter((t) => t.status === 'In Review').length,
    done: group.tasks.filter((t) => t.status === 'Done').length,
  };

  const groupIds = new Set(group.tasks.map((t) => t.id));

  // BoardClassic/BoardWeek own the DnD state for these tasks. They mutate the
  // shared `setTasks` so optimistic moves still work. We pass a filtered
  // tasks array but the same setter — moving a task only changes its status,
  // and the parent re-runs grouping on next render.
  const setSubsetTasks: React.Dispatch<React.SetStateAction<Task[]>> = (updater) => {
    setTasks((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (p: Task[]) => Task[])(prev.filter((t) => groupIds.has(t.id)))
        : updater;
      const subsetById = new Map(next.map((t) => [t.id, t]));
      return prev.map((t) => subsetById.get(t.id) ?? t);
    });
  };

  return (
    <section className="border border-border rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-black/[0.02] cursor-pointer"
      >
        {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        {group.member ? (
          <AssigneeAvatar member={group.member} size={28} />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[#ececef] text-[#8a8a91] grid place-items-center text-[10px] font-semibold">?</span>
        )}
        <span className="flex flex-col leading-tight">
          <span className="text-[13px] font-semibold">
            {group.member?.name ?? 'Sin asignar'}
          </span>
          {group.member && (group.member.area || group.member.role) && (
            <span className="text-[11px] text-muted-foreground">
              {group.member.area ?? group.member.role}
            </span>
          )}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <CountChip dotClass={STATUS_DOT.todo!} value={counts.todo} />
          <CountChip dotClass={STATUS_DOT.inProgress!} value={counts.inProgress} />
          <CountChip dotClass={STATUS_DOT.inReview!} value={counts.inReview} />
          <CountChip dotClass={STATUS_DOT.done!} value={counts.done} />
        </span>
      </button>
      {open && (
        <div className="border-t border-border p-2.5">
          {view === 'classic' ? (
            <BoardClassic
              tasks={group.tasks}
              setTasks={setSubsetTasks}
              membersById={membersById}
            />
          ) : (
            <BoardWeek
              tasks={group.tasks}
              setTasks={setSubsetTasks}
              membersById={membersById}
            />
          )}
        </div>
      )}
    </section>
  );
}

function CountChip({ dotClass, value }: { dotClass: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[11px] font-medium border border-border bg-white text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full border-[1.5px]', dotClass)} />
      {value}
    </span>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/kanban/board-by-person.tsx
git commit -m "feat(tareas): add BoardByPerson accordion component"
```

---

### Task 9: KanbanView dispatches between Mine and Team

**Files:**
- Modify: `components/kanban/kanban-view.tsx`

- [ ] **Step 1: Update KanbanView to receive scope and switch boards**

Replace the contents of `components/kanban/kanban-view.tsx` with:

```tsx
'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { TareasScope } from '@/lib/auth/context';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { BoardByPerson } from './board-by-person';
import { ViewToggle } from './view-toggle';
import { SprintNav } from './sprint-nav';

type Props = {
  initialTasks: Task[];
  sprintLabel: string;
  currentSprintId: string | null;
  allSprintIds: string[];
  members: TeamMember[];
  scope: TareasScope;
};

export function KanbanView({
  initialTasks,
  sprintLabel,
  currentSprintId,
  allSprintIds,
  members,
  scope,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<'classic' | 'week'>('classic');

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-5 pt-5">
      <div className="flex items-center gap-2.5 mb-4">
        <h1 className="text-[15px] font-semibold">Sprint activo</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium bg-[#eeeffc] text-[#5e6ad2]">
          <Clock className="w-[11px] h-[11px]" />
          {sprintLabel}
        </span>
        <SprintNav currentSprintId={currentSprintId} allSprintIds={allSprintIds} />
        <div className="ml-3">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {scope === 'team' ? (
        <BoardByPerson
          tasks={tasks}
          setTasks={setTasks}
          members={members}
          membersById={membersById}
          view={view}
        />
      ) : view === 'classic' ? (
        <BoardClassic tasks={tasks} setTasks={setTasks} membersById={membersById} />
      ) : (
        <BoardWeek tasks={tasks} setTasks={setTasks} membersById={membersById} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/kanban/kanban-view.tsx
git commit -m "feat(tareas): KanbanView dispatches between mine and team views"
```

---

### Task 10: Page wires scope, counts, and ScopePill

**Files:**
- Modify: `app/(app)/tareas/page.tsx`

- [ ] **Step 1: Update the page to read scope, filter, and mount the pill**

Replace `app/(app)/tareas/page.tsx` with:
```tsx
import { cookies } from 'next/headers';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { TAREAS_SCOPE_COOKIE } from '@/lib/auth/context';
import { resolveScope } from '@/lib/tareas/scope';
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { getCurrentSprint, getSprint, listSprints } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { KanbanView } from '@/components/kanban/kanban-view';
import { ScopePill } from '@/components/kanban/scope-pill';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ sprint?: string; scope?: string }>;

function formatSprintDates(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  const s = start ? format(parseISO(start), 'd MMM', { locale: es }) : '—';
  const e = end ? format(parseISO(end), 'd MMM', { locale: es }) : '—';
  return `${s} → ${e}`;
}

export default async function TareasPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope(sp.scope, cookieStore.get(TAREAS_SCOPE_COOKIE)?.value);

  const [sprint, sprints] = await Promise.all([
    sp.sprint ? getSprint(sp.sprint) : getCurrentSprint(),
    listSprints(),
  ]);

  const allTasks = await queryTasksByCustomerAndSprint(ctx.customerId, sprint?.id ?? null);

  const myTasks = allTasks.filter((t) => t.assigneeIds.includes(ctx.memberId));
  const visibleTasks = scope === 'mine' ? myTasks : allTasks;

  const memberIds = Array.from(new Set(allTasks.flatMap((t) => t.assigneeIds)));
  const members = await getTeamMembers(memberIds);

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';
  const sprintDates = sprint ? formatSprintDates(sprint.startDate, sprint.endDate) : null;
  const crumbLabel = sprintDates ? `${sprintLabel} · ${sprintDates}` : sprintLabel;

  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: crumbLabel, muted: true }]}>
        <ScopePill
          scope={scope}
          myCount={myTasks.length}
          teamCount={allTasks.length}
          sprintId={sprint?.id ?? null}
        />
      </Topbar>
      <KanbanView
        initialTasks={visibleTasks}
        sprintLabel={sprintLabel}
        currentSprintId={sprint?.id ?? null}
        allSprintIds={sprints.map((s) => s.id)}
        members={members}
        scope={scope}
      />
    </>
  );
}
```

- [ ] **Step 2: Run typecheck and tests**

Run: `npm run typecheck && npx vitest run`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tareas/page.tsx
git commit -m "feat(tareas): wire scope filtering and ScopePill into page"
```

---

### Task 11: Manual verification

Goal: walk through every checklist item from the spec.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Open: http://localhost:3000/tareas

- [ ] **Step 2: Verify default = Mine**

The pill in the topbar reads `Mías ▾` (indigo background). Only your tasks render.

- [ ] **Step 3: Switch to Team**

Click the pill → click `Equipo completo (N)`. URL becomes `/tareas?…&scope=team`. Page re-renders with accordion sections per teammate.

- [ ] **Step 4: Verify cookie persistence**

Close the tab. Reopen http://localhost:3000/tareas. The pill still reads `Equipo` (cookie restored the choice).

- [ ] **Step 5: Verify sprint nav preserves scope**

While on `?scope=team`, click ‹ to go to a previous sprint. URL keeps `scope=team`.

  ⚠ If `?scope=` does not survive sprint navigation, edit `components/kanban/sprint-nav.tsx` to copy the existing `scope` query param into the prev/next hrefs (read it from `useSearchParams`). Add this fix before continuing.

- [ ] **Step 6: Verify view toggle preserves scope**

Toggle Clásico ↔ Semana. URL unchanged; scope preserved.

- [ ] **Step 7: Verify card variants**

Find tasks with 0, 1, 2, 4+ assignees in the Notion DB and confirm:
- 0 → no assignee line at all
- 1 → avatar + full first name
- 2-3 → overlapped stack + comma-separated names
- 4+ → 3 avatars + `+N` chip + names with trailing `+N`

- [ ] **Step 8: Verify ordering of person sections**

In Equipo view, the person with the most `In Progress` tasks appears first. Tied → person with more total tasks first.

- [ ] **Step 9: Verify "Sin asignar" section**

If at least one task in the active sprint has empty `Team` relation in Notion, a final accordion titled "Sin asignar" appears with those tasks. Otherwise it does NOT render.

- [ ] **Step 10: Verify drag & drop within an accordion**

Drag a card from `Por hacer` to `En progreso` inside one person's accordion. Status updates optimistically and persists after refresh.

- [ ] **Step 11: Commit any sprint-nav scope-preservation fix from Step 5**

```bash
git add components/kanban/sprint-nav.tsx
git commit -m "fix(tareas): preserve scope query param across sprint navigation"
```

(Skip this commit if Step 5 didn't require a fix.)

---

## Self-review checklist (already run)

- ✓ Spec coverage: every spec section has at least one task (scope toggle: T1+T4+T5+T10; mine view default: T10; team view accordions: T8+T9; card line: T6+T7; persistence URL+cookie: T2+T4+T10; ordering by load: T3; multi-assignee → first only: T3; sin asignar: T3+T8; archived dropped: T3; topbar slot: T10 reuses existing `children` slot in `components/shell/topbar.tsx:5-27`).
- ✓ Placeholder scan: no TBD / "handle edge cases" / "similar to" placeholders. Every code step contains the actual code or an exact diff.
- ✓ Type consistency: `TareasScope` defined in T1 and used unchanged in T2/T4/T5/T9/T10. `PersonGroup` defined in T3 and consumed by T8. Function signatures align (`resolveScope(urlValue, cookieValue)`, `groupTasksByPerson(tasks, members)`, `setTareasScope(scope, sprintId)`).
