# Home: Active Projects Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Active projects" table section between the existing tasks list and the bottom grid on the home page. Each row shows icon, name + meta, status pill, progress bar, %, team avatars, and a hover arrow. Projects are treated as peers (no hero/featured row).

**Architecture:** Server-side query and shaping live in `lib/home/queries.ts` (extending `getHomeData`). A new presentational component `components/home/active-projects.tsx` renders the table with the same visual grammar as the rest of the home (Notion/Linear style). Member avatar resolution piggybacks on the existing `getTeamMembers` call in the page.

**Tech Stack:** Next.js 15 App Router (server components), TypeScript, Tailwind v4, Zod, Vitest, lucide-react. Reuses `AssigneeStack` from `components/kanban/card.tsx` and the project/status color map already encoded in `components/projects/project-card.tsx`.

---

## File Structure

**Files to create:**
- `components/home/active-projects.tsx` — section + table presentation. Pure server component. Receives shaped data + members map.
- `components/home/__tests__/active-projects.test.tsx` — render tests.
- `lib/home/__tests__/queries.test.ts` — already exists, will be extended with new cases.

**Files to modify:**
- `lib/home/queries.ts` — load projects, derive `openTaskCount`, `recentlyActive`, sort/filter, expose `activeProjects`.
- `app/(app)/page.tsx` — pull `activeProjects`, expand `memberIds` with project `teamIds`, render `<ActiveProjects />` between `<MyTasks />` and the bottom grid.
- `app/globals.css` — add the `home-pulse` keyframes (no Tailwind animation token exists for this yet).

**Files NOT touched:**
- `lib/notion/projects.ts` — already exposes `queryProjectsByCustomer`, no changes.
- `components/kanban/card.tsx` — `AssigneeStack` is reused as-is.
- `components/projects/project-card.tsx` — color map is duplicated by intent (see Task 4 rationale).

---

## Task 1: Extend `getHomeData` to load + shape active projects

**Files:**
- Modify: `lib/home/queries.ts`
- Test: `lib/home/__tests__/queries.test.ts`

This task adds projects to the home data layer. We sort by status priority (`In Progress` > `Planning` > `Paused`), then by completion descending, and cap at 6 rows. We exclude `Done`, `Canceled`, and `Backlog`. Each project is enriched with `openTaskCount` (derived from already-loaded tasks) and `recentlyActive` (v1 fallback: any non-Done/Archived task in the project).

- [ ] **Step 1: Write the failing tests**

Append to `lib/home/__tests__/queries.test.ts` (after the existing `describe('getHomeData', ...)` block, inside it). First, add the project mock and the `queryProjectsByCustomer` mock at the top:

Modify the top of the test file. After the existing `vi.mock(...)` lines, add:

```typescript
vi.mock('@/lib/notion/projects', () => ({ queryProjectsByCustomer: vi.fn() }));
```

After the `import { queryWikiByCustomer } from '@/lib/notion/wiki';` line, add:

```typescript
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import type { Project } from '@/schemas/project';
```

After the `mkMeeting` factory, add:

```typescript
const mkProject = (over: Partial<Project>): Project => ({
  id: 'p',
  name: '',
  icon: null,
  summary: null,
  status: 'In Progress',
  priority: null,
  completion: null,
  ownerIds: [],
  customerId: 'c',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p',
  ...over,
});
```

Update every existing test in the file that calls `getHomeData` — they all need a `vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([])` line before the call (otherwise the mock returns `undefined` and the test crashes). Add it inside each `it(...)` block, alongside the other `mockResolvedValueOnce([])` calls.

Then append these new tests inside the `describe('getHomeData', ...)` block:

```typescript
  it('returns active projects sorted by status then completion desc, capped at 6', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'a', name: 'A', status: 'Planning', completion: 0.9 }),
      mkProject({ id: 'b', name: 'B', status: 'In Progress', completion: 0.2 }),
      mkProject({ id: 'c', name: 'C', status: 'In Progress', completion: 0.8 }),
      mkProject({ id: 'd', name: 'D', status: 'Paused', completion: 0.5 }),
      mkProject({ id: 'e', name: 'E', status: 'In Progress', completion: 0.5 }),
      mkProject({ id: 'f', name: 'F', status: 'In Progress', completion: 0.1 }),
      mkProject({ id: 'g', name: 'G', status: 'In Progress', completion: 0.95 }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects.map((p) => p.id)).toEqual(['g', 'c', 'e', 'b', 'f', 'a']);
  });

  it('excludes Done, Canceled, Backlog from activeProjects', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'live', status: 'In Progress' }),
      mkProject({ id: 'done', status: 'Done' }),
      mkProject({ id: 'cancel', status: 'Canceled' }),
      mkProject({ id: 'backlog', status: 'Backlog' }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects.map((p) => p.id)).toEqual(['live']);
  });

  it('attaches openTaskCount and recentlyActive from tasks', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([
      mkTask({ id: 't1', projectId: 'p1', status: 'In Progress' }),
      mkTask({ id: 't2', projectId: 'p1', status: 'Not Started' }),
      mkTask({ id: 't3', projectId: 'p1', status: 'Done' }),
      mkTask({ id: 't4', projectId: 'p1', status: 'Archived' }),
      mkTask({ id: 't5', projectId: 'p2', status: 'Done' }),
    ]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce([
      mkProject({ id: 'p1', status: 'In Progress' }),
      mkProject({ id: 'p2', status: 'In Progress' }),
    ]);

    const data = await getHomeData('c', 'sprint-17');
    const p1 = data.activeProjects.find((p) => p.id === 'p1')!;
    const p2 = data.activeProjects.find((p) => p.id === 'p2')!;
    expect(p1.openTaskCount).toBe(2);
    expect(p1.recentlyActive).toBe(true);
    expect(p2.openTaskCount).toBe(0);
    expect(p2.recentlyActive).toBe(false);
  });

  it('caps activeProjects at 6', async () => {
    vi.mocked(queryTasksByCustomerAndSprint).mockResolvedValueOnce([]);
    vi.mocked(queryMeetingsByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByCustomer).mockResolvedValueOnce([]);
    vi.mocked(queryProjectsByCustomer).mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, i) =>
        mkProject({ id: `p${i}`, status: 'In Progress', completion: i / 10 }),
      ),
    );

    const data = await getHomeData('c', 'sprint-17');
    expect(data.activeProjects).toHaveLength(6);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- lib/home`
Expected: FAIL — new tests fail with `data.activeProjects is undefined` or similar.

- [ ] **Step 3: Implement the changes in `lib/home/queries.ts`**

Replace the entire contents of `lib/home/queries.ts` with:

```typescript
import { queryTasksByCustomerAndSprint } from '@/lib/notion/tasks';
import { queryMeetingsByCustomer } from '@/lib/notion/meetings';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import type { Project, ProjectStatus } from '@/schemas/project';
import type { Task } from '@/schemas/task';

export type HomeProject = Project & {
  openTaskCount: number;
  recentlyActive: boolean;
};

const ACTIVE_STATUS_ORDER: Partial<Record<ProjectStatus, number>> = {
  'In Progress': 0,
  Planning: 1,
  Paused: 2,
};

function isActiveStatus(s: ProjectStatus | null): s is ProjectStatus {
  return s !== null && s in ACTIVE_STATUS_ORDER;
}

function shapeActiveProjects(projects: Project[], tasks: Task[]): HomeProject[] {
  const tasksByProject = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.projectId) continue;
    const list = tasksByProject.get(t.projectId) ?? [];
    list.push(t);
    tasksByProject.set(t.projectId, list);
  }

  return projects
    .filter((p) => isActiveStatus(p.status))
    .map((p): HomeProject => {
      const projectTasks = tasksByProject.get(p.id) ?? [];
      const openTaskCount = projectTasks.filter(
        (t) => t.status !== 'Done' && t.status !== 'Archived',
      ).length;
      return { ...p, openTaskCount, recentlyActive: openTaskCount > 0 };
    })
    .sort((a, b) => {
      const sa = ACTIVE_STATUS_ORDER[a.status as ProjectStatus] ?? 99;
      const sb = ACTIVE_STATUS_ORDER[b.status as ProjectStatus] ?? 99;
      if (sa !== sb) return sa - sb;
      return (b.completion ?? 0) - (a.completion ?? 0);
    })
    .slice(0, 6);
}

export async function getHomeData(customerId: string, sprintId: string | null) {
  const [tasks, meetings, wiki, projects] = await Promise.all([
    queryTasksByCustomerAndSprint(customerId, sprintId),
    queryMeetingsByCustomer(customerId),
    queryWikiByCustomer(customerId),
    queryProjectsByCustomer(customerId),
  ]);

  // Spanish labels for UI, mapped from real Notion statuses:
  //   "En progreso"  = In Progress
  //   "Por hacer"    = Refining + Not Started (anything pending)
  //   "Completadas"  = Done   (Archived excluded from throughput)
  const stats = {
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    todo: tasks.filter((t) => t.status === 'Not Started' || t.status === 'Refining').length,
    done: tasks.filter((t) => t.status === 'Done').length,
    total: tasks.filter((t) => t.status !== 'Archived').length,
  };

  const now = Date.now();
  const upcomingMeeting =
    meetings
      .filter((m) => m.date && new Date(m.date).getTime() >= now)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0] ??
    meetings[0] ??
    null;

  const recentWiki = wiki.slice(0, 4);

  const todayStr = new Date().toDateString();
  const myTasksToday = tasks
    .filter((t) => {
      if (t.status === 'Done' || t.status === 'Archived') return false;
      if (!t.dueDate) return true;
      const d = new Date(t.dueDate);
      return d.toDateString() === todayStr || d.getTime() < Date.now();
    })
    .slice(0, 5);

  const activeProjects = shapeActiveProjects(projects, tasks);

  return { tasks, stats, upcomingMeeting, recentWiki, myTasksToday, activeProjects };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- lib/home`
Expected: PASS for all tests in `lib/home/__tests__/queries.test.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/home/queries.ts lib/home/__tests__/queries.test.ts
git commit -m "feat(home): load and shape active projects in getHomeData"
```

---

## Task 2: Add `home-pulse` keyframes to global CSS

**Files:**
- Modify: `app/globals.css`

The pulse animation on the project name needs a keyframe. We expose it as a Tailwind-friendly utility name (`animate-home-pulse`) so the component stays clean.

- [ ] **Step 1: Inspect existing globals.css**

Run: `grep -n "@keyframes\|@theme" app/globals.css | head -20`
Use this to find a clean spot near other animations.

- [ ] **Step 2: Append the pulse keyframes and utility**

Append at the end of `app/globals.css`:

```css
@keyframes home-pulse {
  0%, 100% { box-shadow: 0 0 0 3px rgba(63, 159, 92, 0.18); }
  50% { box-shadow: 0 0 0 5px rgba(63, 159, 92, 0.18); }
}

.animate-home-pulse {
  animation: home-pulse 2s ease-in-out infinite;
}
```

- [ ] **Step 3: Verify CSS still compiles**

Run: `npm run typecheck`
Expected: PASS (typecheck doesn't validate CSS but ensures nothing else broke).

Run: `npm run dev` briefly, open `http://localhost:3000/`, confirm the page still renders. Stop the dev server.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css
git commit -m "feat(home): add home-pulse keyframes for project activity indicator"
```

---

## Task 3: Create the `ActiveProjects` component (skeleton + empty state)

**Files:**
- Create: `components/home/active-projects.tsx`
- Create: `components/home/__tests__/active-projects.test.tsx`

We start with the empty state and the section header so we have a stable shell. Later tasks add the table rows and pulse indicator.

- [ ] **Step 1: Look at how existing home components are tested**

Run: `ls components/home/__tests__ 2>/dev/null || echo "no existing tests"`
Expected: likely `no existing tests`. We'll establish the pattern with `@testing-library/react`.

Run: `grep -l "@testing-library/react" components/**/*.test.tsx 2>/dev/null | head -3`
Use the first hit as a reference for setup.

- [ ] **Step 2: Write the failing test**

Create `components/home/__tests__/active-projects.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveProjects } from '../active-projects';
import type { HomeProject } from '@/lib/home/queries';

