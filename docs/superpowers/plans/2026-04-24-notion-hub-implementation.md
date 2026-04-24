# Notion Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Linear-styled web hub (Next.js 15) that exposes a Notion workspace to non-Notion users, filtered per client, with a weekly Kanban (editable) and read-only Meetings/Wiki/Projects.

**Architecture:** Next.js 15 App Router with Server Components + Route Handlers. Supabase provides auth (magic link + Google). Notion API calls are server-only (key never ships to client). Email→Client mapping resolved at request time by querying Notion's Team database. TanStack Query + optimistic updates for the Kanban drag & drop. Single shared workspace of Notion databases configured via env vars in v1.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind v4, shadcn/ui, @notionhq/client, @supabase/ssr + @supabase/supabase-js, @dnd-kit/core + @dnd-kit/sortable, @tanstack/react-query, zod, date-fns, sonner (toasts), vitest + @testing-library/react for tests, lucide-react icons.

**Reference mockups:** HTML mockups live in `.superpowers/brainstorm/93167-1777035729/content/` — use them as the visual source of truth. The design tokens are documented in the spec (Section 10).

**Spec:** `docs/superpowers/specs/2026-04-24-notion-hub-design.md`

---

## Phase 0 — Project Foundation

### Task 0.1: Initialize Next.js 15 app in place

**Files:**
- Modify: `/Users/carloscarrasquero/Documents/github/notion-hub/` (already has docs/ and .gitignore)

- [ ] **Step 1: Scaffold Next.js in the existing directory**

The directory already has `docs/` and `.gitignore`. Run the Next.js scaffold into a temp folder then move files over to preserve git history.

```bash
cd /Users/carloscarrasquero/Documents/github/notion-hub
npx create-next-app@latest _scaffold --typescript --tailwind --app --src-dir=false --import-alias="@/*" --no-eslint --use-npm --turbopack
cp -r _scaffold/{app,public,next.config.ts,tsconfig.json,package.json,package-lock.json,postcss.config.mjs,next-env.d.ts} .
cp _scaffold/.gitignore .gitignore.new && cat .gitignore .gitignore.new | sort -u > .gitignore.merged && mv .gitignore.merged .gitignore && rm .gitignore.new
rm -rf _scaffold
```

- [ ] **Step 2: Verify install and dev server**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, Next.js welcome page renders.

Kill with Ctrl+C once verified.

- [ ] **Step 3: Enable strict TypeScript**

Edit `tsconfig.json` — confirm `"strict": true` and add:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true
  }
}
```

- [ ] **Step 4: Commit foundation**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 app with TS strict"
```

---

### Task 0.2: Install core dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm i @notionhq/client @supabase/ssr @supabase/supabase-js @tanstack/react-query @tanstack/react-query-devtools @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zod date-fns sonner lucide-react class-variance-authority clsx tailwind-merge
```

- [ ] **Step 2: Install dev deps**

```bash
npm i -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add runtime and dev dependencies"
```

---

### Task 0.3: Configure shadcn/ui

**Files:**
- Create: `components.json`, `lib/utils.ts`, `components/ui/*` (via CLI)

- [ ] **Step 1: Init shadcn/ui**

```bash
npx shadcn@latest init -y --base-color neutral
```

When prompted, confirm: TypeScript, CSS variables, `components/ui` path, `app/globals.css`.

- [ ] **Step 2: Install the components we need**

```bash
npx shadcn@latest add button input label sheet dialog tabs badge avatar skeleton tooltip sonner command dropdown-menu separator
```

- [ ] **Step 3: Verify imports work**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add shadcn/ui with base components"
```

---

### Task 0.4: Add design tokens to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace the `:root` block with Linear-style tokens**

Open `app/globals.css`. Find the `:root` block in `@layer base` and replace its contents with:

```css
:root {
  --background: 0 0% 98%;        /* #fafafa */
  --foreground: 240 4% 5%;       /* #0f0f10 */
  --panel: 0 0% 100%;            /* #ffffff */
  --sidebar: 240 5% 97%;         /* #f7f7f8 */
  --border: 240 5% 93%;          /* #ececee */
  --border-strong: 240 5% 89%;   /* #e1e1e4 */
  --muted: 240 5% 97%;           /* sidebar */
  --muted-foreground: 240 3% 39%;/* #57575c */
  --text-soft: 240 3% 39%;
  --text-muted: 240 3% 55%;      /* #8a8a91 */
  --primary: 231 54% 60%;        /* Linear purple #5e6ad2 */
  --primary-foreground: 0 0% 100%;
  --primary-soft: 232 80% 96%;   /* #eeeffc */
  --accent: 231 54% 60%;
  --accent-foreground: 0 0% 100%;
  --destructive: 0 59% 55%;      /* #d24949 */
  --destructive-foreground: 0 0% 100%;
  --success: 137 44% 44%;        /* #3f9f5c */
  --warning: 34 64% 48%;         /* #c78a2c */
  --ring: 231 54% 60%;
  --radius: 0.375rem;            /* 6px */
  --card: 0 0% 100%;
  --card-foreground: 240 4% 5%;
  --popover: 0 0% 100%;
  --popover-foreground: 240 4% 5%;
  --secondary: 240 5% 96%;
  --secondary-foreground: 240 4% 5%;
  --input: 240 5% 89%;
}
```

- [ ] **Step 2: Add Inter font + feature settings**

Edit `app/layout.tsx` — replace `Geist` with `Inter`:

```tsx
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body className="antialiased" style={{ fontFeatureSettings: "'cv11', 'ss01', 'ss03'" }}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Update metadata**

In the same file above `export default`:

```tsx
export const metadata = {
  title: 'Hub',
  description: 'Tu proyecto. Sin abrir Notion.',
};
```

- [ ] **Step 4: Visual verify**

```bash
npm run dev
```

Open http://localhost:3000 — confirm Inter font rendering, neutral background. Kill server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(ui): apply Linear-style design tokens and Inter font"
```

---

### Task 0.5: Create env template and directory scaffold

**Files:**
- Create: `.env.example`, `lib/env.ts`, `lib/notion/`, `lib/supabase/`, `lib/auth/`, `schemas/`, `hooks/`, `components/kanban/`, `components/wiki/`, `components/shell/`

- [ ] **Step 1: Create .env.example**

```bash
cat > .env.example << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Notion
NOTION_API_KEY=
NOTION_DB_TEAM=
NOTION_DB_CLIENTS=
NOTION_DB_PROJECTS=
NOTION_DB_TASKS=
NOTION_DB_MEETINGS=
# Wiki: comma-separated page IDs that serve as roots per client, OR infer from Client relation on pages
NOTION_DB_WIKI=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

- [ ] **Step 2: Copy to .env.local (local dev)**

```bash
cp .env.example .env.local
```

The user will fill in the actual values manually. Do not commit `.env.local`.

- [ ] **Step 3: Ensure .env.local is gitignored**

```bash
grep -q "^.env.local$" .gitignore || echo ".env.local" >> .gitignore
grep -q "^.env$" .gitignore || echo ".env" >> .gitignore
```

- [ ] **Step 4: Create typed env loader with Zod**

Create `lib/env.ts`:

```ts
import { z } from 'zod';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NOTION_API_KEY: z.string().startsWith('ntn_'),
  NOTION_DB_TEAM: z.string().min(10),
  NOTION_DB_CLIENTS: z.string().min(10),
  NOTION_DB_PROJECTS: z.string().min(10),
  NOTION_DB_TASKS: z.string().min(10),
  NOTION_DB_MEETINGS: z.string().min(10),
  NOTION_DB_WIKI: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.string().url(),
});

const publicEnvSchema = serverEnvSchema.pick({
  NEXT_PUBLIC_SUPABASE_URL: true,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: true,
  NEXT_PUBLIC_APP_URL: true,
});

export const serverEnv = serverEnvSchema.parse(process.env);
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});
```

> **Note:** `serverEnv` MUST only be imported in server code. Importing it into a client component will throw at build time because the service role key is absent in the client environment.

- [ ] **Step 5: Create directory placeholders**

```bash
mkdir -p lib/notion lib/supabase lib/auth schemas hooks components/kanban components/wiki components/shell components/home components/meetings components/projects
touch lib/notion/.gitkeep lib/supabase/.gitkeep lib/auth/.gitkeep schemas/.gitkeep hooks/.gitkeep
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold folder structure and env loader"
```

---

### Task 0.6: Configure Vitest

**Files:**
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json`

- [ ] **Step 1: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

- [ ] **Step 2: Create setup file**

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add scripts**

Edit `package.json` — in `"scripts"`, add:

```json
"test": "vitest",
"test:run": "vitest run",
"typecheck": "tsc --noEmit"
```

- [ ] **Step 4: Smoke test**

Create `lib/__tests__/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('adds numbers', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
npm run test:run
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure vitest with jsdom and RTL"
```

---

## Phase 1 — Notion Service Layer (TDD)

### Task 1.1: Notion client singleton

**Files:**
- Create: `lib/notion/client.ts`

- [ ] **Step 1: Write the client**

Create `lib/notion/client.ts`:

```ts
import { Client } from '@notionhq/client';
import { serverEnv } from '@/lib/env';

let _client: Client | null = null;

export function getNotion(): Client {
  if (!_client) {
    _client = new Client({ auth: serverEnv.NOTION_API_KEY });
  }
  return _client;
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/notion/client.ts
git commit -m "feat(notion): add SDK singleton"
```

---

### Task 1.2: Zod schemas for Notion entities

**Files:**
- Create: `schemas/notion-common.ts`, `schemas/task.ts`, `schemas/meeting.ts`, `schemas/project.ts`, `schemas/team-member.ts`, `schemas/wiki.ts`

- [ ] **Step 1: Shared helpers**

Create `schemas/notion-common.ts`:

```ts
import { z } from 'zod';

export const notionIdSchema = z.string().min(10);

export const richTextToPlain = (rich: Array<{ plain_text: string }> | undefined) =>
  rich?.map((r) => r.plain_text).join('') ?? '';

export const titleSchema = z.array(z.object({ plain_text: z.string() })).transform(richTextToPlain);

export const selectSchema = z.object({ name: z.string() }).nullable();
export const multiSelectSchema = z.array(z.object({ name: z.string(), color: z.string().optional() }));
export const relationSchema = z.array(z.object({ id: z.string() }));
export const dateSchema = z.object({ start: z.string(), end: z.string().nullable() }).nullable();
export const emailSchema = z.string().nullable();
```

- [ ] **Step 2: Team member schema**

Create `schemas/team-member.ts`:

```ts
import { z } from 'zod';

export const teamMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  clientId: z.string().nullable(),
  projectIds: z.array(z.string()),
  role: z.string().nullable(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
```

- [ ] **Step 3: Task schema**

Create `schemas/task.ts`:

```ts
import { z } from 'zod';

export const taskStatusSchema = z.enum(['Backlog', 'Por hacer', 'En progreso', 'Hecho']);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const taskPrioritySchema = z.enum(['Baja', 'Media', 'Alta', 'Urgente']);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const taskSchema = z.object({
  id: z.string(),
  number: z.string().nullable(),             // e.g., "FK-142" if you have a formula in Notion
  title: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema.nullable(),
  assigneeIds: z.array(z.string()),
  projectId: z.string().nullable(),
  clientId: z.string().nullable(),
  cycle: z.string().nullable(),              // ISO week "2026-W17"
  dueDate: z.string().nullable(),            // YYYY-MM-DD
  labels: z.array(z.string()),
  url: z.string().url(),
});

export type Task = z.infer<typeof taskSchema>;
```

- [ ] **Step 4: Meeting / Project / Wiki schemas**

Create `schemas/meeting.ts`:

```ts
import { z } from 'zod';

export const meetingSchema = z.object({
  id: z.string(),
  title: z.string(),
  date: z.string().nullable(),               // ISO date
  endDate: z.string().nullable(),
  meetUrl: z.string().nullable(),
  recurrence: z.string().nullable(),
  facilitatorId: z.string().nullable(),
  attendeeIds: z.array(z.string()),
  clientId: z.string().nullable(),
  actionItemIds: z.array(z.string()),        // relation to tasks
  url: z.string().url(),
});

export type Meeting = z.infer<typeof meetingSchema>;
```

Create `schemas/project.ts`:

```ts
import { z } from 'zod';

export const projectStatusSchema = z.enum(['Planning', 'On track', 'At risk', 'Blocked', 'Done']);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),               // emoji
  description: z.string().nullable(),
  status: projectStatusSchema.nullable(),
  progress: z.number().min(0).max(100).nullable(),
  clientId: z.string().nullable(),
  teamIds: z.array(z.string()),
  deadline: z.string().nullable(),
  url: z.string().url(),
});

