# Project Detail (Mission Control) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "click → opens Notion" behavior of `ProjectCard` with a full in-app project detail page at `/proyectos/[projectId]` rendering hero + summary + stats + 4 modules (Tareas, Reuniones, Equipo, Wiki).

**Architecture:** Server-Component page (`app/(app)/proyectos/[projectId]/page.tsx`) fetches `getProject` and the related task/meeting/wiki/team/owners in parallel, then renders a `ProjectDetail` orchestrator that composes 4 module components. A single small Client Component (`NewTaskButton`) inside the hero opens the existing global `CreateProvider` modal — the `useCreateContext` hook in `hooks/use-create-context.ts` already auto-detects `/proyectos/[id]` and pre-fills the project chip, so no extra wiring is needed. Loading uses Next.js's per-route `loading.tsx`.

**Tech Stack:** Next.js 15 App Router (RSC), TypeScript, Tailwind CSS v4, Vitest + Testing Library (jsdom), Notion JS SDK, Zod, Lucide icons.

**Spec:** `docs/superpowers/specs/2026-04-27-project-detail-design.md`

---

## File Structure

**Create:**
- `lib/projects/status.ts` — shared STATUS color map (extracted from `project-card.tsx` so hero can re-use it).
- `app/(app)/proyectos/[projectId]/page.tsx` — server component, parallel data-fetch, renders `ProjectDetail`.
- `app/(app)/proyectos/[projectId]/loading.tsx` — skeleton matching the hero + stats + grid structure.
- `components/projects/project-detail.tsx` — server orchestrator (composes hero, meta-row, stats, modules).
- `components/projects/project-hero.tsx` — server: gradient bar, icon, name, status pill, priority pill, summary, actions slot.
- `components/projects/new-task-button.tsx` — client: `+ Tarea` button that calls `useCreateContext().open('task')`.
- `components/projects/project-meta-row.tsx` — server: dates, owner, headcount strip.
- `components/projects/project-stats.tsx` — server: 2/3/4 stat cards (avance, tareas, reuniones, días restantes).
- `components/projects/project-tasks-module.tsx` — server: top-5 active tasks, link to `/tareas`.
- `components/projects/project-meetings-module.tsx` — server: top-3 recent meetings, link to `/reuniones`.
- `components/projects/project-team-module.tsx` — server: chips with avatar + name; owner labelled below.
- `components/projects/project-wiki-module.tsx` — server: top-3 wiki, link out to Notion.
- `lib/notion/__tests__/tasks-by-project.test.ts` — vitest mock for `queryTasksByProject`.
- `lib/notion/__tests__/meetings-by-project.test.ts` — vitest mock for `queryMeetingsByProject`.
- `lib/notion/__tests__/wiki-by-project.test.ts` — vitest mock for `queryWikiByProject`.
- `components/projects/__tests__/project-stats.test.tsx`
- `components/projects/__tests__/project-meta-row.test.tsx`
- `components/projects/__tests__/project-hero.test.tsx`
- `components/projects/__tests__/project-tasks-module.test.tsx`
- `components/projects/__tests__/project-meetings-module.test.tsx`
- `components/projects/__tests__/project-team-module.test.tsx`
- `components/projects/__tests__/project-wiki-module.test.tsx`

**Modify:**
- `lib/notion/tasks.ts` — add `queryTasksByProject(projectId)`.
- `lib/notion/meetings.ts` — add `queryMeetingsByProject(projectId)`.
- `lib/notion/wiki.ts` — add `queryWikiByProject(projectId)`.
- `components/projects/project-card.tsx` — replace external `<a target="_blank">` with `<Link href="/proyectos/${id}">`; import STATUS from new shared file.

---

## Task 1 — Extract shared STATUS map (refactor)

**Why:** `project-card.tsx` defines a `STATUS` color map per project status. The new hero must use the *exact same* color tokens. Extracting first avoids divergence.

**Files:**
- Create: `lib/projects/status.ts`
- Modify: `components/projects/project-card.tsx`

- [ ] **Step 1: Create the shared module**

Write `lib/projects/status.ts`:

```ts
import type { ProjectStatus } from '@/schemas/project';

export type ProjectStatusStyle = {
  bg: string;
  text: string;
  dot: string;
  progress: string;
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, ProjectStatusStyle> = {
  Backlog:       { bg: 'bg-white border border-border', text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]', progress: 'bg-[#a0a0a8]' },
  Planning:      { bg: 'bg-[#eeeffc]',                  text: 'text-[#5e6ad2]',         dot: 'bg-[#5e6ad2]', progress: 'bg-[#5e6ad2]' },
  'In Progress': { bg: 'bg-[#eff6ff]',                  text: 'text-[#3a5fcc]',         dot: 'bg-[#3a5fcc]', progress: 'bg-[#3a5fcc]' },
  Paused:        { bg: 'bg-[#faf0db]',                  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]', progress: 'bg-[#c78a2c]' },
  Done:          { bg: 'bg-[#e8f5ec]',                  text: 'text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]', progress: 'bg-[#3f9f5c]' },
  Canceled:      { bg: 'bg-[#fceaea]',                  text: 'text-[#d24949]',         dot: 'bg-[#d24949]', progress: 'bg-[#d24949]' },
};

export const PROJECT_ACCENTS = [
  'from-[#5e6ad2] to-[#7c5fd0]',
  'from-[#c78a2c] to-[#d24949]',
  'from-[#3f9f5c] to-[#6da88e]',
  'from-[#8ba1d9] to-[#a07ac9]',
];

export const PROJECT_ICON_BG = [
  'bg-[#eeeffc] text-[#5e6ad2]',
  'bg-[#faf0db] text-[#c78a2c]',
  'bg-[#e8f5ec] text-[#3f9f5c]',
  'bg-[#f4ecf8] text-[#7f3aa7]',
];
```

- [ ] **Step 2: Update `project-card.tsx` to import from the shared file**

In `components/projects/project-card.tsx`, replace the top-of-file constants:

```tsx
// REMOVE the local STATUS, ACCENTS, ICON_BG constants (lines 6–27).
// REPLACE with:
import {
  PROJECT_STATUS_STYLES,
  PROJECT_ACCENTS,
  PROJECT_ICON_BG,
} from '@/lib/projects/status';
```