const mkProject = (over: Partial<HomeProject>): HomeProject => ({
  id: 'p',
  name: 'Test',
  icon: null,
  summary: null,
  status: 'In Progress',
  priority: null,
  completion: 0.5,
  ownerIds: [],
  customerId: 'c',
  teamIds: [],
  startDate: null,
  endDate: null,
  url: 'https://notion.so/p',
  openTaskCount: 0,
  recentlyActive: false,
  ...over,
});

describe('ActiveProjects', () => {
  it('renders empty state when no projects', () => {
    render(<ActiveProjects projects={[]} membersById={new Map()} />);
    expect(screen.getByText(/Sin proyectos activos/i)).toBeInTheDocument();
  });

  it('renders the section header with the count', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a' }), mkProject({ id: 'b' })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getByRole('heading', { name: /Proyectos activos/i })).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
  });

  it('renders project name and percentage', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', name: 'Mogos App v2', completion: 0.68 })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getByText('Mogos App v2')).toBeInTheDocument();
    expect(screen.getByText('68%')).toBeInTheDocument();
  });

  it('renders open task meta when openTaskCount > 0', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', openTaskCount: 14 })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getByText(/14 abiertas/)).toBeInTheDocument();
  });

  it('hides percentage cell when completion is null', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', name: 'Foo', completion: null })]}
        membersById={new Map()}
      />,
    );
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it('renders status pill text', () => {
    render(
      <ActiveProjects
        projects={[mkProject({ id: 'a', status: 'Planning' })]}
        membersById={new Map()}
      />,
    );
    expect(screen.getByText('Planning')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test:run -- components/home`
Expected: FAIL with module-not-found for `../active-projects`.

- [ ] **Step 4: Create the component**

Create `components/home/active-projects.tsx`:

```tsx
import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';
import type { HomeProject } from '@/lib/home/queries';
import { AssigneeStack } from '@/components/kanban/card';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<
  string,
  { pill: string; bar: string }
> = {
  'In Progress': {
    pill: 'bg-[#eff6ff] text-[#3a5fcc]',
    bar: 'bg-gradient-to-r from-[#3a5fcc] to-[#5e6ad2]',
  },
  Planning: {
    pill: 'bg-[#eeeffc] text-[#5e6ad2]',
    bar: 'bg-gradient-to-r from-[#5e6ad2] to-[#818bdb]',
  },
  Paused: {
    pill: 'bg-[#faf0db] text-[#c78a2c]',
    bar: 'bg-gradient-to-r from-[#c78a2c] to-[#d9a558]',
  },
};

function formatEndDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function buildMeta(p: HomeProject): string | null {
  const parts: string[] = [];
  if (p.openTaskCount > 0) {
    parts.push(`${p.openTaskCount} abierta${p.openTaskCount === 1 ? '' : 's'}`);
  }
  const end = formatEndDate(p.endDate);
  if (end) parts.push(`entrega ${end}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

type Props = {
  projects: HomeProject[];
  membersById: Map<string, TeamMember>;
};

export function ActiveProjects({ projects, membersById }: Props) {
  if (projects.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-semibold">Proyectos activos</h2>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin proyectos activos.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold">
          Proyectos activos <span className="text-[12px] font-normal text-muted-foreground">· {projects.length}</span>
        </h2>
        <Link href="/proyectos" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver todos →
        </Link>
      </div>

      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-2.5 bg-[#fbfbfc] border-b border-border text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium">
          <span />
          <span>Proyecto</span>
          <span>Estado</span>
          <span>Progreso</span>
          <span className="text-right">%</span>
          <span>Equipo</span>
          <span />
        </div>

        {projects.map((p, i) => {
          const styles = (p.status && STATUS_STYLES[p.status]) ?? STATUS_STYLES['In Progress']!;
          const pct = typeof p.completion === 'number' ? Math.round(p.completion * 100) : null;
          const meta = buildMeta(p);
          const assignees = p.teamIds
            .map((id) => membersById.get(id))
            .filter((m): m is TeamMember => !!m);

          return (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'group grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-3 hover:bg-[#f7f7f8] transition-colors',
                i < projects.length - 1 && 'border-b border-border',
              )}
            >
              <span className="w-[22px] h-[22px] rounded-md grid place-items-center text-[13px] bg-[#eeeffc] text-[#5e6ad2]">
                {p.icon ?? <FolderKanban className="w-3.5 h-3.5" />}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <span
                    aria-hidden
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      p.recentlyActive
                        ? 'bg-[#3f9f5c] animate-home-pulse'
                        : 'bg-[#a0a0a8] shadow-[0_0_0_3px_#f7f7f8]',
                    )}
                  />
                  <span className="truncate">{p.name}</span>
                </div>
                {meta && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta}</div>
                )}
              </div>

              <span
                className={cn(
                  'inline-block text-[11px] font-medium rounded-full px-2 py-[2px] w-fit',
                  styles.pill,
                )}
              >
                {p.status}
              </span>

              <div className="h-[5px] bg-[#f7f7f8] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', styles.bar)}
                  style={{ width: pct !== null ? `${pct}%` : '0%' }}
                />
              </div>

              <span className="text-right text-[12px] font-medium tabular-nums">
                {pct !== null ? `${pct}%` : ''}
              </span>

              <span>
                <AssigneeStack assignees={assignees} size={20} />
              </span>

              <span className="text-[14px] text-muted-foreground/60 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all text-right">
                →
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:run -- components/home`
Expected: PASS — all 6 tests pass.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/home/active-projects.tsx components/home/__tests__/active-projects.test.tsx
git commit -m "feat(home): add ActiveProjects table component"
```

---

## Task 4: Wire `ActiveProjects` into the home page

**Files:**
- Modify: `app/(app)/page.tsx`

We expand the `memberIds` collection to include project `teamIds` so avatars resolve, then render `<ActiveProjects />` between `<MyTasks />` and the bottom grid.

- [ ] **Step 1: Read current page**

Run: `cat app/\(app\)/page.tsx`
Confirm the order matches the spec (Greeting → StatsStrip → MyTasks → grid).

- [ ] **Step 2: Update `app/(app)/page.tsx`**

Replace the entire contents of `app/(app)/page.tsx` with:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { getHomeData } from '@/lib/home/queries';
import { getCurrentSprint } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { Greeting } from '@/components/home/greeting';
import { StatsStrip } from '@/components/home/stats-strip';
import { MyTasks } from '@/components/home/my-tasks';
import { NextMeeting } from '@/components/home/next-meeting';
import { WikiRecents } from '@/components/home/wiki-recents';
import { ActiveProjects } from '@/components/home/active-projects';
import type { Task } from '@/schemas/task';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await requireContext();
  const sprint = await getCurrentSprint();
  const data = await getHomeData(ctx.customerId, sprint?.id ?? null);

  const memberIds = Array.from(
    new Set([
      ...data.myTasksToday.flatMap((t: Task) => t.assigneeIds),
      ...data.activeProjects.flatMap((p) => p.teamIds),
    ]),
  );
  const members = await getTeamMembers(memberIds);
  const membersById = new Map(members.map((m) => [m.id, m]));

  const overdue = data.tasks.filter(
    (t: Task) =>
      t.status !== 'Done' &&
      t.status !== 'Archived' &&
      t.dueDate &&
      new Date(t.dueDate).getTime() < Date.now() &&
      new Date(t.dueDate).toDateString() !== new Date().toDateString(),
  ).length;

  const sprintLabel = sprint?.name ?? 'Sin sprint activo';

  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
          <Clock className="w-3 h-3" />
          {sprintLabel}
        </span>
      </Topbar>

      <div className="flex-1 overflow-auto px-10 py-10 max-w-[980px] mx-auto w-full">
        <Greeting name={ctx.memberName} stats={data.stats} upcomingMeeting={data.upcomingMeeting} />
        <StatsStrip stats={data.stats} upcomingMeeting={data.upcomingMeeting} overdueCount={overdue} />
        <MyTasks tasks={data.myTasksToday} membersById={membersById} />
        <ActiveProjects projects={data.activeProjects} membersById={membersById} />
        <div className="grid grid-cols-2 gap-5">
          <NextMeeting meeting={data.upcomingMeeting} />
          <WikiRecents pages={data.recentWiki} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run all home-adjacent tests**

Run: `npm run test:run -- lib/home components/home`
Expected: PASS — all tests pass.

- [ ] **Step 5: Visual verification in browser**

Run: `npm run dev`
Open `http://localhost:3000/`. Verify:
- Tasks list still renders.
- A new "Proyectos activos · N" section appears below tasks.
- Each row shows: emoji icon, name with green/gray pulse, meta line, status pill, progress bar, %, avatars, faint arrow on the right.
- Hover on a row darkens the background and the arrow brightens + slides right slightly.
- Click on a row opens the Notion project URL in a new tab.

Stop the dev server.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(home): render ActiveProjects below tasks on home page"
```

---

## Task 5: Lint + final polish pass

**Files:** none modified directly — this task verifies the integration.

- [ ] **Step 1: Run lint**

Run: `npm run lint`
Expected: no errors. Fix any warnings related to the new files.

- [ ] **Step 2: Run all tests**

Run: `npm run test:run`
Expected: PASS for the entire suite.

- [ ] **Step 3: Visual cold-run on the home**

Run: `npm run dev`. With at least one customer that has projects assigned, manually verify:
- (a) Customer with 0 active projects → empty state ("Sin proyectos activos.").
- (b) Customer with 1 active project → single row, no `border-b` artifact.
- (c) Customer with 7+ active projects → exactly 6 rendered, "Ver todos →" link goes to `/proyectos`.
- (d) Project with `completion = null` → no `%` shown, bar shows 0% width.
- (e) Project with `endDate = null` and `openTaskCount = 0` → no meta line under the name.
- (f) Project with status `Planning` → orange pill is NOT used (Planning uses primary color); bar is primary.
- (g) Pulse animates green on projects with open tasks; gray static on those without.

If any of these visually fails, stop and fix before committing.

- [ ] **Step 4: Final commit (if any tweaks happened)**

```bash
git status
# if there are changes:
git add -A
git commit -m "fix(home): polish ActiveProjects integration"
```

If nothing changed, skip the commit.

---

## Self-Review

**Spec coverage:**
- Section between MyTasks and bottom grid → Task 4.
- 7-column table (icon · name+meta · status · bar · % · team · arrow) → Task 3.
- Pulse indicator (green animated / gray static) → Tasks 2 + 3.
- Subtitle "N abiertas · entrega Mes Día" → Task 3 (`buildMeta`).
- Status pill colored by `project.status` (In Progress, Planning, Paused) → Task 3 (`STATUS_STYLES`).
- Bar color matches pill → Task 3.
- AssigneeStack reuse → Task 3.
- Hover reveals arrow + darkens row → Task 3 (group hover).
- Ordering In Progress → Planning → Paused, then completion desc → Task 1.
- Cap at 6, exclude Done/Canceled/Backlog → Task 1.
- Empty state ("Sin proyectos activos.") → Task 3.
- "Ver todos →" link to /proyectos → Task 3.
- `openTaskCount` and `recentlyActive` derived server-side → Task 1.

All spec sections covered. No gaps.

**Placeholder scan:** No TBD/TODO/"add validation" left in steps. Every step that changes code shows the code. No "similar to Task N" shortcuts.

**Type consistency:** `HomeProject` is exported from `lib/home/queries.ts` (Task 1) and imported in both Task 3 (component) and the test file. `ActiveProjects` props match across Task 3 component and Task 4 page wiring. `STATUS_STYLES` keys are project status strings already defined by the Zod enum in `schemas/project.ts`.

**Out-of-scope deferred (per spec):**
- Sticky header on overflow scroll.
- Right-click context menu.
- Filtering inside the home table (lives in `/proyectos`).
- "Real" recently-active calculation using last_edited_time.