export type Project = z.infer<typeof projectSchema>;
```

Create `schemas/wiki.ts`:

```ts
import { z } from 'zod';

export const wikiPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  cover: z.string().nullable(),
  parentId: z.string().nullable(),
  clientId: z.string().nullable(),
  ownerId: z.string().nullable(),
  tags: z.array(z.string()),
  lastEditedAt: z.string(),
  url: z.string().url(),
});

export type WikiPage = z.infer<typeof wikiPageSchema>;
```

- [ ] **Step 5: Typecheck**

```bash
npm run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add schemas/
git commit -m "feat(schemas): add Zod schemas for Notion entities"
```

---

### Task 1.3: TDD — findMemberByEmail

**Files:**
- Create: `lib/notion/team.ts`, `lib/notion/__tests__/team.test.ts`

- [ ] **Step 1: Write failing test**

Create `lib/notion/__tests__/team.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findMemberByEmail } from '../team';

vi.mock('@/lib/notion/client', () => ({
  getNotion: () => mockNotion,
}));
vi.mock('@/lib/env', () => ({
  serverEnv: { NOTION_DB_TEAM: 'team-db-id' },
}));

const mockNotion = {
  databases: { query: vi.fn() },
};

describe('findMemberByEmail', () => {
  beforeEach(() => {
    mockNotion.databases.query.mockReset();
  });

  it('returns the member when email matches', async () => {
    mockNotion.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: 'member-1',
          properties: {
            Name: { title: [{ plain_text: 'Daniela' }] },
            Email: { email: 'dani@focuskids.co' },
            Client: { relation: [{ id: 'client-123' }] },
            Project: { relation: [{ id: 'proj-A' }, { id: 'proj-B' }] },
            Role: { select: { name: 'Designer' } },
          },
        },
      ],
    });

    const member = await findMemberByEmail('dani@focuskids.co');

    expect(member).toEqual({
      id: 'member-1',
      name: 'Daniela',
      email: 'dani@focuskids.co',
      clientId: 'client-123',
      projectIds: ['proj-A', 'proj-B'],
      role: 'Designer',
    });
    expect(mockNotion.databases.query).toHaveBeenCalledWith({
      database_id: 'team-db-id',
      filter: { property: 'Email', email: { equals: 'dani@focuskids.co' } },
    });
  });

  it('returns null when no match', async () => {
    mockNotion.databases.query.mockResolvedValueOnce({ results: [] });

    const member = await findMemberByEmail('unknown@x.com');

    expect(member).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm run test:run -- team.test
```

Expected: FAIL with "Cannot find module ../team".

- [ ] **Step 3: Implement**

Create `lib/notion/team.ts`:

```ts
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { teamMemberSchema, type TeamMember } from '@/schemas/team-member';

export async function findMemberByEmail(email: string): Promise<TeamMember | null> {
  const notion = getNotion();
  const res = await notion.databases.query({
    database_id: serverEnv.NOTION_DB_TEAM,
    filter: { property: 'Email', email: { equals: email } },
  });

  const row = res.results[0];
  if (!row || !('properties' in row)) return null;

  const props = row.properties as Record<string, any>;

  return teamMemberSchema.parse({
    id: row.id,
    name: props.Name?.title?.[0]?.plain_text ?? '',
    email: props.Email?.email ?? email,
    clientId: props.Client?.relation?.[0]?.id ?? null,
    projectIds: (props.Project?.relation ?? []).map((r: { id: string }) => r.id),
    role: props.Role?.select?.name ?? null,
  });
}
```

- [ ] **Step 4: Run test — expect pass**

```bash
npm run test:run -- team.test
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/notion/team.ts lib/notion/__tests__/team.test.ts
git commit -m "feat(notion): findMemberByEmail with Zod validation"
```

---

### Task 1.4: TDD — getClient (fetch client by id)

**Files:**
- Create: `lib/notion/clients.ts`, `lib/notion/__tests__/clients.test.ts`
- Create: `schemas/client.ts`

- [ ] **Step 1: Client schema**

Create `schemas/client.ts`:

```ts
import { z } from 'zod';

export const clientSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  status: z.string().nullable(),
});

export type Client = z.infer<typeof clientSchema>;
```

- [ ] **Step 2: Failing test**

Create `lib/notion/__tests__/clients.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClient } from '../clients';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));

const mockNotion = {
  pages: { retrieve: vi.fn() },
};

describe('getClient', () => {
  beforeEach(() => mockNotion.pages.retrieve.mockReset());

  it('returns a parsed client', async () => {
    mockNotion.pages.retrieve.mockResolvedValueOnce({
      id: 'client-123',
      icon: { type: 'emoji', emoji: '🎯' },
      properties: {
        Name: { title: [{ plain_text: 'Focus Kids' }] },
        Status: { select: { name: 'Active' } },
      },
    });

    const client = await getClient('client-123');

    expect(client).toEqual({
      id: 'client-123',
      name: 'Focus Kids',
      icon: '🎯',
      status: 'Active',
    });
  });
});
```

- [ ] **Step 3: Run — fail**

```bash
npm run test:run -- clients.test
```

- [ ] **Step 4: Implement**

Create `lib/notion/clients.ts`:

```ts
import { getNotion } from './client';
import { clientSchema, type Client } from '@/schemas/client';

export async function getClient(id: string): Promise<Client | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: id });
    if (!('properties' in page)) return null;
    const props = page.properties as Record<string, any>;
    const icon = (page as any).icon;

    return clientSchema.parse({
      id: page.id,
      name: props.Name?.title?.[0]?.plain_text ?? '',
      icon: icon?.type === 'emoji' ? icon.emoji : null,
      status: props.Status?.select?.name ?? null,
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run — pass**

```bash
npm run test:run -- clients.test
```

- [ ] **Step 6: Commit**

```bash
git add schemas/client.ts lib/notion/clients.ts lib/notion/__tests__/clients.test.ts
git commit -m "feat(notion): getClient by id"
```

---

### Task 1.5: TDD — queryTasks + updateTaskStatus

**Files:**
- Create: `lib/notion/tasks.ts`, `lib/notion/__tests__/tasks.test.ts`, `lib/cycles.ts`

- [ ] **Step 1: Cycle helpers**

Create `lib/cycles.ts`:

```ts
import { startOfWeek, endOfWeek, format, getISOWeek, getISOWeekYear, parseISO, addWeeks } from 'date-fns';

export function currentCycle(now = new Date()): string {
  return `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, '0')}`;
}

export function cycleRange(cycle: string): { start: Date; end: Date } {
  const [yearStr, weekStr] = cycle.split('-W');
  const simple = new Date(Number(yearStr), 0, 1 + (Number(weekStr) - 1) * 7);
  const start = startOfWeek(simple, { weekStartsOn: 1 });
  const end = endOfWeek(simple, { weekStartsOn: 1 });
  return { start, end };
}

export function shiftCycle(cycle: string, delta: number): string {
  const { start } = cycleRange(cycle);
  return currentCycle(addWeeks(start, delta));
}

export function formatCycleLabel(cycle: string): string {
  const { start, end } = cycleRange(cycle);
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}
```

- [ ] **Step 2: Failing test for queryTasks**

Create `lib/notion/__tests__/tasks.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryTasksByClientAndCycle, updateTaskStatus } from '../tasks';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_TASKS: 'tasks-db' } }));

const mockNotion = {
  databases: { query: vi.fn() },
  pages: { update: vi.fn() },
};

describe('queryTasksByClientAndCycle', () => {
  beforeEach(() => {
    mockNotion.databases.query.mockReset();
  });

  it('queries tasks filtered by client and cycle', async () => {
    mockNotion.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: 'task-1',
          url: 'https://notion.so/task-1',
          properties: {
            Title: { title: [{ plain_text: 'Fix login' }] },
            Status: { status: { name: 'En progreso' } },
            Priority: { select: { name: 'Alta' } },
            Assignee: { relation: [{ id: 'm-1' }] },
            Project: { relation: [{ id: 'p-1' }] },
            Client: { relation: [{ id: 'client-123' }] },
            Cycle: { rich_text: [{ plain_text: '2026-W17' }] },
            'Due date': { date: { start: '2026-04-24', end: null } },
            Labels: { multi_select: [{ name: 'Backend' }] },
          },
        },
      ],
    });

    const tasks = await queryTasksByClientAndCycle('client-123', '2026-W17');

    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toMatchObject({
      id: 'task-1',
      title: 'Fix login',
      status: 'En progreso',
      priority: 'Alta',
      clientId: 'client-123',
      cycle: '2026-W17',
      labels: ['Backend'],
    });

    const call = mockNotion.databases.query.mock.calls[0][0];
    expect(call.database_id).toBe('tasks-db');
    expect(call.filter).toMatchObject({
      and: expect.arrayContaining([
        expect.objectContaining({ property: 'Client' }),
        expect.objectContaining({ property: 'Cycle' }),
      ]),
    });
  });
});

describe('updateTaskStatus', () => {
  beforeEach(() => mockNotion.pages.update.mockReset());

  it('patches the Status property', async () => {
    mockNotion.pages.update.mockResolvedValueOnce({ id: 'task-1' });

    await updateTaskStatus('task-1', 'Hecho');

    expect(mockNotion.pages.update).toHaveBeenCalledWith({
      page_id: 'task-1',
      properties: { Status: { status: { name: 'Hecho' } } },
    });
  });
});
```

- [ ] **Step 3: Run — fail**

```bash
npm run test:run -- tasks.test
```

- [ ] **Step 4: Implement**

Create `lib/notion/tasks.ts`:

```ts
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { taskSchema, type Task, type TaskStatus } from '@/schemas/task';

export async function queryTasksByClientAndCycle(clientId: string, cycle: string): Promise<Task[]> {
  const notion = getNotion();
  const res = await notion.databases.query({
    database_id: serverEnv.NOTION_DB_TASKS,
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientId } },
        { property: 'Cycle', rich_text: { equals: cycle } },
      ],
    },
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      return taskSchema.parse({
        id: row.id,
        number: p.Number?.formula?.string ?? null,
        title: p.Title?.title?.[0]?.plain_text ?? '',
        status: p.Status?.status?.name ?? 'Backlog',
        priority: p.Priority?.select?.name ?? null,
        assigneeIds: (p.Assignee?.relation ?? []).map((r: { id: string }) => r.id),
        projectId: p.Project?.relation?.[0]?.id ?? null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        cycle: p.Cycle?.rich_text?.[0]?.plain_text ?? null,
        dueDate: p['Due date']?.date?.start ?? null,
        labels: (p.Labels?.multi_select ?? []).map((l: { name: string }) => l.name),
        url: row.url,
      });
    });
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
  const notion = getNotion();
  await notion.pages.update({
    page_id: taskId,
    properties: { Status: { status: { name: status } } },
  });
}

export async function getTask(taskId: string): Promise<Task | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: taskId });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;
    return taskSchema.parse({
      id: page.id,
      number: p.Number?.formula?.string ?? null,
      title: p.Title?.title?.[0]?.plain_text ?? '',
      status: p.Status?.status?.name ?? 'Backlog',
      priority: p.Priority?.select?.name ?? null,
      assigneeIds: (p.Assignee?.relation ?? []).map((r: { id: string }) => r.id),
      projectId: p.Project?.relation?.[0]?.id ?? null,
      clientId: p.Client?.relation?.[0]?.id ?? null,
      cycle: p.Cycle?.rich_text?.[0]?.plain_text ?? null,
      dueDate: p['Due date']?.date?.start ?? null,
      labels: (p.Labels?.multi_select ?? []).map((l: { name: string }) => l.name),
      url: (page as any).url,
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Run — pass**

```bash
npm run test:run -- tasks.test
```

- [ ] **Step 6: Commit**

```bash
git add lib/notion/tasks.ts lib/notion/__tests__/tasks.test.ts lib/cycles.ts
git commit -m "feat(notion): query tasks by client+cycle and updateTaskStatus"
```

---

### Task 1.6: Notion services for Meetings, Projects, Wiki

**Files:**
- Create: `lib/notion/meetings.ts`, `lib/notion/projects.ts`, `lib/notion/wiki.ts`
- Create: `lib/notion/__tests__/meetings.test.ts`, `projects.test.ts`, `wiki.test.ts`

- [ ] **Step 1: Write meetings tests + impl**

Create `lib/notion/__tests__/meetings.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryMeetingsByClient } from '../meetings';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({ serverEnv: { NOTION_DB_MEETINGS: 'meetings-db' } }));