Then in the component body change:
```tsx
const s = project.status ? STATUS[project.status] : null;
const accent = ACCENTS[accentIndex % ACCENTS.length];
const iconBg = ICON_BG[accentIndex % ICON_BG.length];
```
to:
```tsx
const s = project.status ? PROJECT_STATUS_STYLES[project.status] : null;
const accent = PROJECT_ACCENTS[accentIndex % PROJECT_ACCENTS.length];
const iconBg = PROJECT_ICON_BG[accentIndex % PROJECT_ICON_BG.length];
```

- [ ] **Step 3: Run typecheck + tests**

```bash
npx tsc --noEmit
npx vitest run components/projects
```
Expected: typecheck PASS, no tests touch project-card directly so suite still green.

- [ ] **Step 4: Commit**

```bash
git add lib/projects/status.ts components/projects/project-card.tsx
git commit -m "refactor(projects): 🔧 extract shared STATUS/ACCENTS/ICON_BG to lib/projects/status

Hero will reuse the same color tokens; avoid drift between card and detail."
```

---

## Task 2 — `queryTasksByProject` (TDD)

**Files:**
- Create: `lib/notion/__tests__/tasks-by-project.test.ts`
- Modify: `lib/notion/tasks.ts`

- [ ] **Step 1: Write the failing test**

Write `lib/notion/__tests__/tasks-by-project.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-ds' } }));

const mockNotion = {
  dataSources: { query: vi.fn() },
};

import { queryTasksByProject } from '../tasks';

describe('queryTasksByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Project relation contains projectId', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryTasksByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('tasks-ds');
    expect(call.filter).toEqual({ property: 'Project', relation: { contains: 'proj-7' } });
  });

  it('parses returned tasks via the existing taskSchema shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          properties: {
            'Task name': { title: [{ plain_text: 'QA mobile' }] },
            Status: { status: { name: 'In Progress' } },
            Priority: { select: { name: 'High' } },
            Type: { select: { name: '✅ Task' } },
            Team: { relation: [{ id: 'team-1' }] },
            Project: { relation: [{ id: 'proj-7' }] },
            Customer: { relation: [{ id: 'c1' }] },
            Sprint: { relation: [] },
            Due: { date: { start: '2026-04-30', end: null } },
            Planned: { date: null },
            'Completed on': { date: null },
            Tags: { multi_select: [] },
            Progress: { number: null },
          },
        },
      ],
    });

    const tasks = await queryTasksByProject('proj-7');
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'QA mobile',
      status: 'In Progress',
      projectId: 'proj-7',
      dueDate: '2026-04-30',
    });
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run lib/notion/__tests__/tasks-by-project.test.ts
```
Expected: FAIL with `queryTasksByProject is not a function` (or import error).

- [ ] **Step 3: Implement `queryTasksByProject`**

In `lib/notion/tasks.ts`, append (after the existing `queryTasksByCustomerAndTitle`):

```ts
export async function queryTasksByProject(projectId: string): Promise<Task[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_TASKS,
    filter: { property: 'Project', relation: { contains: projectId } },
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseTask);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npx vitest run lib/notion/__tests__/tasks-by-project.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notion/tasks.ts lib/notion/__tests__/tasks-by-project.test.ts
git commit -m "feat(notion): 🌐 queryTasksByProject for project-detail view"
```

---

## Task 3 — `queryMeetingsByProject` (TDD)

**Files:**
- Create: `lib/notion/__tests__/meetings-by-project.test.ts`
- Modify: `lib/notion/meetings.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/notion/__tests__/meetings-by-project.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meetings-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryMeetingsByProject } from '../meetings';

describe('queryMeetingsByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Projects relation contains projectId, sorted by created_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryMeetingsByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.data_source_id).toBe('meetings-ds');
    expect(call.filter).toEqual({
      property: 'Projects',
      relation: { contains: 'proj-7' },
    });
    expect(call.sorts).toEqual([{ timestamp: 'created_time', direction: 'descending' }]);
  });

  it('parses returned meetings', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'm-1',
          url: 'https://notion.so/m-1',
          created_time: '2026-04-22T10:00:00.000Z',
          properties: {
            Name: { title: [{ plain_text: 'Sync semanal' }] },
            Date: { date: { start: '2026-04-22', end: null } },
            'Meeting type': { select: { name: 'Weekly' } },
            Summary: { rich_text: [{ plain_text: 'OK' }] },
            Attendees: { people: [] },
            Customer: { relation: [{ id: 'c1' }] },
            Projects: { relation: [{ id: 'proj-7' }] },
            Team: { relation: [] },
            Tasks: { relation: [{ id: 't1' }, { id: 't2' }] },
            Wiki: { relation: [] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByProject('proj-7');
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      id: 'm-1',
      title: 'Sync semanal',
      projectIds: ['proj-7'],
      taskIds: ['t1', 't2'],
    });
  });
});
```

- [ ] **Step 2: Run test, confirm FAIL**

```bash
npx vitest run lib/notion/__tests__/meetings-by-project.test.ts
```
Expected: FAIL with `queryMeetingsByProject is not a function`.

- [ ] **Step 3: Implement**

Append to `lib/notion/meetings.ts`:

```ts
export async function queryMeetingsByProject(projectId: string): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_MEETINGS,
    filter: { property: 'Projects', relation: { contains: projectId } },
    sorts: [{ timestamp: 'created_time', direction: 'descending' }],
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseMeeting);
}
```

- [ ] **Step 4: Run test, confirm PASS**

```bash
npx vitest run lib/notion/__tests__/meetings-by-project.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notion/meetings.ts lib/notion/__tests__/meetings-by-project.test.ts
git commit -m "feat(notion): 📅 queryMeetingsByProject for project-detail view"
```

---

## Task 4 — `queryWikiByProject` (TDD)

