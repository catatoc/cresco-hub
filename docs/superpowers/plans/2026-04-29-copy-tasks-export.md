# Copy Tasks Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a clipboard-icon button to the Kanban toolbar that copies the currently visible tasks as JSON or Markdown to the clipboard, or downloads them as a `.json` file.

**Architecture:** 100% client-side. The serialization lives in pure functions under `lib/tasks/format-tasks.ts` (TDD-tested with snapshots). The UI lives in a new `<CopyTasksMenu>` component (shadcn `DropdownMenu` + ghost icon button + sonner toast feedback) mounted by `<KanbanView>` after `<ViewToggle>`. The menu reads `tasks` and `membersById` already in scope — no new endpoints, no new state.

**Tech Stack:** Next.js 15, TypeScript, shadcn/ui (`DropdownMenu`, `Tooltip`), `sonner` (toasts), `lucide-react` (icons), Vitest + jsdom + Testing Library.

**Spec:** `docs/superpowers/specs/2026-04-29-copy-tasks-export-design.md`

---

## File Structure

### Created

| Path | Responsibility |
|---|---|
| `lib/tasks/format-tasks.ts` | Pure serializers: `serializeTasksJson(tasks, membersById)` and `serializeTasksMarkdown(tasks, membersById)`. Defines `TaskExport` and `TasksExportPayload` types. No React. |
| `lib/tasks/__tests__/format-tasks.test.ts` | Vitest snapshot + behavior tests for both serializers, null-safety, and assignee resolution. |
| `components/kanban/copy-tasks-menu.tsx` | Client component: ghost icon button + dropdown with 3 actions, clipboard write with fallback, file download, post-action feedback (icon mutation + toast). |
| `components/kanban/__tests__/copy-tasks-menu.test.tsx` | Smoke test: disabled state, header count, "Como JSON" copies expected payload (mocked clipboard). |

### Modified

| Path | Change |
|---|---|
| `components/kanban/kanban-view.tsx` | Import and mount `<CopyTasksMenu tasks={tasks} membersById={membersById} sprintLabel={sprintLabel} />` in the right-side toolbar cluster, after `<ViewToggle>`. |

---

## Task 1: Pure JSON serializer (TDD)

Establishes the `lib/tasks/` directory, the `TaskExport` and `TasksExportPayload` types, and the `serializeTasksJson` function. Tests drive the field mapping.

**Files:**
- Create: `lib/tasks/format-tasks.ts`
- Create: `lib/tasks/__tests__/format-tasks.test.ts`

- [ ] **Step 1: Write failing test for empty list**

Create `lib/tasks/__tests__/format-tasks.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { serializeTasksJson } from '@/lib/tasks/format-tasks';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

const emptyMembers = new Map<string, TeamMember>();

describe('serializeTasksJson', () => {
  it('returns a payload with count 0 and empty tasks for an empty list', () => {
    const json = serializeTasksJson([], emptyMembers);
    const parsed = JSON.parse(json);

    expect(parsed.count).toBe(0);
    expect(parsed.tasks).toEqual([]);
    expect(typeof parsed.exportedAt).toBe('string');
    expect(() => new Date(parsed.exportedAt).toISOString()).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: FAIL — module `@/lib/tasks/format-tasks` not found.

- [ ] **Step 3: Create the file with minimal implementation**

Create `lib/tasks/format-tasks.ts`:

```ts
import type { Task, TaskStatus, TaskPriority, TaskType } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

export type TaskExport = {
  title: string;
  status: TaskStatus;
  priority: TaskPriority | null;
  type: TaskType | null;
  assignees: string[];
  tags: string[];
  dueDate: string | null;
  plannedDate: string | null;
  url: string;
};

export type TasksExportPayload = {
  exportedAt: string;
  count: number;
  tasks: TaskExport[];
};

export function serializeTasksJson(
  tasks: Task[],
  membersById: Map<string, TeamMember>,
): string {
  const payload: TasksExportPayload = {
    exportedAt: new Date().toISOString(),
    count: tasks.length,
    tasks: tasks.map((t) => taskToExport(t, membersById)),
  };
  return JSON.stringify(payload, null, 2);
}