const mockNotion = { databases: { query: vi.fn() } };

describe('queryMeetingsByClient', () => {
  beforeEach(() => mockNotion.databases.query.mockReset());

  it('returns meetings for the client sorted by date desc', async () => {
    mockNotion.databases.query.mockResolvedValueOnce({
      results: [
        {
          id: 'meet-1',
          url: 'https://notion.so/meet-1',
          properties: {
            Title: { title: [{ plain_text: 'Review sprint' }] },
            Date: { date: { start: '2026-04-22T15:00:00Z', end: '2026-04-22T16:00:00Z' } },
            'Meet URL': { url: 'https://meet.google.com/abc' },
            Recurrence: { rich_text: [{ plain_text: 'Miércoles semanal' }] },
            Facilitator: { relation: [{ id: 'm-1' }] },
            Attendees: { relation: [{ id: 'm-1' }, { id: 'm-2' }] },
            Client: { relation: [{ id: 'client-123' }] },
            'Action items': { relation: [{ id: 'task-1' }] },
          },
        },
      ],
    });

    const meetings = await queryMeetingsByClient('client-123');
    expect(meetings).toHaveLength(1);
    expect(meetings[0]).toMatchObject({
      id: 'meet-1',
      title: 'Review sprint',
      date: '2026-04-22T15:00:00Z',
      endDate: '2026-04-22T16:00:00Z',
      meetUrl: 'https://meet.google.com/abc',
      attendeeIds: ['m-1', 'm-2'],
      actionItemIds: ['task-1'],
    });
  });
});
```

Create `lib/notion/meetings.ts`:

```ts
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { meetingSchema, type Meeting } from '@/schemas/meeting';

export async function queryMeetingsByClient(clientId: string): Promise<Meeting[]> {
  const notion = getNotion();
  const res = await notion.databases.query({
    database_id: serverEnv.NOTION_DB_MEETINGS,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      return meetingSchema.parse({
        id: row.id,
        title: p.Title?.title?.[0]?.plain_text ?? '',
        date: p.Date?.date?.start ?? null,
        endDate: p.Date?.date?.end ?? null,
        meetUrl: p['Meet URL']?.url ?? null,
        recurrence: p.Recurrence?.rich_text?.[0]?.plain_text ?? null,
        facilitatorId: p.Facilitator?.relation?.[0]?.id ?? null,
        attendeeIds: (p.Attendees?.relation ?? []).map((r: { id: string }) => r.id),
        clientId: p.Client?.relation?.[0]?.id ?? null,
        actionItemIds: (p['Action items']?.relation ?? []).map((r: { id: string }) => r.id),
        url: row.url,
      });
    });
}

export async function getMeeting(meetingId: string): Promise<Meeting | null> {
  const notion = getNotion();
  try {
    const page = await notion.pages.retrieve({ page_id: meetingId });
    if (!('properties' in page)) return null;
    const p = page.properties as Record<string, any>;
    return meetingSchema.parse({
      id: page.id,
      title: p.Title?.title?.[0]?.plain_text ?? '',
      date: p.Date?.date?.start ?? null,
      endDate: p.Date?.date?.end ?? null,
      meetUrl: p['Meet URL']?.url ?? null,
      recurrence: p.Recurrence?.rich_text?.[0]?.plain_text ?? null,
      facilitatorId: p.Facilitator?.relation?.[0]?.id ?? null,
      attendeeIds: (p.Attendees?.relation ?? []).map((r: { id: string }) => r.id),
      clientId: p.Client?.relation?.[0]?.id ?? null,
      actionItemIds: (p['Action items']?.relation ?? []).map((r: { id: string }) => r.id),
      url: (page as any).url,
    });
  } catch {
    return null;
  }
}
```

Run `npm run test:run -- meetings.test` → expect pass.

- [ ] **Step 2: Projects service**

Create `lib/notion/projects.ts`:

```ts
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { projectSchema, type Project } from '@/schemas/project';

export async function queryProjectsByClient(clientId: string): Promise<Project[]> {
  const notion = getNotion();
  const res = await notion.databases.query({
    database_id: serverEnv.NOTION_DB_PROJECTS,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ property: 'Deadline', direction: 'ascending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      const icon = row.icon;
      return projectSchema.parse({
        id: row.id,
        name: p.Name?.title?.[0]?.plain_text ?? '',
        icon: icon?.type === 'emoji' ? icon.emoji : null,
        description: p.Description?.rich_text?.[0]?.plain_text ?? null,
        status: p.Status?.select?.name ?? null,
        progress: typeof p.Progress?.number === 'number' ? p.Progress.number : null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        teamIds: (p.Team?.relation ?? []).map((r: { id: string }) => r.id),
        deadline: p.Deadline?.date?.start ?? null,
        url: row.url,
      });
    });
}
```

Write a minimal test at `lib/notion/__tests__/projects.test.ts` following the same pattern as meetings (1 happy path test). Run → expect pass.

- [ ] **Step 3: Wiki service**

Create `lib/notion/wiki.ts`:

```ts
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { wikiPageSchema, type WikiPage } from '@/schemas/wiki';

export async function queryWikiByClient(clientId: string): Promise<WikiPage[]> {
  const notion = getNotion();
  const res = await notion.databases.query({
    database_id: serverEnv.NOTION_DB_WIKI,
    filter: { property: 'Client', relation: { contains: clientId } },
    sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
  });

  return res.results
    .filter((row): row is any => 'properties' in row)
    .map((row) => {
      const p = row.properties as Record<string, any>;
      const icon = row.icon;
      const cover = row.cover;
      return wikiPageSchema.parse({
        id: row.id,
        title: p.Name?.title?.[0]?.plain_text ?? p.Title?.title?.[0]?.plain_text ?? 'Sin título',
        icon: icon?.type === 'emoji' ? icon.emoji : null,
        cover: cover?.type === 'external' ? cover.external.url : cover?.type === 'file' ? cover.file.url : null,
        parentId: p['Parent item']?.relation?.[0]?.id ?? null,
        clientId: p.Client?.relation?.[0]?.id ?? null,
        ownerId: p.Owner?.relation?.[0]?.id ?? null,
        tags: (p.Tags?.multi_select ?? []).map((t: { name: string }) => t.name),
        lastEditedAt: row.last_edited_time,
        url: row.url,
      });
    });
}

export async function getWikiPageBlocks(pageId: string) {
  const notion = getNotion();
  const res = await notion.blocks.children.list({ block_id: pageId, page_size: 100 });
  return res.results;
}
```

Write a minimal wiki test. Run → expect pass.

- [ ] **Step 4: Commit all three services**

```bash
git add lib/notion/meetings.ts lib/notion/projects.ts lib/notion/wiki.ts lib/notion/__tests__/
git commit -m "feat(notion): meetings, projects, wiki services with Zod validation"
```

---

## Phase 2 — Supabase Auth

### Task 2.1: Supabase clients (server, browser, middleware)

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`

- [ ] **Step 1: Server client**

Create `lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { publicEnv } from '@/lib/env';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* called from a Server Component — noop, middleware refreshes cookies */
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Browser client**

Create `lib/supabase/client.ts`:

```ts
'use client';
import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
```

- [ ] **Step 3: Middleware helper**

Create `lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();
  return { response, user };
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/
git commit -m "feat(auth): Supabase SSR clients for server/browser/middleware"
```

---

### Task 2.2: Login page

**Files:**
- Create: `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `components/auth/login-form.tsx`

- [ ] **Step 1: Auth layout (no sidebar)**

Create `app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
```

- [ ] **Step 2: Login page (server component)**

Create `app/(auth)/login/page.tsx`:

```tsx
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1fr_520px]">
      <section className="relative hidden md:flex flex-col p-12 text-white bg-[#0f0f10] overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[700px] h-[700px] rounded-full bg-[#5e6ad2]/35 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-[#7c5fd0]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5e6ad2] to-[#7c5fd0] grid place-items-center font-bold">H</div>
          <span className="font-semibold">Hub</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[440px]">
          <p className="text-xs uppercase tracking-wider text-white/50 font-medium mb-3">Notion Hub</p>
          <h1 className="text-5xl font-semibold leading-tight tracking-tight mb-4">
            Tu proyecto.<br />
            <span className="text-[#b4bcf0]">Sin abrir Notion.</span>
          </h1>
          <p className="text-white/70 leading-relaxed">
            Un espacio ligero, rápido y claro para ver tus tareas, reuniones y documentación. Todo curado por tu PM. Cero curva de aprendizaje.
          </p>
        </div>

        <p className="relative z-10 text-xs text-white/40">© 2026 Hub</p>
      </section>

      <section className="flex flex-col p-12 md:p-16 bg-white border-l border-neutral-200">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h2 className="text-2xl font-semibold tracking-tight mb-1">Iniciar sesión</h2>
          <p className="text-sm text-muted-foreground mb-7">Te enviaremos un link mágico a tu correo. Sin contraseñas.</p>
          <LoginForm />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Login form (client component)**

Create `components/auth/login-form.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      toast.error('No pudimos enviar el link. ¿Correo correcto?');
      return;
    }
    setSent(true);
  }

  async function onGoogle() {
    const supabase = supabaseBrowser();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  if (sent) {
    return (
      <div className="space-y-3 text-sm">
        <div className="p-4 rounded-lg bg-[#eeeffc] border border-[#dfe1f2] text-[#3a3f7a]">
          <strong>Revisa tu correo.</strong> Te enviamos un link a <code className="font-mono text-xs">{email}</code>.
        </div>
        <button onClick={() => setSent(false)} className="text-xs text-muted-foreground hover:text-foreground">Usar otro correo</button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <Label htmlFor="email" className="text-xs">Correo del proyecto</Label>
        <div className="relative mt-1.5">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            required
            placeholder="tu@dominio.com"
            className="pl-9 h-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full h-9 bg-neutral-900 hover:bg-neutral-800">
        {loading ? 'Enviando…' : (<>Enviar link mágico <ArrowRight className="w-3.5 h-3.5 ml-2" /></>)}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground uppercase tracking-wider font-medium my-4">
        <span className="flex-1 h-px bg-border" />
        <span>o continúa con</span>
        <span className="flex-1 h-px bg-border" />
      </div>

      <Button type="button" variant="outline" onClick={onGoogle} className="w-full h-9">
        Continuar con Google
      </Button>

      <div className="mt-4 p-3 rounded-lg bg-[#eeeffc] border border-[#dfe1f2] text-xs text-[#3a3f7a] flex gap-2">
        <span>ℹ️</span>
        <p><strong>Solo correos autorizados.</strong> Tu PM debe tenerte registrado en la base de Equipo de Notion con este email.</p>
      </div>
    </form>
  );
}
```

- [ ] **Step 4: Visual verify**

```bash
npm run dev
```

Open `/login`. Confirm:
- Left panel: dark with gradient blurs, headline, subhead
- Right panel: email input, magic link button, Google button, hint
- Matches `login.html` mockup

Kill server.

- [ ] **Step 5: Commit**

```bash
git add app/\(auth\)/ components/auth/
git commit -m "feat(auth): login page with magic link + Google SSO"
```

---

### Task 2.3: Auth callback

**Files:**
- Create: `app/auth/callback/route.ts`

- [ ] **Step 1: Implement callback**

Create `app/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=callback`);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/auth/
git commit -m "feat(auth): Supabase magic link callback handler"
```

---

### Task 2.4: No-access page

**Files:**
- Create: `app/(auth)/no-access/page.tsx`

- [ ] **Step 1: Create page**

```tsx
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50">
      <div className="max-w-md text-center space-y-4 p-8">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white grid place-items-center font-bold text-lg mx-auto">H</div>
        <h1 className="text-2xl font-semibold tracking-tight">Sin acceso aún</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tu correo no está registrado como miembro de ningún proyecto todavía. Contacta a tu PM para que te agregue en la base de Equipo de Notion con este email.
        </p>
        <Button asChild variant="outline">
          <Link href="/login">Volver a inicio de sesión</Link>
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/no-access/
git commit -m "feat(auth): no-access page for unauthorized emails"
```

---

## Phase 3 — Auth Context Middleware

### Task 3.1: resolveContext

**Files:**
- Create: `lib/auth/context.ts`, `lib/auth/__tests__/context.test.ts`

- [ ] **Step 1: Failing test**

Create `lib/auth/__tests__/context.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/notion/team', () => ({ findMemberByEmail: vi.fn() }));
vi.mock('@/lib/notion/clients', () => ({ getClient: vi.fn() }));

import { resolveContext } from '../context';
import { findMemberByEmail } from '@/lib/notion/team';
import { getClient } from '@/lib/notion/clients';

describe('resolveContext', () => {
  it('returns null when no email', async () => {
    const ctx = await resolveContext(null);
    expect(ctx).toBeNull();
  });

  it('returns null when email not in Team DB', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce(null);
    const ctx = await resolveContext('unknown@x.com');
    expect(ctx).toBeNull();
  });

  it('returns context when email matches a member with client', async () => {
    vi.mocked(findMemberByEmail).mockResolvedValueOnce({
      id: 'm-1', name: 'Dani', email: 'd@x.com', clientId: 'client-123', projectIds: ['p-1'], role: null,
    });
    vi.mocked(getClient).mockResolvedValueOnce({
      id: 'client-123', name: 'Focus Kids', icon: '🎯', status: 'Active',
    });

    const ctx = await resolveContext('d@x.com');
    expect(ctx).toEqual({
      email: 'd@x.com',
      clientId: 'client-123',
      clientName: 'Focus Kids',
      clientIcon: '🎯',
      projectIds: ['p-1'],
      memberId: 'm-1',
      memberName: 'Dani',
      isAdmin: false,
    });
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm run test:run -- context.test
```

- [ ] **Step 3: Implement**

Create `lib/auth/context.ts`:

```ts
import { findMemberByEmail } from '@/lib/notion/team';
import { getClient } from '@/lib/notion/clients';

export type AppContext = {
  email: string;
  memberId: string;
  memberName: string;
  clientId: string;
  clientName: string;
  clientIcon: string | null;
  projectIds: string[];
  isAdmin: boolean;
};

export async function resolveContext(email: string | null): Promise<AppContext | null> {
  if (!email) return null;

  const member = await findMemberByEmail(email);
  if (!member || !member.clientId) return null;

  const client = await getClient(member.clientId);
  if (!client) return null;

  // TODO(v1.5): check app_admins table in Supabase
  const isAdmin = false;

  return {
    email,
    memberId: member.id,
    memberName: member.name,
    clientId: client.id,
    clientName: client.name,
    clientIcon: client.icon,
    projectIds: member.projectIds,
    isAdmin,
  };
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test:run -- context.test
```

- [ ] **Step 5: Commit**

```bash
git add lib/auth/
git commit -m "feat(auth): resolveContext maps email → client + member"
```

---

### Task 3.2: Next.js middleware

**Files:**
- Create: `middleware.ts`

- [ ] **Step 1: Write middleware**

Create `middleware.ts` in the repo root:

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/no-access', '/api/auth'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

> **Note:** the middleware only verifies a Supabase session. The email→client resolution happens in server components (via `resolveContext`) and in route handlers — NOT in middleware, because Edge runtime cannot import `@notionhq/client`.

- [ ] **Step 2: Commit**

```bash
git add middleware.ts
git commit -m "feat(auth): middleware redirects unauth'd users to /login"
```

---

### Task 3.3: /api/context route

**Files:**
- Create: `app/api/context/route.ts`

- [ ] **Step 1: Implement route**

Create `app/api/context/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const context = await resolveContext(user.email);
  if (!context) {
    return NextResponse.json({ error: 'no-access', email: user.email }, { status: 403 });
  }

  return NextResponse.json(context);
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/context/
git commit -m "feat(api): /api/context returns resolved AppContext"
```

---

### Task 3.4: requireContext helper for server components

**Files:**
- Create: `lib/auth/require-context.ts`

- [ ] **Step 1: Implement**

```ts
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveContext, type AppContext } from './context';

export async function requireContext(): Promise<AppContext> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/login');

  const ctx = await resolveContext(user.email);
  if (!ctx) redirect('/no-access');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth/require-context.ts
git commit -m "feat(auth): requireContext server helper with redirects"
```

---

## Phase 4 — App Shell

### Task 4.1: Shell layout

**Files:**
- Create: `app/(app)/layout.tsx`, `components/shell/sidebar.tsx`, `components/shell/topbar.tsx`, `components/shell/workspace-header.tsx`, `components/shell/user-card.tsx`

- [ ] **Step 1: Layout**

Create `app/(app)/layout.tsx`:

```tsx
import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <div className="grid grid-cols-[232px_1fr] h-screen">
      <Sidebar context={ctx} />
      <main className="flex flex-col overflow-hidden bg-white">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Sidebar**

Create `components/shell/sidebar.tsx`:

```tsx
import Link from 'next/link';
import type { AppContext } from '@/lib/auth/context';
import { WorkspaceHeader } from './workspace-header';
import { UserCard } from './user-card';
import { NavItem } from './nav-item';
import { Search, Home, CheckSquare, Calendar, Book, FolderKanban } from 'lucide-react';

export function Sidebar({ context }: { context: AppContext }) {
  return (
    <aside className="bg-[#f7f7f8] border-r border-border flex flex-col p-2">
      <WorkspaceHeader name={context.clientName} icon={context.clientIcon} />

      <div className="pb-3">
        <NavItem href="#" icon={<Search className="w-3.5 h-3.5" />} kbd="⌘K">Buscar</NavItem>
        <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />}>Home</NavItem>
      </div>

      <div className="pb-3">
        <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-wider px-2 py-1">Workspace</div>
        <NavItem href="/tareas" icon={<CheckSquare className="w-3.5 h-3.5" />}>Tareas</NavItem>
        <NavItem href="/reuniones" icon={<Calendar className="w-3.5 h-3.5" />}>Reuniones</NavItem>
        <NavItem href="/wiki" icon={<Book className="w-3.5 h-3.5" />}>Wiki</NavItem>
        <NavItem href="/proyectos" icon={<FolderKanban className="w-3.5 h-3.5" />}>Proyectos</NavItem>
      </div>

      <div className="flex-1" />
      <UserCard name={context.memberName} role={`Miembro · ${context.clientName}`} />
    </aside>
  );
}
```

- [ ] **Step 3: NavItem**

Create `components/shell/nav-item.tsx`:

```tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

type Props = {
  href: string;
  icon: React.ReactNode;
  kbd?: string;
  children: React.ReactNode;
  count?: number;
};