**Files:**
- Create: `lib/notion/__tests__/wiki-by-project.test.ts`
- Modify: `lib/notion/wiki.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/notion/__tests__/wiki-by-project.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_WIKI: 'wiki-ds' } }));

const mockNotion = { dataSources: { query: vi.fn() } };

import { queryWikiByProject } from '../wiki';

describe('queryWikiByProject', () => {
  beforeEach(() => mockNotion.dataSources.query.mockReset());

  it('filters by Projects relation contains projectId, sorted by last_edited_time desc', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });
    await queryWikiByProject('proj-7');
    const call = mockNotion.dataSources.query.mock.calls[0]![0];
    expect(call.filter).toEqual({
      property: 'Projects',
      relation: { contains: 'proj-7' },
    });
    expect(call.sorts).toEqual([
      { timestamp: 'last_edited_time', direction: 'descending' },
    ]);
  });

  it('parses returned wiki pages', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'w-1',
          url: 'https://notion.so/w-1',
          icon: { type: 'emoji', emoji: '📄' },
          last_edited_time: '2026-04-20T10:00:00.000Z',
          properties: {
            'Doc name': { title: [{ plain_text: 'Brief inicial' }] },
            Category: { multi_select: [{ name: 'Documentation' }] },
            Customer: { relation: [{ id: 'c1' }] },
            Projects: { relation: [{ id: 'proj-7' }] },
            Meetings: { relation: [] },
          },
        },
      ],
    });

    const pages = await queryWikiByProject('proj-7');
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      id: 'w-1',
      title: 'Brief inicial',
      icon: '📄',
      categories: ['Documentation'],
      projectIds: ['proj-7'],
    });
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run lib/notion/__tests__/wiki-by-project.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement**

Append to `lib/notion/wiki.ts` (after `queryWikiByCustomerAndTitle` or before `createWikiPage` — placement is fine either way):

```ts
export async function queryWikiByProject(projectId: string): Promise<WikiPage[]> {
  const notion = getNotion();
  const res = await notion.dataSources.query({
    data_source_id: serverEnv.NOTION_DB_WIKI,
    filter: { property: 'Projects', relation: { contains: projectId } },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
  });
  return res.results.filter((r): r is any => 'properties' in r).map(parseWiki);
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run lib/notion/__tests__/wiki-by-project.test.ts
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notion/wiki.ts lib/notion/__tests__/wiki-by-project.test.ts
git commit -m "feat(notion): 📚 queryWikiByProject for project-detail view"
```

---

## Task 5 — `ProjectStats` component (TDD)

Renders 2/3/4 stat cards depending on which data is available.

**Files:**
- Create: `components/projects/__tests__/project-stats.test.tsx`
- Create: `components/projects/project-stats.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-stats.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectStats } from '../project-stats';