function taskToExport(t: Task, membersById: Map<string, TeamMember>): TaskExport {
  return {
    title: t.title,
    status: t.status,
    priority: t.priority,
    type: t.type,
    assignees: t.assigneeIds.map((id) => membersById.get(id)?.name ?? 'Desconocido'),
    tags: t.tags,
    dueDate: t.dueDate,
    plannedDate: t.plannedDate,
    url: t.url,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: PASS — 1 test passed.

- [ ] **Step 5: Add tests for full task mapping and assignee resolution**

Append to `lib/tasks/__tests__/format-tasks.test.ts`:

```ts
const fullTask: Task = {
  id: 'task-1',
  title: 'Implementar copiar tareas',
  status: 'In Progress',
  priority: 'High',
  type: '🐛 Bug',
  assigneeIds: ['user-1', 'user-unknown'],
  projectId: 'proj-1',
  customerId: null,
  sprintId: 'sprint-1',
  dueDate: '2026-05-02',
  plannedDate: '2026-04-30',
  completedAt: null,
  tags: ['backend', 'urgent'],
  progress: 0.5,
  url: 'https://notion.so/abc123',
};

const minimalTask: Task = {
  id: 'task-2',
  title: 'Tarea minima',
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
  url: 'https://notion.so/min',
};

const membersWithDani = new Map<string, TeamMember>([
  ['user-1', { id: 'user-1', name: 'Dani', email: 'd@x', role: null, area: null, customerIds: [], projectIds: [] }],
]);

describe('serializeTasksJson — field mapping', () => {
  it('maps a full task to the 9-field shape and resolves assignee names', () => {
    const json = serializeTasksJson([fullTask], membersWithDani);
    const parsed = JSON.parse(json);

    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0]).toEqual({
      title: 'Implementar copiar tareas',
      status: 'In Progress',
      priority: 'High',
      type: '🐛 Bug',
      assignees: ['Dani', 'Desconocido'],
      tags: ['backend', 'urgent'],
      dueDate: '2026-05-02',
      plannedDate: '2026-04-30',
      url: 'https://notion.so/abc123',
    });
  });

  it('omits id/projectId/customerId/sprintId/progress/completedAt from payload', () => {
    const json = serializeTasksJson([fullTask], membersWithDani);
    const parsed = JSON.parse(json);
    const keys = Object.keys(parsed.tasks[0]).sort();

    expect(keys).toEqual(
      ['assignees', 'dueDate', 'plannedDate', 'priority', 'status', 'tags', 'title', 'type', 'url'].sort(),
    );
  });

  it('handles a minimal task with all nullables', () => {
    const json = serializeTasksJson([minimalTask], new Map());
    const parsed = JSON.parse(json);

    expect(parsed.tasks[0]).toEqual({
      title: 'Tarea minima',
      status: 'Not Started',
      priority: null,
      type: null,
      assignees: [],
      tags: [],
      dueDate: null,
      plannedDate: null,
      url: 'https://notion.so/min',
    });
  });

  it('preserves task order', () => {
    const json = serializeTasksJson([minimalTask, fullTask], membersWithDani);
    const parsed = JSON.parse(json);

    expect(parsed.tasks.map((t: { title: string }) => t.title)).toEqual([
      'Tarea minima',
      'Implementar copiar tareas',
    ]);
  });
});
```

- [ ] **Step 6: Run all tests to confirm they pass**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 7: Commit**

```bash
git add lib/tasks/format-tasks.ts lib/tasks/__tests__/format-tasks.test.ts
git commit -m "$(cat <<'EOF'
feat(copy-tasks): JSON serializer + types for visible-tasks export

Pure serializeTasksJson() that maps Task[] to a 9-field TaskExport
shape, resolves assigneeIds to member names (falling back to
"Desconocido"), and wraps the result in an exportedAt/count/tasks
payload. Drops id/projectId/customerId/sprintId/progress/completedAt
since they are noise for downstream destinations like Linear.
EOF
)"
```

---

## Task 2: Markdown serializer (TDD)

Adds `serializeTasksMarkdown` to the same file. Format: header line + one item per task with metadata inline, indented continuation lines for assignees/tags and URL. Date format: `D mes` in Spanish (e.g. `2 may`).

**Files:**
- Modify: `lib/tasks/format-tasks.ts`
- Modify: `lib/tasks/__tests__/format-tasks.test.ts`

- [ ] **Step 1: Write failing test for the header**

Append to `lib/tasks/__tests__/format-tasks.test.ts`:

```ts
import { serializeTasksMarkdown } from '@/lib/tasks/format-tasks';

describe('serializeTasksMarkdown — header', () => {
  it('starts with a header line containing the count and a date', () => {
    const md = serializeTasksMarkdown([fullTask], membersWithDani);
    const firstLine = md.split('\n')[0];

    expect(firstLine).toMatch(/^# 1 tareas \(exportadas \d{4}-\d{2}-\d{2}\)$/);
  });

  it('uses plural correctly for empty/many', () => {
    const empty = serializeTasksMarkdown([], new Map());
    expect(empty.split('\n')[0]).toMatch(/^# 0 tareas /);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: FAIL — `serializeTasksMarkdown is not exported`.

- [ ] **Step 3: Implement minimal serializeTasksMarkdown**

Append to `lib/tasks/format-tasks.ts`:

```ts
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDateEs(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getUTCDate()} ${MONTHS_ES[d.getUTCMonth()]}`;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function serializeTasksMarkdown(
  tasks: Task[],
  membersById: Map<string, TeamMember>,
): string {
  const header = `# ${tasks.length} tareas (exportadas ${todayIsoDate()})`;
  if (tasks.length === 0) return header + '\n';

  const items = tasks.map((t) => formatTaskMarkdown(t, membersById));
  return [header, '', ...items].join('\n');
}

function formatTaskMarkdown(t: Task, membersById: Map<string, TeamMember>): string {
  const meta1: string[] = [];
  if (t.type) meta1.push(t.type);
  if (t.priority) meta1.push(t.priority);
  const due = formatDateEs(t.dueDate);
  if (due) meta1.push(`Due ${due}`);

  const line1Suffix = meta1.length > 0 ? ` · ${meta1.join(' · ')}` : '';
  const line1 = `- [ ] **${t.title}**${line1Suffix}`;

  const assignees = t.assigneeIds.map((id) => membersById.get(id)?.name ?? 'Desconocido');
  const meta2Parts: string[] = [];
  if (assignees.length > 0) meta2Parts.push(`Asignados: ${assignees.join(', ')}`);
  if (t.tags.length > 0) meta2Parts.push(`Tags: ${t.tags.join(', ')}`);
  const line2 = meta2Parts.length > 0 ? `      ${meta2Parts.join(' · ')}` : null;

  const line3 = `      ${t.url}`;

  return [line1, line2, line3].filter(Boolean).join('\n') + '\n';
}
```

- [ ] **Step 4: Run header tests**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: PASS — header tests + previous JSON tests all pass.

- [ ] **Step 5: Add full markdown body tests**

Append to `lib/tasks/__tests__/format-tasks.test.ts`:

```ts
describe('serializeTasksMarkdown — task body', () => {
  it('renders a full task with all metadata inline and indented continuation lines', () => {
    const md = serializeTasksMarkdown([fullTask], membersWithDani);

    expect(md).toContain('- [ ] **Implementar copiar tareas** · 🐛 Bug · High · Due 2 may');
    expect(md).toContain('      Asignados: Dani, Desconocido · Tags: backend, urgent');
    expect(md).toContain('      https://notion.so/abc123');
  });

  it('omits empty metadata segments without leaving stray separators', () => {
    const md = serializeTasksMarkdown([minimalTask], new Map());

    expect(md).toContain('- [ ] **Tarea minima**');
    expect(md).not.toContain(' · null');
    expect(md).not.toContain('Asignados:');
    expect(md).not.toContain('Tags:');
    expect(md).toContain('      https://notion.so/min');
  });

  it('drops the assignees/tags continuation line entirely when both are empty', () => {
    const md = serializeTasksMarkdown([minimalTask], new Map());
    const lines = md.trim().split('\n');

    // header, blank, line1 (- [ ] ...), line3 (url)
    expect(lines).toHaveLength(4);
    expect(lines[2]).toMatch(/^- \[ \] /);
    expect(lines[3].trim()).toBe('https://notion.so/min');
  });

  it('formats Spanish dates as "D mes"', () => {
    const t: Task = { ...minimalTask, dueDate: '2026-11-15' };
    const md = serializeTasksMarkdown([t], new Map());
    expect(md).toContain('Due 15 nov');
  });

  it('omits Due segment when dueDate is unparseable', () => {
    const t: Task = { ...minimalTask, dueDate: 'not-a-date' };
    const md = serializeTasksMarkdown([t], new Map());
    expect(md).not.toContain('Due ');
  });

  it('preserves task order', () => {
    const md = serializeTasksMarkdown([minimalTask, fullTask], membersWithDani);
    const idxMin = md.indexOf('Tarea minima');
    const idxFull = md.indexOf('Implementar copiar tareas');
    expect(idxMin).toBeGreaterThan(-1);
    expect(idxFull).toBeGreaterThan(idxMin);
  });
});
```

- [ ] **Step 6: Run all format tests**

Run: `npx vitest run lib/tasks/__tests__/format-tasks.test.ts`
Expected: PASS — all JSON + Markdown tests pass.

- [ ] **Step 7: Commit**

```bash
git add lib/tasks/format-tasks.ts lib/tasks/__tests__/format-tasks.test.ts
git commit -m "$(cat <<'EOF'
feat(copy-tasks): Markdown serializer with Spanish date formatting

serializeTasksMarkdown() emits a checklist with a count header, then
one item per task: title + inline metadata (type, priority, "Due D
mes"), an indented assignees/tags continuation line (omitted when
both empty), and the task URL. Resolves assignee IDs the same way as
the JSON serializer.
EOF
)"
```

---

## Task 3: `<CopyTasksMenu>` component

Builds the icon-ghost button + shadcn `DropdownMenu` with three actions: copy as JSON, copy as Markdown, download `.json`. Includes clipboard fallback, post-action feedback (icon mutation to `Check` for 1.5s + toast), disabled state when 0 tasks, and tooltip.

**Files:**
- Create: `components/kanban/copy-tasks-menu.tsx`
- Create: `components/kanban/__tests__/copy-tasks-menu.test.tsx`

- [ ] **Step 1: Write a failing smoke test for the disabled state**

Create `components/kanban/__tests__/copy-tasks-menu.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyTasksMenu } from '@/components/kanban/copy-tasks-menu';
import type { TeamMember } from '@/schemas/team-member';