export function NavItem({ href, icon, kbd, children, count }: Props) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] font-normal text-muted-foreground hover:bg-black/[0.04] hover:text-foreground transition-colors',
        active && 'bg-white text-foreground font-medium shadow-sm border border-border',
      )}
    >
      {icon}
      <span className="flex-1">{children}</span>
      {kbd && <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/5 text-muted-foreground font-inherit">{kbd}</kbd>}
      {typeof count === 'number' && (
        <span className="text-[11px] bg-black/5 text-muted-foreground px-1.5 rounded-full min-w-[18px] text-center">{count}</span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: WorkspaceHeader + UserCard**

Create `components/shell/workspace-header.tsx`:

```tsx
import { ChevronDown } from 'lucide-react';

export function WorkspaceHeader({ name, icon }: { name: string; icon: string | null }) {
  return (
    <div className="flex items-center gap-2 px-2 pb-2.5 pt-2 border-b border-border mb-2">
      <div className="w-[22px] h-[22px] rounded bg-gradient-to-br from-orange-400 to-pink-500 grid place-items-center text-white text-[11px] font-semibold">
        {icon ?? name[0]?.toUpperCase()}
      </div>
      <span className="font-semibold text-[13px] flex-1">{name}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}
```

Create `components/shell/user-card.tsx`:

```tsx
import { MoreHorizontal } from 'lucide-react';

export function UserCard({ name, role }: { name: string; role: string }) {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="flex items-center gap-2 p-2 border-t border-border mt-1">
      <div className="w-6 h-6 rounded-full bg-[#8ba1d9] text-white grid place-items-center text-[11px] font-semibold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium truncate">{name}</div>
        <div className="text-[11px] text-muted-foreground truncate">{role}</div>
      </div>
      <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
    </div>
  );
}
```

- [ ] **Step 5: Topbar component**

Create `components/shell/topbar.tsx`:

```tsx
type Crumb = { label: string; href?: string; muted?: boolean };

export function Topbar({ crumbs, children }: { crumbs: Crumb[]; children?: React.ReactNode }) {
  return (
    <div className="h-11 border-b border-border flex items-center px-4 gap-3">
      <nav className="flex items-center gap-2 text-[13px]">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">/</span>}
            <span className={c.muted ? 'text-muted-foreground font-normal' : 'text-foreground font-medium'}>
              {c.label}
            </span>
          </span>
        ))}
      </nav>
      <div className="flex-1" />
      {children}
    </div>
  );
}
```

- [ ] **Step 6: Placeholder home page to verify shell**

Overwrite `app/(app)/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';

export default async function HomePage() {
  const ctx = await requireContext();
  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]} />
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Hola, {ctx.memberName}</h1>
        <p className="text-muted-foreground">Cliente: {ctx.clientName}</p>
      </div>
    </>
  );
}
```

Delete the scaffolded `app/page.tsx` (the one from `create-next-app`) and the placeholder home content that came with it. Make sure `app/(app)/page.tsx` exists and the old `app/page.tsx` is gone:

```bash
rm -f app/page.tsx
```

- [ ] **Step 7: Visual verify**

```bash
npm run dev
```

With Supabase + Notion env vars configured, log in with a real email that exists in your Team DB. Confirm sidebar renders workspace name, nav items, user card.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(shell): sidebar + topbar layout with client context"
```

---

## Phase 5 — Home Page

### Task 5.1: Home data fetcher (server)

**Files:**
- Create: `lib/home/queries.ts`, `lib/home/__tests__/queries.test.ts`

- [ ] **Step 1: Test**

Create `lib/home/__tests__/queries.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import type { Task } from '@/schemas/task';

vi.mock('@/lib/notion/tasks', () => ({ queryTasksByClientAndCycle: vi.fn() }));
vi.mock('@/lib/notion/meetings', () => ({ queryMeetingsByClient: vi.fn() }));
vi.mock('@/lib/notion/wiki', () => ({ queryWikiByClient: vi.fn() }));

import { getHomeData } from '../queries';
import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { queryWikiByClient } from '@/lib/notion/wiki';

describe('getHomeData', () => {
  it('returns stats derived from tasks', async () => {
    const tasks: Task[] = [
      { id: 't1', number: null, title: 'A', status: 'En progreso', priority: null, assigneeIds: [], projectId: null, clientId: 'c', cycle: '2026-W17', dueDate: '2026-04-24', labels: [], url: 'https://notion.so/a' },
      { id: 't2', number: null, title: 'B', status: 'Por hacer', priority: null, assigneeIds: [], projectId: null, clientId: 'c', cycle: '2026-W17', dueDate: null, labels: [], url: 'https://notion.so/b' },
      { id: 't3', number: null, title: 'C', status: 'Hecho', priority: null, assigneeIds: [], projectId: null, clientId: 'c', cycle: '2026-W17', dueDate: null, labels: [], url: 'https://notion.so/c' },
    ];
    vi.mocked(queryTasksByClientAndCycle).mockResolvedValueOnce(tasks);
    vi.mocked(queryMeetingsByClient).mockResolvedValueOnce([]);
    vi.mocked(queryWikiByClient).mockResolvedValueOnce([]);

    const data = await getHomeData('c', '2026-W17');
    expect(data.stats).toEqual({
      inProgress: 1,
      todo: 1,
      done: 1,
      total: 3,
    });
  });
});
```

- [ ] **Step 2: Run — fail**

```bash
npm run test:run -- queries.test
```

- [ ] **Step 3: Implement**

Create `lib/home/queries.ts`:

```ts
import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { queryWikiByClient } from '@/lib/notion/wiki';

export async function getHomeData(clientId: string, cycle: string) {
  const [tasks, meetings, wiki] = await Promise.all([
    queryTasksByClientAndCycle(clientId, cycle),
    queryMeetingsByClient(clientId),
    queryWikiByClient(clientId),
  ]);

  const stats = {
    inProgress: tasks.filter((t) => t.status === 'En progreso').length,
    todo: tasks.filter((t) => t.status === 'Por hacer').length,
    done: tasks.filter((t) => t.status === 'Hecho').length,
    total: tasks.length,
  };

  const now = new Date();
  const upcomingMeeting = meetings.find((m) => m.date && new Date(m.date) >= now) ?? meetings[0] ?? null;
  const recentWiki = wiki.slice(0, 4);

  const myTasksToday = tasks.filter(
    (t) => t.status !== 'Hecho' &&
      (!t.dueDate || new Date(t.dueDate).toDateString() === now.toDateString() ||
        (t.dueDate && new Date(t.dueDate) < now)),
  ).slice(0, 5);

  return { tasks, stats, upcomingMeeting, recentWiki, myTasksToday };
}
```

- [ ] **Step 4: Run — pass**

```bash
npm run test:run -- queries.test
```

- [ ] **Step 5: Commit**

```bash
git add lib/home/
git commit -m "feat(home): data fetcher with stats derivation"
```

---

### Task 5.2: Home page UI

**Files:**
- Create: `components/home/greeting.tsx`, `stats-strip.tsx`, `my-tasks.tsx`, `next-meeting.tsx`, `wiki-recents.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Home page composition**

Rewrite `app/(app)/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { getHomeData } from '@/lib/home/queries';
import { currentCycle, formatCycleLabel } from '@/lib/cycles';
import { Greeting } from '@/components/home/greeting';
import { StatsStrip } from '@/components/home/stats-strip';
import { MyTasks } from '@/components/home/my-tasks';
import { NextMeeting } from '@/components/home/next-meeting';
import { WikiRecents } from '@/components/home/wiki-recents';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await requireContext();
  const cycle = currentCycle();
  const data = await getHomeData(ctx.clientId, cycle);

  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]}>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
          <Clock className="w-3 h-3" />
          {cycle.replace('-W', ' · W')} · {formatCycleLabel(cycle)}
        </span>
      </Topbar>

      <div className="flex-1 overflow-auto p-10 max-w-[980px] mx-auto w-full">
        <Greeting name={ctx.memberName} stats={data.stats} upcomingMeeting={data.upcomingMeeting} />
        <StatsStrip stats={data.stats} upcomingMeeting={data.upcomingMeeting} />
        <MyTasks tasks={data.myTasksToday} />
        <div className="grid grid-cols-2 gap-5 mt-8">
          <NextMeeting meeting={data.upcomingMeeting} />
          <WikiRecents pages={data.recentWiki} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Build the 5 home components**

Implement each component in `components/home/` based on the visual structure in `home.html` mockup. Keep them pure presentational; they receive data via props.

**greeting.tsx** — date line + "Buenos días, {name}" + status sentence.
**stats-strip.tsx** — 4 stat cards (inProgress, todo+atrasadas flag, done/total, next meeting time).
**my-tasks.tsx** — list with status ring, priority icon, id, title, label chip, due pill, avatar.
**next-meeting.tsx** — meeting hero card with join button (null-safe if no meeting).
**wiki-recents.tsx** — list of up to 4 recent wiki pages.

Each component ≤150 LOC. Follow the Tailwind patterns from the HTML mockup (colors via CSS vars + direct hex values).

- [ ] **Step 3: Visual verify**

```bash
npm run dev
```

Navigate to `/`. Confirm layout matches `home.html` mockup.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/page.tsx components/home/
git commit -m "feat(home): full home page with greeting, stats, tasks, meeting, wiki"
```

---

## Phase 6 — Kanban Page

### Task 6.1: Kanban server page

**Files:**
- Create: `app/(app)/tareas/page.tsx`, `components/kanban/board-classic.tsx`, `board-week.tsx`, `column.tsx`, `card.tsx`, `week-stripe.tsx`, `view-toggle.tsx`, `cycle-nav.tsx`

- [ ] **Step 1: Page**

Create `app/(app)/tareas/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTasksByClientAndCycle } from '@/lib/notion/tasks';
import { currentCycle, formatCycleLabel, shiftCycle } from '@/lib/cycles';
import { KanbanView } from '@/components/kanban/kanban-view';

export const dynamic = 'force-dynamic';

export default async function TareasPage({ searchParams }: { searchParams: Promise<{ cycle?: string; view?: 'classic' | 'week' }> }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const cycle = sp.cycle ?? currentCycle();
  const view = sp.view ?? 'classic';
  const tasks = await queryTasksByClientAndCycle(ctx.clientId, cycle);

  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: view === 'week' ? 'Sprint de esta semana' : 'Todas las tareas activas', muted: true }]} />
      <KanbanView initialTasks={tasks} cycle={cycle} view={view} />
    </>
  );
}
```

- [ ] **Step 2: KanbanView (client orchestrator)**

Create `components/kanban/kanban-view.tsx`:

```tsx
'use client';

import { useState } from 'react';
import type { Task } from '@/schemas/task';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { ViewToggle } from './view-toggle';
import { CycleNav } from './cycle-nav';
import { formatCycleLabel } from '@/lib/cycles';
import { Clock } from 'lucide-react';

type Props = { initialTasks: Task[]; cycle: string; view: 'classic' | 'week' };

export function KanbanView({ initialTasks, cycle, view: initialView }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<'classic' | 'week'>(initialView);

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-5 pt-5">
      <div className="flex items-center gap-2.5 mb-4">
        <h1 className="text-[15px] font-semibold">Sprint activo</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium bg-[#eeeffc] text-[#5e6ad2]">
          <Clock className="w-[11px] h-[11px]" />
          Semana {cycle.split('-W')[1]}
        </span>
        <span className="text-muted-foreground text-[12px]">{formatCycleLabel(cycle)}</span>
        <CycleNav cycle={cycle} />
        <div className="ml-auto">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {view === 'classic' ? (
        <BoardClassic tasks={tasks} onTasksChange={setTasks} />
      ) : (
        <BoardWeek tasks={tasks} onTasksChange={setTasks} cycle={cycle} />
      )}
    </div>
  );
}
```

- [ ] **Step 3: ViewToggle + CycleNav**

`components/kanban/view-toggle.tsx`:

```tsx
import { cn } from '@/lib/utils';

type Props = { view: 'classic' | 'week'; onChange: (v: 'classic' | 'week') => void };

export function ViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex bg-[#f7f7f8] border border-border rounded-md p-0.5">
      {(['classic', 'week'] as const).map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={cn(
            'px-2.5 py-1 text-[12px] font-medium rounded text-muted-foreground hover:text-foreground transition-colors',
            view === v && 'bg-white text-foreground shadow-sm',
          )}
        >
          {v === 'classic' ? 'Clásico' : 'Semana'}
        </button>
      ))}
    </div>
  );
}
```

`components/kanban/cycle-nav.tsx`:

```tsx
'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { shiftCycle } from '@/lib/cycles';

export function CycleNav({ cycle }: { cycle: string }) {
  const router = useRouter();
  const sp = useSearchParams();

  const go = (delta: number) => {
    const params = new URLSearchParams(sp);
    params.set('cycle', shiftCycle(cycle, delta));
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex gap-1 ml-2">
      <button onClick={() => go(-1)} className="w-6 h-6 border border-border rounded bg-white hover:bg-[#f7f7f8] grid place-items-center text-muted-foreground hover:text-foreground">
        <ChevronLeft className="w-3 h-3" />
      </button>
      <button onClick={() => go(1)} className="w-6 h-6 border border-border rounded bg-white hover:bg-[#f7f7f8] grid place-items-center text-muted-foreground hover:text-foreground">
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Column + Card components**

`components/kanban/column.tsx`:

```tsx
import type { Task, TaskStatus } from '@/schemas/task';
import { TaskCard } from './card';
import { cn } from '@/lib/utils';

type Props = {
  title: string;
  status: TaskStatus;
  tasks: Task[];
  dotClass: string;
  dotFilled?: boolean;
  highlighted?: boolean;
};

export function Column({ title, tasks, dotClass, dotFilled, highlighted }: Props) {
  return (
    <div className={cn(
      'bg-[#fafafa] border border-border rounded-lg flex flex-col min-h-full',
      highlighted && 'bg-[#eff6ff]',
    )}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <span className={cn('w-2.5 h-2.5 rounded-full border-[1.5px]', dotClass, dotFilled && 'bg-current')} />
        <span className="text-[12px] font-semibold">{title}</span>
        <span className="text-[12px] text-muted-foreground font-medium">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-auto">
        {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
      </div>
    </div>
  );
}
```

`components/kanban/card.tsx`:

```tsx
import Link from 'next/link';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';

const PRIORITY_FILL = {
  Urgente: 'fill-[#d24949]',
  Alta: 'fill-[#c78a2c]',
  Media: 'fill-[#8a8a91]',
  Baja: 'fill-[#8a8a91] opacity-50',
} as const;

export function TaskCard({ task }: { task: Task }) {
  const isDone = task.status === 'Hecho';
  return (
    <Link
      href={`/tareas/${task.id}`}
      className={cn(
        'bg-white border border-border rounded-md p-2.5 cursor-grab hover:shadow-sm hover:border-border-strong transition-all block',
        isDone && 'opacity-75',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {task.priority && (
          <svg viewBox="0 0 24 24" className={cn('w-2.5 h-2.5', PRIORITY_FILL[task.priority])}>
            <rect x="2" y="10" width="4" height="12" />
            <rect x="10" y="6" width="4" height="16" opacity={task.priority === 'Baja' ? '0.3' : '1'} />
            <rect x="18" y="2" width="4" height="20" opacity={task.priority === 'Urgente' ? '1' : '0.3'} />
          </svg>
        )}
        {task.number && <span className="font-medium">{task.number}</span>}
      </div>
      <div className={cn('text-[13px] leading-tight mb-2', isDone && 'line-through text-muted-foreground')}>
        {task.title}
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {task.labels.slice(0, 1).map((l) => (
          <span key={l} className="px-1.5 rounded text-[11px] font-medium bg-[#eef4ff] text-[#3a5fcc]">{l}</span>
        ))}
        {task.dueDate && <span className="ml-auto">{new Date(task.dueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>}
      </div>
    </Link>
  );
}
```

- [ ] **Step 5: BoardClassic**

`components/kanban/board-classic.tsx`:

```tsx
'use client';

import type { Task } from '@/schemas/task';
import { Column } from './column';

type Props = { tasks: Task[]; onTasksChange: (t: Task[]) => void };

const COLUMNS = [
  { title: 'Backlog', status: 'Backlog', dotClass: 'border-[#a0a0a8] text-[#a0a0a8]' },
  { title: 'Por hacer', status: 'Por hacer', dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'En progreso', status: 'En progreso', dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Hecho', status: 'Hecho', dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
] as const;

export function BoardClassic({ tasks }: Props) {
  return (
    <div className="flex-1 grid grid-cols-4 gap-2.5 pb-5 overflow-auto">
      {COLUMNS.map((col) => (
        <Column
          key={col.status}
          title={col.title}
          status={col.status}
          tasks={tasks.filter((t) => t.status === col.status)}
          dotClass={col.dotClass}
          dotFilled={col.dotFilled}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: BoardWeek with stripe**

`components/kanban/week-stripe.tsx`:

```tsx
import type { Task } from '@/schemas/task';
import { cycleRange } from '@/lib/cycles';
import { addDays, format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';

export function WeekStripe({ tasks, cycle }: { tasks: Task[]; cycle: string }) {
  const { start } = cycleRange(cycle);
  const today = new Date();

  return (
    <div className="grid grid-cols-7 gap-1 py-2.5 pb-4 border-b border-border mb-3.5">
      {Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(start, i);
        const dayTasks = tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), d));
        const isToday = isSameDay(d, today);
        const isWeekend = i >= 5;

        return (
          <div
            key={i}
            className={cn(
              'p-2 rounded-md bg-[#fafafa] border border-border',
              isToday && 'bg-[#eeeffc] border-[#c9cbe8]',
              isWeekend && 'bg-transparent border-transparent opacity-50',
            )}
          >
            <div className="flex justify-between items-baseline mb-1.5">
              <span className={cn('text-[11px] uppercase text-muted-foreground font-medium', isToday && 'text-[#5e6ad2]')}>
                {format(d, 'EEE')}{isToday && ' · Hoy'}
              </span>
              <span className={cn('text-[15px] font-semibold', isToday && 'text-[#5e6ad2]')}>{format(d, 'd')}</span>
            </div>
            <div className="flex gap-1 items-center h-2">
              {dayTasks.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    t.status === 'Hecho' && 'bg-[#3f9f5c]',
                    t.status === 'En progreso' && 'bg-[#5e6ad2]',
                    (t.status === 'Por hacer' || t.status === 'Backlog') && 'bg-[#d1d1d4]',
                  )}
                />
              ))}
              {dayTasks.length > 0 && <span className="text-[10px] text-muted-foreground ml-auto">{dayTasks.length}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

`components/kanban/board-week.tsx`:

```tsx
'use client';

import type { Task } from '@/schemas/task';
import { Column } from './column';
import { WeekStripe } from './week-stripe';

type Props = { tasks: Task[]; cycle: string; onTasksChange: (t: Task[]) => void };

export function BoardWeek({ tasks, cycle }: Props) {
  const active = tasks.filter((t) => t.status !== 'Backlog');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <WeekStripe tasks={active} cycle={cycle} />
      <div className="flex-1 grid grid-cols-3 gap-2.5 pb-5 overflow-auto">
        <Column title="Por hacer" status="Por hacer" tasks={active.filter((t) => t.status === 'Por hacer')} dotClass="border-[#57575c] text-[#57575c]" />
        <Column title="En progreso" status="En progreso" tasks={active.filter((t) => t.status === 'En progreso')} dotClass="border-[#5e6ad2] text-[#5e6ad2]" dotFilled />
        <Column title="Hecho esta semana" status="Hecho" tasks={active.filter((t) => t.status === 'Hecho')} dotClass="border-[#3f9f5c] text-[#3f9f5c]" dotFilled />
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Visual verify**

```bash
npm run dev
```

Navigate to `/tareas`. Confirm:
- Clásico: 4 columnas, cards correctas
- Toggle a Semana: 7-day stripe + 3 columnas
- Cycle nav ‹ › changes URL and reloads data

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/tareas/ components/kanban/
git commit -m "feat(kanban): Clásico + Semana views with toggle and cycle nav"
```

---

## Phase 7 — Drag & Drop + Optimistic Updates

### Task 7.1: PATCH /api/tasks/:id/status route

**Files:**
- Create: `app/api/tasks/[id]/status/route.ts`, `app/api/tasks/[id]/status/__tests__/route.test.ts`

- [ ] **Step 1: Implement route**

Create `app/api/tasks/[id]/status/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/auth/context';
import { getTask, updateTaskStatus } from '@/lib/notion/tasks';
import { taskStatusSchema } from '@/schemas/task';

const bodySchema = z.object({ status: taskStatusSchema });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const ctx = await resolveContext(user.email);
  if (!ctx) return NextResponse.json({ error: 'no-access' }, { status: 403 });

  // Verify the task belongs to this client
  const task = await getTask(id);
  if (!task) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  if (task.clientId !== ctx.clientId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'invalid-body' }, { status: 400 });

  await updateTaskStatus(id, parsed.data.status);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/tasks/
git commit -m "feat(api): PATCH /api/tasks/:id/status with ACL check"
```

---

### Task 7.2: Install and wire dnd-kit

**Files:**
- Modify: `components/kanban/board-classic.tsx`, `board-week.tsx`, `column.tsx`, `card.tsx`
- Create: `hooks/use-move-task.ts`

- [ ] **Step 1: Mutation hook**

Create `hooks/use-move-task.ts`:

```ts
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Task, TaskStatus } from '@/schemas/task';

export function useMoveTask(tasks: Task[], setTasks: (t: Task[]) => void) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function move(taskId: string, newStatus: TaskStatus) {
    const original = tasks;
    const optimistic = tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    setTasks(optimistic);
    setPending((s) => new Set(s).add(taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setTasks(original);
      toast.error('No se pudo mover la tarea. Intenta de nuevo.');
    } finally {
      setPending((s) => {
        const n = new Set(s);
        n.delete(taskId);
        return n;
      });
    }
  }

  return { move, pending };
}
```

- [ ] **Step 2: Wire dnd-kit into BoardClassic**

Replace `components/kanban/board-classic.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, type DragEndEvent, type DragStartEvent, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task, TaskStatus } from '@/schemas/task';
import { Column } from './column';
import { TaskCard } from './card';
import { useMoveTask } from '@/hooks/use-move-task';

const COLUMNS: Array<{ title: string; status: TaskStatus; dotClass: string; dotFilled?: boolean }> = [
  { title: 'Backlog', status: 'Backlog', dotClass: 'border-[#a0a0a8] text-[#a0a0a8]' },
  { title: 'Por hacer', status: 'Por hacer', dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'En progreso', status: 'En progreso', dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Hecho', status: 'Hecho', dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
];

export function BoardClassic({ tasks, onTasksChange }: { tasks: Task[]; onTasksChange: (t: Task[]) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(tasks, onTasksChange);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;

    const task = tasks.find((t) => t.id === e.active.id);
    if (!task) return;

    const newStatus = COLUMNS.find((c) => c.status === overId)?.status;
    if (!newStatus || newStatus === task.status) return;

    move(task.id, newStatus);
  }

  const active = tasks.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex-1 grid grid-cols-4 gap-2.5 pb-5 overflow-auto">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            title={col.title}
            status={col.status}
            tasks={tasks.filter((t) => t.status === col.status)}
            dotClass={col.dotClass}
            dotFilled={col.dotFilled}
          />
        ))}
      </div>
      <DragOverlay>{active && <TaskCard task={active} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
```

- [ ] **Step 3: Make Column a droppable**

Update `components/kanban/column.tsx`:

```tsx
import type { Task, TaskStatus } from '@/schemas/task';
import { TaskCard } from './card';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type Props = { title: string; status: TaskStatus; tasks: Task[]; dotClass: string; dotFilled?: boolean };

export function Column({ title, status, tasks, dotClass, dotFilled }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div ref={setNodeRef} className={cn(
      'bg-[#fafafa] border border-border rounded-lg flex flex-col min-h-full transition-colors',
      isOver && 'border-[#5e6ad2] bg-[#eeeffc]/30',
    )}>
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <span className={cn('w-2.5 h-2.5 rounded-full border-[1.5px]', dotClass, dotFilled && 'bg-current')} />
        <span className="text-[12px] font-semibold">{title}</span>
        <span className="text-[12px] text-muted-foreground font-medium">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-auto">
          {tasks.map((t) => <TaskCard key={t.id} task={t} />)}
        </div>
      </SortableContext>
    </div>
  );
}
```

- [ ] **Step 4: Make TaskCard draggable**

Update `components/kanban/card.tsx` — replace the outer `<Link>` with:

```tsx
'use client';

import Link from 'next/link';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_FILL: Record<string, string> = {
  Urgente: 'fill-[#d24949]',
  Alta: 'fill-[#c78a2c]',
  Media: 'fill-[#8a8a91]',
  Baja: 'fill-[#8a8a91] opacity-50',
};

export function TaskCard({ task, isOverlay }: { task: Task; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const isDone = task.status === 'Hecho';
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'bg-white border border-border rounded-md p-2.5 cursor-grab hover:shadow-sm hover:border-border-strong transition-all',
        isDone && 'opacity-75',
        isDragging && 'opacity-40',
        isOverlay && 'shadow-lg rotate-2',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {task.priority && PRIORITY_FILL[task.priority] && (
          <svg viewBox="0 0 24 24" className={cn('w-2.5 h-2.5', PRIORITY_FILL[task.priority])}>
            <rect x="2" y="10" width="4" height="12" />
            <rect x="10" y="6" width="4" height="16" opacity={task.priority === 'Baja' ? '0.3' : '1'} />
            <rect x="18" y="2" width="4" height="20" opacity={task.priority === 'Urgente' ? '1' : '0.3'} />
          </svg>
        )}
        {task.number && <span className="font-medium">{task.number}</span>}
      </div>
      <Link href={`/tareas/${task.id}`} className={cn('block text-[13px] leading-tight mb-2 hover:underline', isDone && 'line-through text-muted-foreground')}>
        {task.title}
      </Link>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {task.labels.slice(0, 1).map((l) => (
          <span key={l} className="px-1.5 rounded text-[11px] font-medium bg-[#eef4ff] text-[#3a5fcc]">{l}</span>
        ))}
        {task.dueDate && <span className="ml-auto">{new Date(task.dueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add Toaster to layout**

Edit `app/layout.tsx` — add:

```tsx
import { Toaster } from 'sonner';

// inside <body>:
<Toaster position="bottom-right" />
```

- [ ] **Step 6: Wire BoardWeek with the same DnD**

Apply the same `DndContext`/`DragOverlay`/`useMoveTask` pattern to `BoardWeek`. Only difference: 3 columns instead of 4, Backlog excluded.

- [ ] **Step 7: Visual + functional test**

```bash
npm run dev
```

- Drag a card from "Por hacer" to "En progreso" → it moves instantly, then the server request fires
- Check Notion: the task's Status property should be updated
- Disconnect network DevTools → drag a card → it should revert and show error toast
- Keyboard: Tab to a card, Space to grab, arrow keys to move, Space to drop

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(kanban): dnd-kit drag & drop with optimistic updates and ACL'd PATCH"
```

---

## Phase 8 — Task Detail Drawer

### Task 8.1: Task detail route with Sheet

**Files:**
- Create: `app/(app)/tareas/[taskId]/page.tsx`, `components/kanban/task-drawer.tsx`
- Create: `lib/notion/blocks.ts` (minimal block renderer)

- [ ] **Step 1: Minimal block renderer**

Create `lib/notion/blocks.ts`:

```ts
import { getNotion } from './client';

export async function getBlocks(blockId: string) {
  const notion = getNotion();
  const res = await notion.blocks.children.list({ block_id: blockId, page_size: 100 });
  return res.results;
}
```

Create `components/wiki/blocks-renderer.tsx` (we reuse it for Wiki later):

```tsx
import type { BlockObjectResponse } from '@notionhq/client/build/src/api-endpoints';

function renderRich(rich: { plain_text: string; annotations: any; href: string | null }[]) {
  return rich.map((r, i) => {
    let text: React.ReactNode = r.plain_text;
    if (r.annotations.bold) text = <strong key={i}>{text}</strong>;
    if (r.annotations.italic) text = <em key={i}>{text}</em>;
    if (r.annotations.code) text = <code className="px-1 py-0.5 rounded bg-muted text-[12px]" key={i}>{text}</code>;
    if (r.href) text = <a key={i} href={r.href} target="_blank" rel="noreferrer" className="underline">{text}</a>;
    return <span key={i}>{text}</span>;
  });
}

export function BlocksRenderer({ blocks }: { blocks: any[] }) {
  return (
    <div className="prose-sm max-w-none">
      {blocks.map((b: any) => {
        switch (b.type) {
          case 'paragraph':
            return <p key={b.id} className="text-[14px] leading-relaxed mb-3">{renderRich(b.paragraph.rich_text)}</p>;
          case 'heading_1':
            return <h2 key={b.id} className="text-[22px] font-semibold mt-8 mb-3.5 tracking-tight">{renderRich(b.heading_1.rich_text)}</h2>;
          case 'heading_2':
            return <h3 key={b.id} className="text-[18px] font-semibold mt-6 mb-3 tracking-tight">{renderRich(b.heading_2.rich_text)}</h3>;
          case 'heading_3':
            return <h4 key={b.id} className="text-[15px] font-semibold mt-5 mb-2.5">{renderRich(b.heading_3.rich_text)}</h4>;
          case 'bulleted_list_item':
            return <li key={b.id} className="text-[14px] leading-relaxed list-disc ml-5">{renderRich(b.bulleted_list_item.rich_text)}</li>;
          case 'numbered_list_item':
            return <li key={b.id} className="text-[14px] leading-relaxed list-decimal ml-5">{renderRich(b.numbered_list_item.rich_text)}</li>;
          case 'callout':
            return (
              <div key={b.id} className="flex gap-2.5 p-3 bg-[#faf0db] border border-[#efddb6] rounded-md my-4 text-[13px] text-[#6b4f18]">
                <span>{b.callout.icon?.emoji ?? '💡'}</span>
                <div>{renderRich(b.callout.rich_text)}</div>
              </div>
            );
          case 'divider':
            return <hr key={b.id} className="my-5 border-border" />;
          case 'quote':
            return <blockquote key={b.id} className="border-l-2 border-border pl-3 text-muted-foreground italic my-3">{renderRich(b.quote.rich_text)}</blockquote>;
          case 'code':
            return <pre key={b.id} className="p-3 rounded-md bg-muted text-[12px] font-mono overflow-auto my-3"><code>{b.code.rich_text.map((r: any) => r.plain_text).join('')}</code></pre>;
          default:
            return null;
        }
      })}
    </div>
  );
}
```

- [ ] **Step 2: Detail page**

Create `app/(app)/tareas/[taskId]/page.tsx`:

```tsx
import { requireContext } from '@/lib/auth/require-context';
import { getTask } from '@/lib/notion/tasks';
import { getBlocks } from '@/lib/notion/blocks';
import { notFound } from 'next/navigation';
import { TaskDrawer } from '@/components/kanban/task-drawer';

export const dynamic = 'force-dynamic';

export default async function TaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const ctx = await requireContext();
  const { taskId } = await params;

  const task = await getTask(taskId);
  if (!task || task.clientId !== ctx.clientId) notFound();

  const blocks = await getBlocks(taskId);

  return <TaskDrawer task={task} blocks={blocks} />;
}
```

- [ ] **Step 3: Drawer component**

Create `components/kanban/task-drawer.tsx`:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import type { Task } from '@/schemas/task';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { ExternalLink } from 'lucide-react';

export function TaskDrawer({ task, blocks }: { task: Task; blocks: any[] }) {
  const router = useRouter();
  return (
    <Sheet defaultOpen onOpenChange={(open) => { if (!open) router.back(); }}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            {task.number && <span className="font-medium">{task.number}</span>}
            <span className="px-2 py-0.5 rounded bg-[#eeeffc] text-[#5e6ad2] text-[11px] font-medium">{task.status}</span>
          </div>
          <SheetTitle className="text-[20px] tracking-tight">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-[120px_1fr] gap-y-2 gap-x-4 text-[12px] mb-6 p-3 rounded-lg bg-[#f7f7f8] border border-border">
          <span className="text-muted-foreground">Priority</span>
          <span>{task.priority ?? '—'}</span>
          <span className="text-muted-foreground">Due date</span>
          <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString('es') : '—'}</span>
          <span className="text-muted-foreground">Cycle</span>
          <span>{task.cycle ?? '—'}</span>
          <span className="text-muted-foreground">Labels</span>
          <span>{task.labels.join(', ') || '—'}</span>
        </div>

        {blocks.length > 0 && <BlocksRenderer blocks={blocks} />}

        <div className="mt-6 pt-4 border-t border-border">
          <Button asChild variant="outline" size="sm">
            <a href={task.url} target="_blank" rel="noreferrer">
              Abrir en Notion <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 4: Visual verify**

Navigate to `/tareas`, click a task card → drawer opens with details + blocks + "Open in Notion" button. Close → returns to Kanban.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(kanban): task detail drawer with Notion blocks renderer"
```

---

## Phase 9 — Meetings

### Task 9.1: Meetings page

**Files:**
- Create: `app/(app)/reuniones/page.tsx`, `components/meetings/hero-meeting.tsx`, `agenda-list.tsx`, `history-panel.tsx`, `action-items.tsx`

- [ ] **Step 1: Route + data**

Create `app/(app)/reuniones/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryMeetingsByClient } from '@/lib/notion/meetings';
import { getBlocks } from '@/lib/notion/blocks';
import { HeroMeeting } from '@/components/meetings/hero-meeting';
import { HistoryPanel } from '@/components/meetings/history-panel';

export const dynamic = 'force-dynamic';

export default async function ReunionesPage() {
  const ctx = await requireContext();
  const meetings = await queryMeetingsByClient(ctx.clientId);

  const now = Date.now();
  const current = meetings.find((m) => m.date && new Date(m.date).getTime() >= now - 24 * 3600_000) ?? meetings[0];
  const blocks = current ? await getBlocks(current.id) : [];

  return (
    <>
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: current?.title ?? 'Sin reuniones', muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7 pb-12">
          {current ? <HeroMeeting meeting={current} blocks={blocks} /> : <p className="text-muted-foreground">Este cliente no tiene reuniones registradas todavía.</p>}
        </div>
        <HistoryPanel meetings={meetings} currentId={current?.id} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: HeroMeeting**

Create `components/meetings/hero-meeting.tsx` — structure per `reuniones-v2.html` mockup:
- Hero card with live badge (if `now` ∈ [start, end]), title, metadata row (time, place, recurrence, facilitator), actions (Unirse/Abrir en Notion), attendee stack
- Render Notion blocks under "Agenda" section
- "Action items" section: render tasks linked via `actionItemIds` (fetch them with `Promise.all(ids.map(getTask))`)

- [ ] **Step 3: HistoryPanel**

Create `components/meetings/history-panel.tsx`:

```tsx
import Link from 'next/link';
import type { Meeting } from '@/schemas/meeting';
import { cn } from '@/lib/utils';
import { getISOWeek, getISOWeekYear, format, parseISO } from 'date-fns';

export function HistoryPanel({ meetings, currentId }: { meetings: Meeting[]; currentId?: string }) {
  return (
    <aside className="border-l border-border bg-[#f7f7f8] overflow-auto p-5">
      <h3 className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-3 px-1.5">Historial</h3>
      {meetings.map((m) => {
        const active = m.id === currentId;
        const d = m.date ? parseISO(m.date) : null;
        const week = d ? `W${getISOWeek(d)}` : '';
        return (
          <Link
            key={m.id}
            href={`/reuniones/${m.id}`}
            className={cn(
              'block p-3 rounded-md cursor-pointer mb-1 border border-transparent hover:bg-white hover:border-border',
              active && 'bg-white border-[#c9cbe8] shadow-sm',
            )}
          >
            <div className={cn('text-[11px] uppercase font-medium tracking-wider mb-1', active ? 'text-[#5e6ad2]' : 'text-muted-foreground')}>
              {d && format(d, 'MMM d')} · Sem {week.slice(1)}
            </div>
            <div className="text-[12px] font-medium leading-tight">{m.title}</div>
          </Link>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 4: Past meeting page**

Create `app/(app)/reuniones/[meetingId]/page.tsx` — similar to the main `reuniones/page.tsx` but scoped to the specific id (no "current" logic, just render that meeting).

- [ ] **Step 5: Visual verify**

Navigate to `/reuniones`. Confirm hero + history panel render, click a past meeting, detail updates.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(meetings): weekly meeting hero + history panel with Notion blocks"
```

---

## Phase 10 — Wiki

### Task 10.1: Wiki tree + page renderer

**Files:**
- Create: `app/(app)/wiki/page.tsx`, `app/(app)/wiki/[pageId]/page.tsx`, `components/wiki/tree.tsx`, `components/wiki/page-view.tsx`

- [ ] **Step 1: Tree component**

Create `components/wiki/tree.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WikiPage } from '@/schemas/wiki';

type Node = WikiPage & { children: Node[] };

function buildTree(pages: WikiPage[]): Node[] {
  const byId = new Map<string, Node>();
  pages.forEach((p) => byId.set(p.id, { ...p, children: [] }));

  const roots: Node[] = [];
  pages.forEach((p) => {
    const n = byId.get(p.id)!;
    if (p.parentId && byId.has(p.parentId)) byId.get(p.parentId)!.children.push(n);
    else roots.push(n);
  });
  return roots;
}

function TreeNode({ node, level = 0 }: { node: Node; level?: number }) {
  const [open, setOpen] = useState(true);
  const pathname = usePathname();
  const active = pathname === `/wiki/${node.id}`;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div className={cn(
        'flex items-center gap-1 px-1.5 py-1 rounded-md text-[13px] text-muted-foreground hover:bg-black/[0.04] hover:text-foreground',
        active && 'bg-white text-foreground font-medium border border-border shadow-sm',
      )}>
        {hasChildren ? (
          <button onClick={() => setOpen((o) => !o)} className="w-3.5 h-3.5 text-muted-foreground shrink-0">
            <ChevronRight className={cn('w-2.5 h-2.5 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="w-3.5 h-3.5 shrink-0" />
        )}
        <Link href={`/wiki/${node.id}`} className="flex-1 flex items-center gap-2 min-w-0">
          <span className="text-[13px] w-4 shrink-0">{node.icon ?? '📄'}</span>
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {hasChildren && open && (
        <div className="ml-[18px]">
          {node.children.map((c) => <TreeNode key={c.id} node={c} level={level + 1} />)}
        </div>
      )}
    </div>
  );
}

export function WikiTree({ pages }: { pages: WikiPage[] }) {
  const [q, setQ] = useState('');
  const filtered = q.length > 0 ? pages.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())) : pages;
  const tree = buildTree(filtered);

  return (
    <aside className="border-r border-border bg-[#f7f7f8] overflow-auto p-2">
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-border rounded-md mb-2.5">
        <Search className="w-3 h-3 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar en wiki..."
          className="flex-1 bg-transparent border-none outline-none text-[12px]"
        />
      </div>
      {tree.map((n) => <TreeNode key={n.id} node={n} />)}
    </aside>
  );
}
```

- [ ] **Step 2: Wiki index page**

Create `app/(app)/wiki/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByClient } from '@/lib/notion/wiki';
import { WikiTree } from '@/components/wiki/tree';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WikiIndexPage() {
  const ctx = await requireContext();
  const pages = await queryWikiByClient(ctx.clientId);

  if (pages.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Wiki' }]} />
        <div className="p-10 text-muted-foreground">Tu proyecto aún no tiene páginas de wiki.</div>
      </>
    );
  }

  // Auto-redirect to first root page
  const firstRoot = pages.find((p) => !p.parentId) ?? pages[0];
  redirect(`/wiki/${firstRoot.id}`);
}
```

- [ ] **Step 3: Wiki page view**

Create `app/(app)/wiki/[pageId]/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByClient, getWikiPageBlocks } from '@/lib/notion/wiki';
import { WikiTree } from '@/components/wiki/tree';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WikiPageView({ params }: { params: Promise<{ pageId: string }> }) {
  const ctx = await requireContext();
  const { pageId } = await params;

  const [pages, blocks] = await Promise.all([
    queryWikiByClient(ctx.clientId),
    getWikiPageBlocks(pageId),
  ]);

  const page = pages.find((p) => p.id === pageId);
  if (!page) notFound();

  const parent = page.parentId ? pages.find((p) => p.id === page.parentId) : null;

  return (
    <>
      <Topbar crumbs={[
        { label: 'Wiki' },
        ...(parent ? [{ label: parent.title, muted: true }] : []),
        { label: page.title },
      ]}>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
          <Info className="w-3 h-3" /> Solo lectura
        </span>
      </Topbar>

      <div className="flex-1 grid grid-cols-[260px_1fr] overflow-hidden">
        <WikiTree pages={pages} />
        <div className="overflow-auto">
          {page.cover && <div className="h-[180px] bg-gradient-to-br from-[#5e6ad2] via-[#7c5fd0] to-[#c78a2c]" style={{ backgroundImage: page.cover ? `url(${page.cover})` : undefined, backgroundSize: 'cover' }} />}
          <article className="px-16 pt-0 pb-20 max-w-[800px] mx-auto">
            <div className="text-[60px] mt-[-48px] relative leading-none mb-4">{page.icon ?? '📄'}</div>
            <h1 className="text-[34px] font-bold tracking-tight leading-[1.15] mb-5">{page.title}</h1>
            <BlocksRenderer blocks={blocks} />
          </article>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Visual verify**

Navigate to `/wiki`. Redirects to first page. Tree shows nested structure. Click between pages.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(wiki): tree + page renderer with Notion blocks (read-only)"
```

---

## Phase 11 — Projects

### Task 11.1: Projects grid page

**Files:**
- Create: `app/(app)/proyectos/page.tsx`, `components/projects/project-card.tsx`

- [ ] **Step 1: Project card**

Create `components/projects/project-card.tsx`:

```tsx
import type { Project } from '@/schemas/project';
import { cn } from '@/lib/utils';

const STATUS_MAP: Record<string, { bg: string; text: string; dot: string }> = {
  'On track': { bg: 'bg-[#e8f5ec]', text: 'text-[#3f9f5c]', dot: 'bg-[#3f9f5c]' },
  'At risk': { bg: 'bg-[#faf0db]', text: 'text-[#c78a2c]', dot: 'bg-[#c78a2c]' },
  'Blocked': { bg: 'bg-[#fceaea]', text: 'text-[#d24949]', dot: 'bg-[#d24949]' },
  'Done': { bg: 'bg-[#f7f7f8]', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Planning': { bg: 'bg-[#eeeffc]', text: 'text-[#5e6ad2]', dot: 'bg-[#5e6ad2]' },
};

const ACCENTS = ['from-[#5e6ad2] to-[#7c5fd0]', 'from-[#c78a2c] to-[#d24949]', 'from-[#3f9f5c] to-[#6da88e]', 'from-[#8ba1d9] to-[#a07ac9]'];

export function ProjectCard({ project, accentIndex }: { project: Project; accentIndex: number }) {
  const s = project.status ? STATUS_MAP[project.status] : null;
  const accent = ACCENTS[accentIndex % ACCENTS.length];

  return (
    <a href={project.url} target="_blank" rel="noreferrer" className="relative rounded-xl border border-border p-4 bg-white hover:shadow-sm hover:border-border-strong transition-all block overflow-hidden">
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', accent)} />
      <div className="flex items-start gap-2.5 mb-2">
        <div className="w-7 h-7 rounded-md bg-[#eeeffc] text-[#5e6ad2] grid place-items-center text-[14px] shrink-0">{project.icon ?? '📁'}</div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold tracking-tight truncate">{project.name}</div>
        </div>
        {s && (
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0', s.bg, s.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            {project.status}
          </span>
        )}
      </div>
      {project.description && <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2 min-h-[36px]">{project.description}</p>}
      {typeof project.progress === 'number' && (
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Avance</span>
          <div className="flex-1 h-1 bg-[#f7f7f8] rounded overflow-hidden">
            <div className="h-full bg-[#5e6ad2] rounded" style={{ width: `${project.progress}%` }} />
          </div>
          <span className="text-[12px] font-semibold text-foreground min-w-[32px] text-right">{project.progress}%</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-3 border-t border-dashed border-border text-[11px] text-muted-foreground">
        <span>{project.teamIds.length} · equipo</span>
        {project.deadline && <span>📅 {new Date(project.deadline).toLocaleDateString('es', { month: 'short', year: '2-digit' })}</span>}
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Page**

Create `app/(app)/proyectos/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryProjectsByClient } from '@/lib/notion/projects';
import { ProjectCard } from '@/components/projects/project-card';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const ctx = await requireContext();
  const projects = await queryProjectsByClient(ctx.clientId);

  return (
    <>
      <Topbar crumbs={[{ label: 'Proyectos' }]} />
      <div className="flex-1 overflow-auto p-10 max-w-[1100px] mx-auto w-full">
        <div className="flex items-center gap-2.5 mb-5">
          <h1 className="text-[20px] font-semibold tracking-tight">Proyectos</h1>
          <span className="text-[12px] text-muted-foreground">{projects.length} en total</span>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {projects.map((p, i) => <ProjectCard key={p.id} project={p} accentIndex={i} />)}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Visual verify**

Navigate to `/proyectos`. Confirm grid renders.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(projects): grid page with status pills and progress bars"
```

---

## Phase 12 — Polish & Error States

### Task 12.1: Loading states (Suspense + skeletons)

**Files:**
- Create: `app/(app)/tareas/loading.tsx`, `app/(app)/reuniones/loading.tsx`, `app/(app)/wiki/loading.tsx`, `app/(app)/proyectos/loading.tsx`, `app/(app)/loading.tsx`

- [ ] **Step 1: Generic skeleton for pages**

Create `app/(app)/tareas/loading.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }]} />
      <div className="flex-1 grid grid-cols-4 gap-2.5 p-5 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-[#fafafa] border border-border rounded-lg p-3 space-y-2">
            <Skeleton className="h-3 w-24" />
            {[0, 1, 2].map((j) => <Skeleton key={j} className="h-16 w-full" />)}
          </div>
        ))}
      </div>
    </>
  );
}
```

Repeat the pattern for other pages — keep them minimal (skeletons for the shape).

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)
git commit -m "feat(ui): loading skeletons for all app routes"
```

---

### Task 12.2: Error boundaries

**Files:**
- Create: `app/(app)/error.tsx`, `app/global-error.tsx`

- [ ] **Step 1: App error boundary**

Create `app/(app)/error.tsx`:

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-10">
      <div className="text-center space-y-3 max-w-md">
        <AlertCircle className="w-8 h-8 mx-auto text-[#d24949]" />
        <h2 className="text-lg font-semibold">Algo falló al cargar los datos</h2>
        <p className="text-sm text-muted-foreground">{error.message || 'Error inesperado.'}</p>
        <Button variant="outline" onClick={reset}>Reintentar</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Global error boundary**

Create `app/global-error.tsx`:

```tsx
'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen grid place-items-center p-10">
          <div className="text-center">
            <h1>Algo salió mal</h1>
            <p>{error.message}</p>
            <button onClick={reset}>Recargar</button>
          </div>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/error.tsx app/global-error.tsx
git commit -m "feat(ui): error boundaries for app and global"
```

---

### Task 12.3: Responsive pass (mobile sidebar)

**Files:**
- Modify: `app/(app)/layout.tsx`, `components/shell/sidebar.tsx`

- [ ] **Step 1: Introduce mobile toggle**

Add state to show/hide the sidebar on mobile using `Sheet` from shadcn. On `<md` the sidebar is hidden by default, and the topbar shows a menu button that opens it as a drawer.

Wrap the sidebar in a component that conditionally renders either inline (desktop) or inside a Sheet (mobile). Check viewport with `window.matchMedia` in a `useEffect` on a new client wrapper.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): responsive sidebar with mobile drawer"
```

---

## Phase 13 — Deploy

### Task 13.1: Vercel config and deploy

**Files:**
- Create: `vercel.json` (optional, only if needed for rewrites)

- [ ] **Step 1: Build verification**

```bash
npm run build
```

Expected: clean build, no TypeScript errors, no missing env var warnings. If any env-related errors, confirm `.env.local` is populated.

- [ ] **Step 2: Initialize Vercel project**

```bash
npx vercel
```

Follow prompts:
- Link to existing project: No
- Project name: `notion-hub` (or custom)
- Directory: `.`
- Override build settings: No

- [ ] **Step 3: Set production env vars**

Copy each key from `.env.local` to Vercel:

```bash
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add NOTION_API_KEY production
npx vercel env add NOTION_DB_TEAM production
npx vercel env add NOTION_DB_CLIENTS production
npx vercel env add NOTION_DB_PROJECTS production
npx vercel env add NOTION_DB_TASKS production
npx vercel env add NOTION_DB_MEETINGS production
npx vercel env add NOTION_DB_WIKI production
npx vercel env add NEXT_PUBLIC_APP_URL production
```

For `NEXT_PUBLIC_APP_URL`, use the Vercel deployment URL (or your custom domain).

- [ ] **Step 4: Deploy to production**

```bash
npx vercel --prod
```

- [ ] **Step 5: Configure Supabase redirect URL**

In Supabase dashboard → Authentication → URL Configuration — add the production domain to "Redirect URLs":

```
https://your-domain.vercel.app/auth/callback
```

- [ ] **Step 6: Smoke test in production**

- Open the deployed URL
- Click login, submit your real email
- Click magic link → redirects to `/`
- Sidebar shows your client name
- Navigate Tareas → see Kanban
- Drag a card → change persists in Notion
- Navigate Reuniones → see hero
- Navigate Wiki → see tree
- Navigate Proyectos → see grid

If any step fails, check Vercel logs: `npx vercel logs <deployment-url>`.

- [ ] **Step 7: Commit Vercel config (if any)**

```bash
git add vercel.json
git commit -m "chore: Vercel deploy config"
```

---

## Phase 14 — Final Verification

### Task 14.1: End-to-end manual QA checklist

- [ ] **Test 1: Unauthorized email**
  - Log out. Log in with an email that does NOT exist in your Notion Team DB.
  - Expected: redirected to `/no-access` with clear message.

- [ ] **Test 2: Valid member**
  - Log in with a member email.
  - Expected: Home renders with their client name in sidebar.

- [ ] **Test 3: Data scoping**
  - Add a task in Notion assigned to a DIFFERENT client.
  - Confirm the logged-in member does NOT see it on their Kanban.

- [ ] **Test 4: Drag & drop round-trip**
  - Drag a task from "Por hacer" to "Hecho".
  - Confirm the task appears in Notion (your browser, as the PM) with status "Hecho" within 2 seconds.
  - Reload the Hub page — the task should remain in "Hecho".

- [ ] **Test 5: Optimistic revert**
  - Chrome DevTools → Network → Throttling: Offline.
  - Drag a task.
  - Expected: card returns to original column + red toast "No se pudo mover la tarea."

- [ ] **Test 6: Cycle navigation**
  - On Kanban, click ‹ to go to previous week. Tasks load for that cycle. URL reflects `?cycle=2026-W16`.

- [ ] **Test 7: Secret hygiene (CRITICAL)**
  - Open the Vercel production site.
  - DevTools → Sources. Search the bundled JS for `ntn_` (the Notion API key prefix).
  - Expected: **zero matches**. The Notion key MUST NOT appear in any client bundle.

- [ ] **Test 8: Task drawer deep-link**
  - Copy URL of a task drawer (`/tareas/{uuid}`). Open in new tab.
  - Expected: page loads with drawer open. Closing drawer navigates to `/tareas`.

- [ ] **Test 9: Wiki navigation**
  - Click through wiki tree. Nested pages expand. Page content renders (headings, paragraphs, callouts, tables if any).

- [ ] **Test 10: Meeting action items link to Kanban**
  - Open `/reuniones`. If current meeting has action items, click a task chip → navigates to `/tareas/{id}` drawer.

---

## Self-Review Checklist (done during planning)

- [x] **Spec coverage:** All 23 sections of the spec map to tasks:
  - Problem/Goals/Stack → Phase 0
  - Auth (email → client) → Phase 2 + 3
  - Notion service layer → Phase 1
  - Shell (sidebar/topbar) → Phase 4
  - Home / Kanban / Drawer / Meetings / Wiki / Projects → Phases 5-11
  - Error/loading/responsive → Phase 12
  - Deploy → Phase 13
  - QA → Phase 14
  - `/admin` is intentionally deferred (spec §18 Rollout v1.5)
- [x] **Placeholder scan:** No TBDs or "implement later" remain.
- [x] **Type consistency:** `TaskStatus`, `TaskPriority`, `AppContext`, `Task`, `Meeting`, `Project`, `WikiPage`, `TeamMember` names match across tasks.
- [x] **Cycle strings:** Format `YYYY-Www` used consistently (`2026-W17`).
- [x] **Route contracts:** `PATCH /api/tasks/:id/status` appears in spec §11 and Phase 7.
- [x] **Env var list:** Matches `.env.example` in Task 0.5 and spec §21.

---

**Plan complete.** Total phases: 14 · Estimated tasks: ~60 steps organized by commit-sized chunks.