describe('ProjectStats', () => {
  it('renders 4 cards when all data is present', () => {
    const future = new Date(Date.now() + 12 * 86_400_000).toISOString();
    render(
      <ProjectStats
        completion={0.62}
        tasksDone={8}
        tasksTotal={12}
        meetingsCount={4}
        endDate={future}
      />,
    );
    expect(screen.getByText('62%')).toBeInTheDocument();
    expect(screen.getByText('8 / 12')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/12d/)).toBeInTheDocument();
  });

  it('omits the avance card when completion is null', () => {
    render(
      <ProjectStats
        completion={null}
        tasksDone={0}
        tasksTotal={0}
        meetingsCount={0}
        endDate={null}
      />,
    );
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
  });

  it('omits the días-restantes card when endDate is null', () => {
    render(
      <ProjectStats
        completion={0.5}
        tasksDone={1}
        tasksTotal={2}
        meetingsCount={0}
        endDate={null}
      />,
    );
    expect(screen.queryByText(/restantes/i)).not.toBeInTheDocument();
  });

  it('shows "Vencido" with negative days when endDate is in the past', () => {
    const past = new Date(Date.now() - 3 * 86_400_000).toISOString();
    render(
      <ProjectStats
        completion={null}
        tasksDone={0}
        tasksTotal={0}
        meetingsCount={0}
        endDate={past}
      />,
    );
    expect(screen.getByText(/Vencido/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-stats.test.tsx
```
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-stats.tsx
import { cn } from '@/lib/utils';

type Props = {
  completion: number | null; // 0..1
  tasksDone: number;
  tasksTotal: number;
  meetingsCount: number;
  endDate: string | null; // ISO
};

function daysRemaining(endIso: string): number {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86_400_000);
}

export function ProjectStats({
  completion,
  tasksDone,
  tasksTotal,
  meetingsCount,
  endDate,
}: Props) {
  const days = endDate ? daysRemaining(endDate) : null;
  const visible: Array<'avance' | 'tasks' | 'meetings' | 'days'> = [];
  if (completion !== null) visible.push('avance');
  visible.push('tasks');
  visible.push('meetings');
  if (days !== null) visible.push('days');

  const cols = visible.length === 4 ? 'sm:grid-cols-4' : visible.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  const dayTone =
    days === null
      ? ''
      : days < 0
        ? 'bg-[#fceaea] border-[#f5d6d6] text-[#d24949]'
        : days < 14
          ? 'bg-[#faf0db] border-[#f3e2c0] text-[#c78a2c]'
          : '';

  return (
    <div className={cn('grid grid-cols-2 gap-2.5 sm:gap-3 mb-5', cols)}>
      {completion !== null && (
        <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
          <div className="text-[20px] font-semibold leading-none tracking-[-0.01em]">
            {Math.round(completion * 100)}%
          </div>
          <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">Avance</div>
          <div className="h-1 mt-2 bg-[#e8e8ee] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#7c5fd0]"
              style={{ width: `${Math.round(completion * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
        <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
          {tasksDone} / {tasksTotal}
        </div>
        <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">Tareas</div>
      </div>

      <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
        <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
          {meetingsCount}
        </div>
        <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">Reuniones</div>
      </div>

      {days !== null && (
        <div className={cn('rounded-xl px-3 py-3 border', dayTone || 'bg-[#fafbff] border-[#f0f0f4]')}>
          <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
            {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
          </div>
          <div className="text-[10px] uppercase tracking-[0.05em] mt-1 opacity-90">
            {days < 0 ? 'Vencido' : 'Restantes'}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-stats.test.tsx
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-stats.tsx components/projects/__tests__/project-stats.test.tsx
git commit -m "feat(projects): 📊 ProjectStats — adaptive 2/3/4 grid, vencido tone"
```

---

## Task 6 — `ProjectMetaRow` component (TDD)

**Files:**
- Create: `components/projects/__tests__/project-meta-row.test.tsx`
- Create: `components/projects/project-meta-row.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-meta-row.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMetaRow } from '../project-meta-row';

describe('ProjectMetaRow', () => {
  it('renders date range, owner name and headcount', () => {
    render(
      <ProjectMetaRow
        startDate="2026-06-15"
        endDate="2026-09-30"
        ownerName="Dani"
        teamCount={4}
      />,
    );
    expect(screen.getByText(/15 jun.*30 sep/i)).toBeInTheDocument();
    expect(screen.getByText(/Dani/)).toBeInTheDocument();
    expect(screen.getByText(/4 personas/)).toBeInTheDocument();
  });

  it('renders only end date as "Vence X" when startDate is null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate="2026-09-30" ownerName={null} teamCount={0} />,
    );
    expect(screen.getByText(/Vence 30 sep/i)).toBeInTheDocument();
  });

  it('omits the owner chip when ownerName is null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate={null} ownerName={null} teamCount={0} />,
    );
    expect(screen.queryByText(/Owner:/)).not.toBeInTheDocument();
  });

  it('omits dates entirely when both are null', () => {
    render(
      <ProjectMetaRow startDate={null} endDate={null} ownerName="Ana" teamCount={2} />,
    );
    expect(screen.queryByText(/Vence/)).not.toBeInTheDocument();
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-meta-row.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-meta-row.tsx
import { Calendar, User, Users } from 'lucide-react';

type Props = {
  startDate: string | null;
  endDate: string | null;
  ownerName: string | null;
  teamCount: number;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function ProjectMetaRow({ startDate, endDate, ownerName, teamCount }: Props) {
  const hasDates = startDate || endDate;
  const dateLabel = startDate && endDate
    ? `${fmt(startDate)} – ${fmt(endDate)}`
    : endDate
      ? `Vence ${fmt(endDate)}`
      : startDate
        ? `Inicia ${fmt(startDate)}`
        : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground mb-4">
      {dateLabel && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          {dateLabel}
        </span>
      )}
      {ownerName && (
        <>
          {hasDates && <span className="text-border">·</span>}
          <span className="inline-flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" />
            Owner: <span className="text-foreground font-medium">{ownerName}</span>
          </span>
        </>
      )}
      {teamCount > 0 && (
        <>
          {(hasDates || ownerName) && <span className="text-border">·</span>}
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {teamCount} {teamCount === 1 ? 'persona' : 'personas'}
          </span>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-meta-row.test.tsx
```
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-meta-row.tsx components/projects/__tests__/project-meta-row.test.tsx
git commit -m "feat(projects): 🗓 ProjectMetaRow — fechas, owner, headcount"
```

---

## Task 7 — `NewTaskButton` (client) + `ProjectHero` (server)

**Files:**
- Create: `components/projects/new-task-button.tsx`
- Create: `components/projects/__tests__/project-hero.test.tsx`
- Create: `components/projects/project-hero.tsx`

- [ ] **Step 1: Implement `NewTaskButton`**

```tsx
// components/projects/new-task-button.tsx
'use client';

import { Plus } from 'lucide-react';
import { useCreateContext } from '@/components/create/create-provider';

export function NewTaskButton() {
  const { open } = useCreateContext();
  return (
    <button
      type="button"
      onClick={() => open('task')}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
    >
      <Plus className="w-3.5 h-3.5" />
      Tarea
    </button>
  );
}
```

> **Note:** No test for this — it's a 4-line wrapper around an existing well-tested provider. Behavior is covered by the create-provider tests.

- [ ] **Step 2: Write the failing test for the hero**

```tsx
// components/projects/__tests__/project-hero.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectHero } from '../project-hero';
import type { Project } from '@/schemas/project';

vi.mock('@/components/projects/new-task-button', () => ({
  NewTaskButton: () => <button>+ Tarea</button>,
}));

const mkProject = (over: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Lanzamiento Amedi v2',
  icon: '🏥',
  summary: 'Lanzar la v2 de la plataforma con onboarding renovado.',
  status: 'In Progress',
  priority: 'High',
  completion: 0.62,
  ownerIds: [],
  customerId: 'c1',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p1',
  ...over,
});

describe('ProjectHero', () => {
  it('renders name, status pill, priority pill, summary', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    expect(screen.getByRole('heading', { name: /Lanzamiento Amedi v2/i })).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText(/onboarding renovado/i)).toBeInTheDocument();
  });

  it('renders the icon emoji when present, fallback FolderKanban otherwise', () => {
    const { rerender } = render(<ProjectHero project={mkProject({ icon: '🚀' })} accentIndex={0} />);
    expect(screen.getByText('🚀')).toBeInTheDocument();
    rerender(<ProjectHero project={mkProject({ icon: null })} accentIndex={0} />);
    // Fallback renders a Lucide svg with role img is not set; just check no emoji
    expect(screen.queryByText('🚀')).not.toBeInTheDocument();
  });

  it('omits the summary block when summary is null', () => {
    render(<ProjectHero project={mkProject({ summary: null })} accentIndex={0} />);
    expect(screen.queryByText(/onboarding renovado/i)).not.toBeInTheDocument();
  });

  it('renders an "Abrir en Notion" external link to project.url', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    const link = screen.getByRole('link', { name: /notion/i });
    expect(link).toHaveAttribute('href', 'https://notion.so/p1');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the New Task button', () => {
    render(<ProjectHero project={mkProject()} accentIndex={0} />);
    expect(screen.getByRole('button', { name: /Tarea/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-hero.test.tsx
```
Expected: FAIL.

- [ ] **Step 4: Implement `ProjectHero`**

```tsx
// components/projects/project-hero.tsx
import { FolderKanban, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectPriority } from '@/schemas/project';
import {
  PROJECT_STATUS_STYLES,
  PROJECT_ACCENTS,
  PROJECT_ICON_BG,
} from '@/lib/projects/status';
import { NewTaskButton } from './new-task-button';

const PRIORITY_STYLES: Record<ProjectPriority, { bg: string; text: string; dot: string }> = {
  Low:    { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  Medium: { bg: 'bg-[#faf0db]',  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]' },
  High:   { bg: 'bg-[#fceaea]',  text: 'text-[#d24949]',         dot: 'bg-[#d24949]' },
};

type Props = { project: Project; accentIndex: number };

export function ProjectHero({ project, accentIndex }: Props) {
  const status = project.status ? PROJECT_STATUS_STYLES[project.status] : null;
  const priority = project.priority ? PRIORITY_STYLES[project.priority] : null;
  const accent = PROJECT_ACCENTS[accentIndex % PROJECT_ACCENTS.length];
  const iconBg = PROJECT_ICON_BG[accentIndex % PROJECT_ICON_BG.length];

  return (
    <div className="relative bg-white border border-border rounded-xl overflow-hidden mb-4">
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', accent)} />
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn('w-12 h-12 rounded-lg grid place-items-center text-[24px] shrink-0', iconBg)}>
            {project.icon ?? <FolderKanban className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] truncate min-w-0">
                {project.name}
              </h1>
              {status && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0',
                    status.bg,
                    status.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  {project.status}
                </span>
              )}
              {priority && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0',
                    priority.bg,
                    priority.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
                  {project.priority}
                </span>
              )}
            </div>
            {project.summary && (
              <p className="text-[13px] text-foreground/80 leading-relaxed max-w-[68ch]">
                {project.summary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NewTaskButton />
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir en Notion"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-hero.test.tsx
```
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add components/projects/project-hero.tsx components/projects/new-task-button.tsx components/projects/__tests__/project-hero.test.tsx
git commit -m "feat(projects): ✨ ProjectHero with summary + status/priority pills + NewTaskButton"
```

---

## Task 8 — `ProjectTasksModule` (TDD)

**Files:**
- Create: `components/projects/__tests__/project-tasks-module.test.tsx`
- Create: `components/projects/project-tasks-module.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-tasks-module.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTasksModule } from '../project-tasks-module';
import type { Task, TaskStatus } from '@/schemas/task';

const mk = (over: Partial<Task>): Task => ({
  id: 't',
  title: 'Untitled',
  status: 'Not Started',
  priority: null,
  type: null,
  assigneeIds: [],
  projectId: 'p',
  customerId: 'c',
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://notion.so/t',
  ...over,
});

describe('ProjectTasksModule', () => {
  it('shows empty state when no tasks', () => {
    render(<ProjectTasksModule tasks={[]} />);
    expect(screen.getByText(/Sin tareas/i)).toBeInTheDocument();
  });

  it('renders top 5 sorted by status then dueDate', () => {
    const tasks: Task[] = [
      mk({ id: '1', title: 'Done old', status: 'Done', dueDate: '2026-01-01' }),
      mk({ id: '2', title: 'Active soon', status: 'In Progress', dueDate: '2026-04-30' }),
      mk({ id: '3', title: 'Active later', status: 'In Progress', dueDate: '2026-05-15' }),
      mk({ id: '4', title: 'In review', status: 'In Review', dueDate: '2026-05-01' }),
      mk({ id: '5', title: 'Refining', status: 'Refining' }),
      mk({ id: '6', title: 'Not started', status: 'Not Started' }),
      mk({ id: '7', title: 'Sixth active', status: 'In Progress', dueDate: '2026-05-20' }),
    ];
    render(<ProjectTasksModule tasks={tasks} />);
    // First active in-progress with earliest due appears first
    const rows = screen.getAllByRole('link');
    const titles = rows.map((r) => r.textContent ?? '');
    expect(titles[0]).toContain('Active soon');
    expect(rows.length).toBe(5); // top 5 only
  });

  it('renders each row as a link to /tareas/[id]', () => {
    const tasks = [mk({ id: 'abc', title: 'Hello' })];
    render(<ProjectTasksModule tasks={tasks} />);
    const link = screen.getByRole('link', { name: /Hello/ });
    expect(link).toHaveAttribute('href', '/tareas/abc');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-tasks-module.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-tasks-module.tsx
import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import type { Task, TaskStatus } from '@/schemas/task';
import { cn } from '@/lib/utils';

const STATUS_ORDER: Record<TaskStatus, number> = {
  'In Progress': 0,
  'In Review':   1,
  Refining:      2,
  'Not Started': 3,
  Done:          4,
  Archived:      5,
};

const STATUS_PILL: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  Refining:      { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  'Not Started': { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  'In Progress': { bg: 'bg-[#eff6ff]',  text: 'text-[#3a5fcc]',         dot: 'bg-[#3a5fcc]' },
  'In Review':   { bg: 'bg-[#faf0db]',  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]' },
  Done:          { bg: 'bg-[#e8f5ec]',  text: 'text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]' },
  Archived:      { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
};

function fmtDue(iso: string): string {
  return `vence ${new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
}

export function ProjectTasksModule({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <Module title="Tareas activas">
        <p className="text-[12px] text-muted-foreground py-3">
          Sin tareas en este proyecto. Crea la primera con el botón <strong>+ Tarea</strong>.
        </p>
      </Module>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const visible = sorted.slice(0, 5);

  return (
    <Module
      title="Tareas activas"
      action={tasks.length > 5 ? <Link href="/tareas" className="text-[11px] text-[#5e6ad2] hover:underline">Ver todas →</Link> : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((t) => {
          const pill = STATUS_PILL[t.status];
          const done = t.status === 'Done' || t.status === 'Archived';
          return (
            <li key={t.id}>
              <Link
                href={`/tareas/${t.id}`}
                className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded border-[1.5px] shrink-0',
                    done ? 'bg-[#3f9f5c] border-[#3f9f5c]' : 'border-[#c9cbe8]',
                  )}
                />
                <span className={cn('text-[12.5px] flex-1 min-w-0 truncate', done && 'line-through text-muted-foreground')}>
                  {t.title}
                </span>
                {t.dueDate && !done && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmtDue(t.dueDate)}</span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium shrink-0',
                    pill.bg,
                    pill.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', pill.dot)} />
                  {t.status}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Module>
  );
}

function Module({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-tasks-module.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-tasks-module.tsx components/projects/__tests__/project-tasks-module.test.tsx
git commit -m "feat(projects): ✅ ProjectTasksModule — top 5 sorted by status+due"
```

---

## Task 9 — `ProjectMeetingsModule` (TDD)

**Files:**
- Create: `components/projects/__tests__/project-meetings-module.test.tsx`
- Create: `components/projects/project-meetings-module.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-meetings-module.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMeetingsModule } from '../project-meetings-module';
import type { Meeting } from '@/schemas/meeting';

const mk = (over: Partial<Meeting>): Meeting => ({
  id: 'm',
  title: 'Untitled',
  createdTime: '2026-04-01T10:00:00.000Z',
  date: null,
  endDate: null,
  meetingType: null,
  summary: null,
  attendeeIds: [],
  customerId: 'c',
  projectIds: ['p'],
  teamIds: [],
  taskIds: [],
  wikiIds: [],
  url: 'https://notion.so/m',
  ...over,
});

describe('ProjectMeetingsModule', () => {
  it('renders empty state when no meetings', () => {
    render(<ProjectMeetingsModule meetings={[]} />);
    expect(screen.getByText(/Sin reuniones/i)).toBeInTheDocument();
  });

  it('renders top 3 sorted by date desc and shows action-item count', () => {
    const meetings = [
      mk({ id: 'old', title: 'Kickoff', date: '2026-01-15', taskIds: [] }),
      mk({ id: 'mid', title: 'Decisión X', date: '2026-04-18', taskIds: ['t1', 't2'] }),
      mk({ id: 'new', title: 'Sync semanal', date: '2026-04-22', taskIds: ['t3'] }),
      mk({ id: 'newest', title: 'Retro', date: '2026-04-25', taskIds: [] }),
    ];
    render(<ProjectMeetingsModule meetings={meetings} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveTextContent('Retro');
    expect(screen.getByText(/2 acciones/i)).toBeInTheDocument();
    expect(screen.getByText(/1 acción/i)).toBeInTheDocument();
  });

  it('links rows to /reuniones/[id]', () => {
    render(<ProjectMeetingsModule meetings={[mk({ id: 'abc', title: 'Hi' })]} />);
    expect(screen.getByRole('link', { name: /Hi/ })).toHaveAttribute('href', '/reuniones/abc');
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-meetings-module.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-meetings-module.tsx
import Link from 'next/link';
import { Calendar } from 'lucide-react';
import type { Meeting } from '@/schemas/meeting';

function ts(m: Meeting): number {
  return new Date(m.date ?? m.createdTime).getTime();
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function ProjectMeetingsModule({ meetings }: { meetings: Meeting[] }) {
  if (meetings.length === 0) {
    return (
      <Module title="Reuniones recientes">
        <p className="text-[12px] text-muted-foreground py-3">
          Aún no hay reuniones asociadas a este proyecto.
        </p>
      </Module>
    );
  }

  const sorted = [...meetings].sort((a, b) => ts(b) - ts(a));
  const visible = sorted.slice(0, 3);

  return (
    <Module
      title="Reuniones recientes"
      action={meetings.length > 3 ? <Link href="/reuniones" className="text-[11px] text-[#5e6ad2] hover:underline">Ver todas →</Link> : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((m) => {
          const actions = m.taskIds.length;
          return (
            <li key={m.id}>
              <Link
                href={`/reuniones/${m.id}`}
                className="block py-2.5 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
              >
                <div className="text-[12.5px] font-medium truncate">{m.title}</div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5">
                  {[
                    m.date ? fmt(m.date) : null,
                    m.meetingType,
                    actions > 0 ? `${actions} ${actions === 1 ? 'acción' : 'acciones'}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Module>
  );
}

function Module({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-meetings-module.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-meetings-module.tsx components/projects/__tests__/project-meetings-module.test.tsx
git commit -m "feat(projects): 📅 ProjectMeetingsModule — top 3 with action-item count"
```

---

## Task 10 — `ProjectTeamModule` (TDD)

**Files:**
- Create: `components/projects/__tests__/project-team-module.test.tsx`
- Create: `components/projects/project-team-module.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-team-module.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectTeamModule } from '../project-team-module';
import type { TeamMember } from '@/schemas/team-member';

const mk = (over: Partial<TeamMember>): TeamMember => ({
  id: 't',
  name: 'Anon',
  email: 'anon@example.com',
  role: null,
  area: null,
  customerIds: [],
  projectIds: [],
  ...over,
});

describe('ProjectTeamModule', () => {
  it('shows empty state when no members and no owner', () => {
    render(<ProjectTeamModule members={[]} ownerName={null} />);
    expect(screen.getByText(/Sin equipo asignado/i)).toBeInTheDocument();
  });

  it('renders chips for each member', () => {
    render(
      <ProjectTeamModule
        members={[
          mk({ id: '1', name: 'Dani' }),
          mk({ id: '2', name: 'Mario' }),
        ]}
        ownerName="Dani"
      />,
    );
    expect(screen.getByText('Dani')).toBeInTheDocument();
    expect(screen.getByText('Mario')).toBeInTheDocument();
    expect(screen.getByText(/Owner: Dani/i)).toBeInTheDocument();
  });

  it('shows +N chip when more than 5 members', () => {
    const members = Array.from({ length: 7 }, (_, i) =>
      mk({ id: `${i}`, name: `Member ${i}` }),
    );
    render(<ProjectTeamModule members={members} ownerName={null} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-team-module.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-team-module.tsx
import { Users } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '·';
}

const AVATAR_BG = ['#cbd5ff', '#f4a3a3', '#a3d8b1', '#e3c69b', '#c8b3e8', '#a3d4e8'];
function bgFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length]!;
}

type Props = { members: TeamMember[]; ownerName: string | null };

export function ProjectTeamModule({ members, ownerName }: Props) {
  if (members.length === 0 && !ownerName) {
    return (
      <Module>
        <p className="text-[12px] text-muted-foreground py-3">Sin equipo asignado.</p>
      </Module>
    );
  }

  const visible = members.slice(0, 5);
  const overflow = members.length - visible.length;

  return (
    <Module>
      <div className="flex flex-wrap gap-1.5">
        {visible.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 bg-[#fafbff] border border-[#f0f0f4] rounded-full pl-1 pr-2.5 py-0.5 text-[11.5px]"
          >
            <span
              aria-hidden
              className="w-5 h-5 rounded-full grid place-items-center text-[9.5px] font-semibold text-white"
              style={{ background: bgFor(m.id) }}
            >
              {initials(m.name)}
            </span>
            {m.name}
          </span>
        ))}
        {overflow > 0 && (
          <span className="inline-flex items-center bg-[#fafbff] border border-[#f0f0f4] rounded-full px-2.5 py-1 text-[11.5px] text-muted-foreground">
            +{overflow}
          </span>
        )}
      </div>
      {ownerName && (
        <p className="text-[10.5px] text-muted-foreground mt-2">
          Owner: <span className="text-foreground font-medium">{ownerName}</span>
        </p>
      )}
    </Module>
  );
}

function Module({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <h2 className="text-[12px] font-semibold flex items-center gap-2 mb-2">
        <Users className="w-3.5 h-3.5 text-muted-foreground" />
        Equipo
      </h2>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-team-module.test.tsx
```
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-team-module.tsx components/projects/__tests__/project-team-module.test.tsx
git commit -m "feat(projects): 👥 ProjectTeamModule — chips + owner label + overflow"
```

---

## Task 11 — `ProjectWikiModule` (TDD)

**Files:**
- Create: `components/projects/__tests__/project-wiki-module.test.tsx`
- Create: `components/projects/project-wiki-module.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/projects/__tests__/project-wiki-module.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectWikiModule } from '../project-wiki-module';
import type { WikiPage } from '@/schemas/wiki';

const mk = (over: Partial<WikiPage>): WikiPage => ({
  id: 'w',
  title: 'Untitled',
  icon: null,
  cover: null,
  categories: [],
  customerId: 'c',
  projectIds: ['p'],
  meetingIds: [],
  lastEditedAt: '2026-04-01T10:00:00.000Z',
  url: 'https://notion.so/w',
  ...over,
});

describe('ProjectWikiModule', () => {
  it('renders empty state when no pages', () => {
    render(<ProjectWikiModule pages={[]} />);
    expect(screen.getByText(/Sin documentación/i)).toBeInTheDocument();
  });

  it('renders top 3 with category chips, opening Notion in a new tab', () => {
    const pages = [
      mk({ id: '1', title: 'Brief', categories: ['Strategy doc'] }),
      mk({ id: '2', title: 'Decisiones', categories: ['Documentation'] }),
      mk({ id: '3', title: 'OKRs', categories: ['Planning'] }),
      mk({ id: '4', title: 'Investigación', categories: [] }),
    ];
    render(<ProjectWikiModule pages={pages} />);
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3 + 1); // 3 wiki + "Ver todo"
    expect(links[0]).toHaveAttribute('target', '_blank');
    expect(screen.getByText('Strategy doc')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, confirm FAIL**

```bash
npx vitest run components/projects/__tests__/project-wiki-module.test.tsx
```
Expected: FAIL.

- [ ] **Step 3: Implement**

```tsx
// components/projects/project-wiki-module.tsx
import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import type { WikiPage } from '@/schemas/wiki';

export function ProjectWikiModule({ pages }: { pages: WikiPage[] }) {
  if (pages.length === 0) {
    return (
      <Module>
        <p className="text-[12px] text-muted-foreground py-3">Sin documentación asociada.</p>
      </Module>
    );
  }

  const sorted = [...pages].sort((a, b) => b.lastEditedAt.localeCompare(a.lastEditedAt));
  const visible = sorted.slice(0, 3);

  return (
    <Module
      action={pages.length > 3 ? (
        <Link href="/wiki" className="text-[11px] text-[#5e6ad2] hover:underline">Ver todo →</Link>
      ) : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((w) => (
          <li key={w.id}>
            <a
              href={w.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
            >
              <span className="w-5 h-5 rounded-md bg-[#fafbff] border border-[#f0f0f4] grid place-items-center text-[12px] shrink-0">
                {w.icon ?? '📄'}
              </span>
              <span className="text-[12.5px] flex-1 min-w-0 truncate">{w.title}</span>
              {w.categories[0] && (
                <span className="text-[9.5px] uppercase tracking-[0.04em] bg-[#eeeffc] text-[#5e6ad2] px-1.5 py-0.5 rounded shrink-0">
                  {w.categories[0]}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </Module>
  );
}

function Module({ action, children }: { action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
          Wiki
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Run, confirm PASS**

```bash
npx vitest run components/projects/__tests__/project-wiki-module.test.tsx
```
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add components/projects/project-wiki-module.tsx components/projects/__tests__/project-wiki-module.test.tsx
git commit -m "feat(projects): 📚 ProjectWikiModule — top 3 + category chip"
```

---

## Task 12 — `ProjectDetail` orchestrator

Composes hero + meta-row + stats + 4 modules. Pure server component.

**Files:**
- Create: `components/projects/project-detail.tsx`

- [ ] **Step 1: Implement**

```tsx
// components/projects/project-detail.tsx
import type { Project } from '@/schemas/project';
import type { Task } from '@/schemas/task';
import type { Meeting } from '@/schemas/meeting';
import type { WikiPage } from '@/schemas/wiki';
import type { TeamMember } from '@/schemas/team-member';
import { ProjectHero } from './project-hero';
import { ProjectMetaRow } from './project-meta-row';
import { ProjectStats } from './project-stats';
import { ProjectTasksModule } from './project-tasks-module';
import { ProjectMeetingsModule } from './project-meetings-module';
import { ProjectTeamModule } from './project-team-module';
import { ProjectWikiModule } from './project-wiki-module';

type Props = {
  project: Project;
  tasks: Task[];
  meetings: Meeting[];
  wiki: WikiPage[];
  members: TeamMember[];
  ownerName: string | null;
  accentIndex: number;
};

export function ProjectDetail({
  project,
  tasks,
  meetings,
  wiki,
  members,
  ownerName,
  accentIndex,
}: Props) {
  const tasksDone = tasks.filter((t) => t.status === 'Done' || t.status === 'Archived').length;

  return (
    <>
      <ProjectHero project={project} accentIndex={accentIndex} />
      <ProjectMetaRow
        startDate={project.startDate}
        endDate={project.endDate}
        ownerName={ownerName}
        teamCount={project.teamIds.length}
      />
      <ProjectStats
        completion={project.completion}
        tasksDone={tasksDone}
        tasksTotal={tasks.length}
        meetingsCount={meetings.length}
        endDate={project.endDate}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 lg:gap-4">
        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          <ProjectTasksModule tasks={tasks} />
          <ProjectMeetingsModule meetings={meetings} />
        </div>
        <div className="flex flex-col gap-3 lg:gap-4 min-w-0">
          <ProjectTeamModule members={members} ownerName={ownerName} />
          <ProjectWikiModule pages={wiki} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```
Expected: no errors related to `project-detail.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/projects/project-detail.tsx
git commit -m "feat(projects): 🎛 ProjectDetail orchestrator (hero + stats + grid)"
```

---

## Task 13 — Page route + loading skeleton

**Files:**
- Create: `app/(app)/proyectos/[projectId]/page.tsx`
- Create: `app/(app)/proyectos/[projectId]/loading.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/(app)/proyectos/[projectId]/page.tsx
import { notFound } from 'next/navigation';
import { Topbar } from '@/components/shell/topbar';
import { PageEnter } from '@/components/motion/page-enter';
import { requireContext } from '@/lib/auth/require-context';
import { getProject } from '@/lib/notion/projects';
import { queryTasksByProject } from '@/lib/notion/tasks';
import { queryMeetingsByProject } from '@/lib/notion/meetings';
import { queryWikiByProject } from '@/lib/notion/wiki';
import { getTeamMembers } from '@/lib/notion/team';
import { getUsers } from '@/lib/notion/users';
import { ProjectDetail } from '@/components/projects/project-detail';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const ctx = await requireContext();
  const { projectId } = await params;

  const [project, tasks, meetings, wiki] = await Promise.all([
    getProject(projectId),
    queryTasksByProject(projectId),
    queryMeetingsByProject(projectId),
    queryWikiByProject(projectId),
  ]);

  if (!project || project.customerId !== ctx.customerId) notFound();

  const [members, owners] = await Promise.all([
    getTeamMembers(project.teamIds),
    getUsers(project.ownerIds),
  ]);
  const ownerName = owners[0]?.name ?? null;

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar
        crumbs={[
          { label: 'Proyectos', href: '/proyectos' },
          { label: project.name, muted: true },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[1100px] mx-auto w-full">
          <ProjectDetail
            project={project}
            tasks={tasks}
            meetings={meetings}
            wiki={wiki}
            members={members}
            ownerName={ownerName}
            accentIndex={0}
          />
        </div>
      </div>
    </PageEnter>
  );
}
```

- [ ] **Step 2: Create the loading skeleton**

```tsx
// app/(app)/proyectos/[projectId]/loading.tsx
export default function Loading() {
  return (
    <article className="flex flex-col h-full overflow-hidden">
      <div className="h-11 border-b border-border flex items-center pl-12 pr-3 sm:pr-4 lg:pl-4 gap-2 sm:gap-3 shrink-0">
        <div className="h-4 w-20 bg-[#eeeff1] rounded animate-pulse" />
        <span className="text-muted-foreground">/</span>
        <div className="h-4 w-40 bg-[#f7f7f8] rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 max-w-[1100px] mx-auto w-full">
          {/* hero */}
          <div className="bg-white border border-border rounded-xl px-5 sm:px-6 pt-5 pb-4 mb-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#eeeffc] animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-1/2 bg-[#eeeff1] rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-[#f7f7f8] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* meta */}
          <div className="h-3 w-2/5 bg-[#f7f7f8] rounded animate-pulse mb-5" />
          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl h-[78px] animate-pulse" />
            ))}
          </div>
          {/* grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 lg:gap-4">
            <div className="space-y-3">
              <div className="bg-white border border-border rounded-xl h-44 animate-pulse" />
              <div className="bg-white border border-border rounded-xl h-36 animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-border rounded-xl h-28 animate-pulse" />
              <div className="bg-white border border-border rounded-xl h-36 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Typecheck + run all tests**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: green typecheck, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/proyectos/\[projectId\]/page.tsx app/\(app\)/proyectos/\[projectId\]/loading.tsx
git commit -m "feat(proyectos): 🚀 /proyectos/[projectId] in-app detail view"
```

---

## Task 14 — Re-route `ProjectCard` to in-app `<Link>`

**Files:**
- Modify: `components/projects/project-card.tsx`

- [ ] **Step 1: Replace external anchor with `<Link>`**

In `components/projects/project-card.tsx`:

Add import at the top:
```tsx
import Link from 'next/link';
```

Replace the opening tag:
```tsx
<a
  href={project.url}
  target="_blank"
  rel="noreferrer"
  className="..."
>
```
with:
```tsx
<Link
  href={`/proyectos/${project.id}`}
  className="..."
>
```

And the closing `</a>` with `</Link>`.

The `className`, `<div>` children, and accent bar stay identical.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```
Expected: green. (No project-card test exists, so this is a smoke check.)

- [ ] **Step 3: Manual smoke**

```bash
npm run dev
```
Open http://localhost:3000/proyectos in the browser, click a project card. The detail page should load in-app (no new tab, no Notion redirect). Hero, stats, and modules should render. Click a task row → navigates to `/tareas/[id]`. Click "↗" in hero → opens Notion in new tab.

- [ ] **Step 4: Commit**

```bash
git add components/projects/project-card.tsx
git commit -m "feat(proyectos): 🔗 cards open in-app /proyectos/[id] (no más Notion)"
```

---

## Task 15 — Final pass: typecheck, lint, full test run

- [ ] **Step 1: Run the full quality gate**

```bash
npx tsc --noEmit
npm run lint
npx vitest run
```
Expected: all three green.

- [ ] **Step 2: Manual e2e checklist (browser)**

Open `npm run dev` and verify each:

- [ ] `/proyectos` lists projects; clicking one navigates **in-app** to `/proyectos/[id]`.
- [ ] Hero shows: gradient bar, icon (or fallback), name, status pill, priority pill, summary (or absent if null), `+ Tarea` button, `↗` link to Notion.
- [ ] Meta-row: dates / owner / personas chips render correctly with `·` separators.
- [ ] Stats grid: shows 2/3/4 cards correctly when data is partial; "Vencido" tone when end date is in the past.
- [ ] Tareas module: top-5, status sorting, link to `/tareas/[id]`, empty state copy.
- [ ] Reuniones module: top-3, action-item count plural/singular, link to `/reuniones/[id]`.
- [ ] Equipo module: avatars + names, owner labelled below, +N overflow.
- [ ] Wiki module: top-3, category chip, opens Notion in new tab.
- [ ] `+ Tarea` button opens the create modal with the project chip pre-filled.
- [ ] Mobile (≤640px): hero collapses, stats become 2×2, modules stack vertically.
- [ ] 404 path: visit `/proyectos/<bad-id>` → renders the app's `not-found` route.

- [ ] **Step 3: Final commit if any tweaks were made; otherwise nothing to commit.**

```bash
git status
```

---

## Self-Review (run by author)

**Spec coverage** ✅
- Hero with summary + status/priority pills + acciones → Task 7
- Meta row → Task 6
- Stats with adaptive count → Task 5
- Tasks/Meetings/Team/Wiki modules → Tasks 8/9/10/11
- New page route + loading → Task 13
- Card now opens in-app → Task 14
- Empty/404 states → covered in modules + page

**Placeholder scan** ✅
- No "TBD/TODO/implement later" anywhere.
- All test expectations match implementation outputs.
- All file paths are absolute or repo-relative.

**Type consistency** ✅
- `Project`, `Task`, `Meeting`, `WikiPage`, `TeamMember` are imported from existing schemas in `@/schemas/...`.
- `PROJECT_STATUS_STYLES` is the single source of truth for status colors after Task 1.
- Helper names (`fmt`, `mk`) are local to each test file — no cross-file collisions.

**No type drift between tasks**: `queryTasksByProject` returns `Task[]`, consumed as `Task[]` in `ProjectTasksModule`; same for meetings/wiki. ✅