const emptyMembers = new Map<string, TeamMember>();

describe('<CopyTasksMenu />', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders disabled when there are no tasks', () => {
    render(<CopyTasksMenu tasks={[]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    const trigger = screen.getByRole('button', { name: /copiar tareas/i });
    expect(trigger).toBeDisabled();
  });
});
```

Verify `@testing-library/user-event` and `@testing-library/react` exist:

Run: `node -e "require('@testing-library/user-event'); require('@testing-library/react')"`
Expected: no output (success). If it errors with "Cannot find module", install via `npm install -D @testing-library/user-event @testing-library/react` and re-run; commit `package.json` changes alongside the test in Step 9.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/kanban/__tests__/copy-tasks-menu.test.tsx`
Expected: FAIL — module `@/components/kanban/copy-tasks-menu` not found.

- [ ] **Step 3: Create the component skeleton**

Create `components/kanban/copy-tasks-menu.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Clipboard, Check, FileJson, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { serializeTasksJson, serializeTasksMarkdown } from '@/lib/tasks/format-tasks';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  sprintLabel: string;
};

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function sprintSlug(label: string): string {
  const m = label.match(/#(\d+)/);
  if (m) return `sprint-${m[1]}`;
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tareas';
}

function downloadJsonFile(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CopyTasksMenu({ tasks, membersById, sprintLabel }: Props) {
  const [justCopied, setJustCopied] = useState(false);
  const count = tasks.length;
  const disabled = count === 0;

  function flashCheck() {
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1500);
  }

  async function handleCopyJson() {
    const json = serializeTasksJson(tasks, membersById);
    const ok = await writeToClipboard(json);
    if (ok) {
      flashCheck();
      toast.success(`${count} tareas copiadas como JSON`);
    } else {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  async function handleCopyMarkdown() {
    const md = serializeTasksMarkdown(tasks, membersById);
    const ok = await writeToClipboard(md);
    if (ok) {
      flashCheck();
      toast.success(`${count} tareas copiadas como Markdown`);
    } else {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  function handleDownload() {
    const json = serializeTasksJson(tasks, membersById);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `tareas-${sprintSlug(sprintLabel)}-${today}.json`;
    downloadJsonFile(json, filename);
    toast.success(`${count} tareas descargadas`);
  }

  const tooltipText = disabled ? 'No hay tareas para copiar' : 'Copiar tareas visibles';

  return (
    <TooltipProvider delayDuration={200}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Copiar tareas visibles"
                disabled={disabled}
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e5e7eb] bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors',
                  disabled && 'opacity-50 cursor-not-allowed hover:text-gray-500 hover:bg-white',
                )}
              >
                {justCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clipboard className="w-3.5 h-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{tooltipText}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-[230px]">
          <DropdownMenuLabel className="text-[11px] font-normal text-gray-500">
            Copiar {count} tareas visibles
          </DropdownMenuLabel>
          <DropdownMenuItem onSelect={handleCopyJson} className="flex items-center gap-2">
            <FileJson className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">Como JSON</span>
            <span className="ml-auto text-[11px] text-gray-400">para MCP</span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleCopyMarkdown} className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">Como Markdown</span>
            <span className="ml-auto text-[11px] text-gray-400">para Linear</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={handleDownload} className="flex items-center gap-2">
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span className="font-medium">Descargar .json</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
```

- [ ] **Step 4: Run smoke test**

Run: `npx vitest run components/kanban/__tests__/copy-tasks-menu.test.tsx`
Expected: PASS — disabled state test passes.

- [ ] **Step 5: Add the count + clipboard tests**

Append to `components/kanban/__tests__/copy-tasks-menu.test.tsx`:

```tsx
import type { Task } from '@/schemas/task';

const t1: Task = {
  id: 't1',
  title: 'Tarea 1',
  status: 'In Progress',
  priority: 'High',
  type: '✅ Task',
  assigneeIds: [],
  projectId: null,
  customerId: null,
  sprintId: null,
  dueDate: null,
  plannedDate: null,
  completedAt: null,
  tags: [],
  progress: null,
  url: 'https://notion.so/t1',
};

describe('<CopyTasksMenu /> — interactions', () => {
  it('shows the visible-task count in the dropdown header', async () => {
    const user = userEvent.setup();
    render(<CopyTasksMenu tasks={[t1, { ...t1, id: 't2' }]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    await user.click(screen.getByRole('button', { name: /copiar tareas/i }));
    expect(await screen.findByText(/Copiar 2 tareas visibles/)).toBeInTheDocument();
  });

  it('writes JSON to the clipboard when "Como JSON" is selected', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const user = userEvent.setup();
    render(<CopyTasksMenu tasks={[t1]} membersById={emptyMembers} sprintLabel="Sprint #142" />);
    await user.click(screen.getByRole('button', { name: /copiar tareas/i }));
    await user.click(await screen.findByText('Como JSON'));

    expect(writeText).toHaveBeenCalledTimes(1);
    const arg = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(arg);
    expect(parsed.count).toBe(1);
    expect(parsed.tasks[0].title).toBe('Tarea 1');
  });
});
```

- [ ] **Step 6: Run interaction tests**

Run: `npx vitest run components/kanban/__tests__/copy-tasks-menu.test.tsx`
Expected: PASS — all 3 tests pass.

- [ ] **Step 7: Manual smoke check (skip if no dev server running)**

If `npm run dev` is already running, navigate to `/tareas`, confirm the new clipboard icon appears in the toolbar after the view-toggle. (It will not be wired yet — Task 4 wires it. Skip if not running.)

- [ ] **Step 8: Commit**

```bash
git add components/kanban/copy-tasks-menu.tsx components/kanban/__tests__/copy-tasks-menu.test.tsx
# If package.json was updated in Step 1 because deps were missing:
# git add package.json package-lock.json

git commit -m "$(cat <<'EOF'
feat(copy-tasks): CopyTasksMenu component (button + dropdown)

Ghost icon button (clipboard, 28x28) with shadcn DropdownMenu offering
three actions: Copy as JSON, Copy as Markdown, Download .json. Uses
navigator.clipboard with a textarea fallback, mutates the icon to a
green check for 1.5s on success, and surfaces sonner toasts. Disabled
when there are no tasks visible. Filename for download is
"tareas-<sprint-slug>-<YYYY-MM-DD>.json".
EOF
)"
```

---

## Task 4: Wire `<CopyTasksMenu>` into `<KanbanView>`

Mounts the menu in the toolbar after `<ViewToggle>`. No new state, no logic — just imports and JSX.

**Files:**
- Modify: `components/kanban/kanban-view.tsx`

- [ ] **Step 1: Read the current toolbar**

Read `components/kanban/kanban-view.tsx` lines 40–51 to confirm the toolbar structure matches the spec (`<SprintNav>` + `<ViewToggle>` inside `flex items-center gap-2.5 ml-auto shrink-0`).

- [ ] **Step 2: Add the import**

Edit `components/kanban/kanban-view.tsx` — after the existing `import { SprintNav } from './sprint-nav';` line, add:

```tsx
import { CopyTasksMenu } from './copy-tasks-menu';
```

- [ ] **Step 3: Mount the menu after `<ViewToggle>`**

Edit `components/kanban/kanban-view.tsx` — locate the right cluster:

```tsx
<div className="flex items-center gap-2.5 ml-auto shrink-0">
  <SprintNav currentSprintId={currentSprintId} allSprintIds={allSprintIds} />
  <ViewToggle view={view} onChange={setView} />
</div>
```

Change to:

```tsx
<div className="flex items-center gap-2.5 ml-auto shrink-0">
  <SprintNav currentSprintId={currentSprintId} allSprintIds={allSprintIds} />
  <ViewToggle view={view} onChange={setView} />
  <CopyTasksMenu tasks={tasks} membersById={membersById} sprintLabel={sprintLabel} />
</div>
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: PASS — all existing tests + the new ones (8 in `format-tasks.test.ts`, 3 in `copy-tasks-menu.test.tsx`).

- [ ] **Step 6: Manual UI check**

Run: `npm run dev` (if not already running) and navigate to `/tareas`.

Verify in the browser:
- Clipboard icon appears at the right end of the toolbar.
- Hovering shows tooltip "Copiar tareas visibles".
- Clicking opens the dropdown with header showing the visible-task count.
- "Como JSON" copies; pasting into a text editor shows the JSON payload with `exportedAt`, `count`, and `tasks[]`.
- "Como Markdown" copies; pasting shows the `# N tareas` header followed by checklist items.
- "Descargar .json" triggers a file download named `tareas-<sprint>-<date>.json`.
- After copying, the icon flashes a green check for ~1.5s and a toast appears.
- Switching between Classic / Week views still shows the button; the count updates with filters/views.

If anything is off, fix and re-test before committing.

- [ ] **Step 7: Commit**

```bash
git add components/kanban/kanban-view.tsx
git commit -m "$(cat <<'EOF'
feat(copy-tasks): mount CopyTasksMenu in Kanban toolbar

Wires the new button into the toolbar after ViewToggle, passing the
current visible tasks, the membersById lookup map, and the sprintLabel
used to name the downloadable file.
EOF
)"
```

---

## Task 5: Final verification

Last sanity sweep before declaring done.

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all tests pass, no regressions.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: no new warnings or errors.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Confirm git log shows 4 focused commits**

Run: `git log --oneline -n 4`
Expected: 4 commits — JSON serializer, Markdown serializer, CopyTasksMenu component, KanbanView wiring.

---

## Success Criteria (mirrors spec § 9)

- [ ] Button visible in Kanban toolbar across all 3 views (classic / week / by-person).
- [ ] Dropdown header count matches visible tasks after filters.
- [ ] "Como JSON" copies a parseable payload (verified by `JSON.parse` round-trip in tests).
- [ ] "Como Markdown" copies readable checklist text.
- [ ] "Descargar .json" produces a file with `tareas-<sprint>-<date>.json` naming.
- [ ] Check-icon + toast confirm each successful action.
- [ ] All formatter unit tests pass; component smoke tests pass.
- [ ] Zero backend / Prisma / endpoint changes.
