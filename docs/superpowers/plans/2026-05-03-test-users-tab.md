# Test Users Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only "Usuarios de prueba" page to the Notion Hub that surfaces credentials from a Notion DB, scoped per customer, with copy-to-clipboard + show/hide for sensitive fields.

**Architecture:** Server component fetches credentials from Notion via the existing `dataSources.query` pattern (same as `lib/notion/wiki.ts`). UI is a 2-column card grid; each card renders 3 reusable `CredentialField` client components (Usuario / Clave / URL). Clave is masked by default with a 30 s auto-hide on reveal. Sidebar gets a new "Recursos" group with a single `NavItem` for `/usuarios-de-prueba`.

**Tech Stack:** Next.js 16 App Router · React 19 · Notion SDK v5 (`@notionhq/client`) · Zod · Tailwind v4 · Sonner toasts · Vitest + React Testing Library · lucide-react.

**Spec:** `docs/superpowers/specs/2026-05-03-test-users-tab-design.md`

---

## File Structure

**New files:**
- `schemas/test-user.ts` — Zod schema + `TestUser` type
- `lib/notion/test-users.ts` — `queryTestUsersByCustomer(customerId)` (cached server fn)
- `lib/notion/__tests__/test-users.test.ts` — vitest spec for the query / parser
- `components/test-users/credential-field.tsx` — client component (reveal/copy)
- `components/test-users/test-user-card.tsx` — server component (composition only)
- `components/test-users/test-user-grid.tsx` — server component (grid + empty state)
- `components/test-users/__tests__/credential-field.test.tsx` — RTL spec
- `app/(app)/usuarios-de-prueba/page.tsx` — entry route
- `app/(app)/usuarios-de-prueba/loading.tsx` — skeleton
- `app/(app)/usuarios-de-prueba/error.tsx` — re-export of root error

**Modified files:**
- `lib/env.ts` — add `NOTION_DB_TEST_USERS` to `serverEnvSchema`
- `.env.local` — add `NOTION_DB_TEST_USERS=b2dc5a7a-bb49-4450-b7ed-6b760511f1a6`
- `components/shell/sidebar.tsx` — add "Recursos" group with new `NavItem`

---

### Task 1: Add `NOTION_DB_TEST_USERS` to env config

**Files:**
- Modify: `lib/env.ts:8-14`
- Modify: `.env.local`

- [ ] **Step 1: Add env var to local env file**

Append to `.env.local`:

```
NOTION_DB_TEST_USERS=b2dc5a7a-bb49-4450-b7ed-6b760511f1a6
```

(This is the **data source ID**, not the database ID. Same pattern as `NOTION_DB_WIKI` in this codebase — Notion SDK v5 uses dataSources for queries.)

- [ ] **Step 2: Add schema entry**

Modify `lib/env.ts` — inside `serverEnvSchema = z.object({ ... })`, add a new line right after `NOTION_DB_SPRINTS`:

```ts
  NOTION_DB_SPRINTS: z.string().min(10),
  NOTION_DB_TEST_USERS: z.string().min(10),
  NEXT_PUBLIC_APP_URL: z.string().url(),
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/env.ts .env.local
git commit -m "feat(env): add NOTION_DB_TEST_USERS data source id"
```

---

### Task 2: Define Zod schema + TestUser type

**Files:**
- Create: `schemas/test-user.ts`

- [ ] **Step 1: Create the schema file**

Write `schemas/test-user.ts`:

```ts
import { z } from 'zod';

export const testUserSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  usuario: z.string(),
  clave: z.string(),
  url: z.string().url().nullable(),
  customerIds: z.array(z.string()),
  teamIds: z.array(z.string()),
  lastEditedAt: z.string(),
});
export type TestUser = z.infer<typeof testUserSchema>;
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add schemas/test-user.ts
git commit -m "feat(schemas): add testUserSchema"
```

---

### Task 3: Write failing test for `queryTestUsersByCustomer`

**Files:**
- Create: `lib/notion/__tests__/test-users.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/notion/__tests__/test-users.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/notion/client', () => ({ getNotion: () => mockNotion }));
vi.mock('@/lib/env', () => ({
  serverEnv: { NOTION_DB_TEST_USERS: 'ds-test-users' },
}));

const mockNotion = {
  dataSources: {
    query: vi.fn(),
  },
};

import { queryTestUsersByCustomer } from '../test-users';

describe('queryTestUsersByCustomer', () => {
  beforeEach(() => {
    mockNotion.dataSources.query.mockReset();
  });

  it('queries the test-users data source filtering by customer relation', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({ results: [] });

    await queryTestUsersByCustomer('customer-abc');

    expect(mockNotion.dataSources.query).toHaveBeenCalledWith({
      data_source_id: 'ds-test-users',
      filter: { property: 'Customers', relation: { contains: 'customer-abc' } },
      sorts: [{ property: 'Nombre', direction: 'ascending' }],
    });
  });

  it('parses a row into TestUser shape', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'page-1',
          last_edited_time: '2026-05-03T12:00:00Z',
          properties: {
            Nombre: { title: [{ plain_text: 'Usuario de Prueba 1' }] },
            Usuario: { rich_text: [{ plain_text: 'cliente@demo.com' }] },
            Clave: { rich_text: [{ plain_text: 's3cret' }] },
            URL: { url: 'https://staging.app.com' },
            Customers: { relation: [{ id: 'customer-abc' }] },
            Team: { relation: [{ id: 'team-1' }] },
          },
        },
      ],
    });

    const out = await queryTestUsersByCustomer('customer-abc');

    expect(out).toEqual([
      {
        id: 'page-1',
        nombre: 'Usuario de Prueba 1',
        usuario: 'cliente@demo.com',
        clave: 's3cret',
        url: 'https://staging.app.com',
        customerIds: ['customer-abc'],
        teamIds: ['team-1'],
        lastEditedAt: '2026-05-03T12:00:00Z',
      },
    ]);
  });

  it('falls back to empty strings and null url when fields missing', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [
        {
          id: 'page-2',
          last_edited_time: '2026-05-03T12:00:00Z',
          properties: {
            Nombre: { title: [] },
            Usuario: { rich_text: [] },
            Clave: { rich_text: [] },
            URL: { url: null },
            Customers: { relation: [] },
            Team: { relation: [] },
          },
        },
      ],
    });

    const out = await queryTestUsersByCustomer('customer-abc');

    expect(out[0]).toMatchObject({
      nombre: 'Sin nombre',
      usuario: '',
      clave: '',
      url: null,
      customerIds: [],
      teamIds: [],
    });
  });

  it('skips results without properties (partial responses)', async () => {
    mockNotion.dataSources.query.mockResolvedValueOnce({
      results: [{ id: 'partial-1' }],
    });

    const out = await queryTestUsersByCustomer('customer-abc');
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/notion/__tests__/test-users.test.ts`
Expected: FAIL — `Cannot find module '../test-users'` (file not yet created).

---

### Task 4: Implement `lib/notion/test-users.ts`

**Files:**
- Create: `lib/notion/test-users.ts`

- [ ] **Step 1: Write the implementation**

Create `lib/notion/test-users.ts`:

```ts
import { cache } from 'react';
import { getNotion } from './client';
import { serverEnv } from '@/lib/env';
import { testUserSchema, type TestUser } from '@/schemas/test-user';

function parseTestUser(row: any): TestUser {
  const p = row.properties as Record<string, any>;
  return testUserSchema.parse({
    id: row.id,
    nombre: p['Nombre']?.title?.[0]?.plain_text ?? 'Sin nombre',
    usuario:
      (p['Usuario']?.rich_text ?? []).map((r: any) => r.plain_text).join('') ?? '',
    clave:
      (p['Clave']?.rich_text ?? []).map((r: any) => r.plain_text).join('') ?? '',
    url: p['URL']?.url ?? null,
    customerIds: (p['Customers']?.relation ?? []).map((r: { id: string }) => r.id),
    teamIds: (p['Team']?.relation ?? []).map((r: { id: string }) => r.id),
    lastEditedAt: row.last_edited_time,
  });
}

export const queryTestUsersByCustomer = cache(
  async (customerId: string): Promise<TestUser[]> => {
    const notion = getNotion();
    const res = await notion.dataSources.query({
      data_source_id: serverEnv.NOTION_DB_TEST_USERS,
      filter: { property: 'Customers', relation: { contains: customerId } },
      sorts: [{ property: 'Nombre', direction: 'ascending' }],
    });
    return res.results
      .filter((r): r is any => 'properties' in r)
      .map(parseTestUser);
  },
);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run lib/notion/__tests__/test-users.test.ts`
Expected: PASS — 4 tests passing.

- [ ] **Step 3: Commit**

```bash
git add lib/notion/test-users.ts lib/notion/__tests__/test-users.test.ts
git commit -m "feat(notion): query test-users data source scoped by customer"
```

---

### Task 5: Write failing tests for `CredentialField`

**Files:**
- Create: `components/test-users/__tests__/credential-field.test.tsx`

- [ ] **Step 1: Write the failing test file**

Create `components/test-users/__tests__/credential-field.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CredentialField } from '../credential-field';

const writeTextMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  writeTextMock.mockClear();
  Object.assign(navigator, {
    clipboard: { writeText: writeTextMock },
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CredentialField', () => {
  it('text type: renders value plain and copies on click', async () => {
    render(<CredentialField label="Usuario" value="cliente@demo.com" type="text" />);
    expect(screen.getByText('cliente@demo.com')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /copiar usuario/i }));

    expect(writeTextMock).toHaveBeenCalledWith('cliente@demo.com');
  });

  it('password type: masks value with 8 bullets and reveals on toggle', () => {
    render(<CredentialField label="Clave" value="s3cret-very-long" type="password" />);

    expect(screen.getByText('••••••••')).toBeInTheDocument();
    expect(screen.queryByText('s3cret-very-long')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /mostrar clave/i }));

    expect(screen.getByText('s3cret-very-long')).toBeInTheDocument();
    expect(screen.queryByText('••••••••')).not.toBeInTheDocument();
  });

  it('password type: auto-hides 30 seconds after reveal', () => {
    vi.useFakeTimers();
    render(<CredentialField label="Clave" value="s3cret" type="password" />);

    fireEvent.click(screen.getByRole('button', { name: /mostrar clave/i }));
    expect(screen.getByText('s3cret')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.queryByText('s3cret')).not.toBeInTheDocument();
    expect(screen.getByText('••••••••')).toBeInTheDocument();
  });

  it('password type: copy works while masked and copies real value', () => {
    render(<CredentialField label="Clave" value="s3cret" type="password" />);
    fireEvent.click(screen.getByRole('button', { name: /copiar clave/i }));
    expect(writeTextMock).toHaveBeenCalledWith('s3cret');
  });

  it('url type: renders external link with rel/noopener', () => {
    render(
      <CredentialField label="URL" value="https://staging.app.com" type="url" />,
    );
    const link = screen.getByRole('link', { name: /staging\.app\.com/i });
    expect(link).toHaveAttribute('href', 'https://staging.app.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run components/test-users/__tests__/credential-field.test.tsx`
Expected: FAIL — `Cannot find module '../credential-field'`.

---

### Task 6: Implement `CredentialField`

**Files:**
- Create: `components/test-users/credential-field.tsx`

- [ ] **Step 1: Write the implementation**

Create `components/test-users/credential-field.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MASK = '••••••••';
const AUTO_HIDE_MS = 30_000;

type Props = {
  label: 'Usuario' | 'Clave' | 'URL';
  value: string;
  type: 'text' | 'password' | 'url';
};

export function CredentialField({ label, value, type }: Props) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!revealed) return;
    timerRef.current = setTimeout(() => setRevealed(false), AUTO_HIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [revealed]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label === 'Clave' ? 'Clave copiada' : 'Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const display =
    type === 'password' && !revealed ? MASK : value || (type === 'url' ? '—' : '');

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-[#f7f7f8] border border-[#ececef] rounded-md text-[13px]">
      <span className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium w-[60px] shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'flex-1 truncate text-foreground',
          type !== 'url' && 'font-mono text-[12.5px]',
        )}
      >
        {type === 'url' && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] hover:underline"
          >
            {stripProtocol(value)}
          </a>
        ) : (
          display
        )}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ocultar clave' : 'Mostrar clave'}
            className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        {type === 'url' && value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir URL"
            className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copiar ${label.toLowerCase()}`}
          className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  );
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npx vitest run components/test-users/__tests__/credential-field.test.tsx`
Expected: PASS — 5 tests passing.

- [ ] **Step 3: Commit**

```bash
git add components/test-users/credential-field.tsx components/test-users/__tests__/credential-field.test.tsx
git commit -m "feat(test-users): credential field with reveal/copy/auto-hide"
```

---

### Task 7: Build `TestUserCard` (composition only)

**Files:**
- Create: `components/test-users/test-user-card.tsx`

- [ ] **Step 1: Write the component**

Create `components/test-users/test-user-card.tsx`:

```tsx
import type { TestUser } from '@/schemas/test-user';
import { CredentialField } from './credential-field';

type Props = { user: TestUser };

export function TestUserCard({ user }: Props) {
  return (
    <article className="bg-white border border-border rounded-[10px] p-4 space-y-3">
      <header>
        <h3 className="text-[14px] font-semibold text-foreground leading-tight">
          {user.nombre}
        </h3>
        {user.usuario && (
          <p className="text-[12px] text-muted-foreground mt-0.5 truncate">
            {user.usuario}
          </p>
        )}
      </header>
      <div className="space-y-2">
        {user.usuario && (
          <CredentialField label="Usuario" value={user.usuario} type="text" />
        )}
        <CredentialField label="Clave" value={user.clave} type="password" />
        {user.url && <CredentialField label="URL" value={user.url} type="url" />}
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/test-users/test-user-card.tsx
git commit -m "feat(test-users): card composing credential fields"
```

---

### Task 8: Build `TestUserGrid` with empty state

**Files:**
- Create: `components/test-users/test-user-grid.tsx`

- [ ] **Step 1: Write the component**

Create `components/test-users/test-user-grid.tsx`:

```tsx
import type { TestUser } from '@/schemas/test-user';
import { EmptyState } from '@/components/common/empty-state';
import { TestUserCard } from './test-user-card';

const NOTION_DB_URL =
  'https://www.notion.so/recordarte/29d0e14cc87443a7a7639460dfdd9f73';

type Props = {
  users: TestUser[];
  customerName: string;
};

export function TestUserGrid({ users, customerName }: Props) {
  if (users.length === 0) {
    return (
      <EmptyState
        icon="🔑"
        title="Sin usuarios de prueba"
        description={`Aún no hay credenciales para ${customerName}. Agrégalas desde Notion.`}
        action={
          <a
            href={NOTION_DB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#2563eb] hover:underline"
          >
            Abrir en Notion ↗
          </a>
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {users.map((user) => (
        <TestUserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add components/test-users/test-user-grid.tsx
git commit -m "feat(test-users): grid with empty state link to Notion"
```

---

### Task 9: Create the route — `page.tsx`

**Files:**
- Create: `app/(app)/usuarios-de-prueba/page.tsx`

- [ ] **Step 1: Write the page**

Create `app/(app)/usuarios-de-prueba/page.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTestUsersByCustomer } from '@/lib/notion/test-users';
import { TestUserGrid } from '@/components/test-users/test-user-grid';

export const dynamic = 'force-dynamic';

export default async function TestUsersPage() {
  const ctx = await requireContext();
  const users = await queryTestUsersByCustomer(ctx.customerId);

  return (
    <>
      <Topbar crumbs={[{ label: 'Usuarios de prueba' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[900px] mx-auto w-full">
          <header className="mb-5">
            <h1 className="text-[18px] font-semibold tracking-tight">
              Usuarios de prueba
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Credenciales compartidas para entornos de QA y staging.
            </p>
          </header>
          <TestUserGrid users={users} customerName={ctx.customerName} />
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

---

### Task 10: Add `loading.tsx`

**Files:**
- Create: `app/(app)/usuarios-de-prueba/loading.tsx`

- [ ] **Step 1: Write the skeleton**

Create `app/(app)/usuarios-de-prueba/loading.tsx`:

```tsx
import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Usuarios de prueba' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[900px] mx-auto w-full">
          <div className="mb-5 space-y-1.5">
            <div className="h-5 w-44 bg-[#f4f4f5] rounded animate-pulse" />
            <div className="h-3 w-72 bg-[#f4f4f5] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-[10px] p-4 space-y-3"
              >
                <div className="h-4 w-40 bg-[#f4f4f5] rounded animate-pulse" />
                <div className="h-3 w-32 bg-[#f4f4f5] rounded animate-pulse" />
                <div className="space-y-2 pt-1">
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
```

---

### Task 11: Add `error.tsx`

**Files:**
- Create: `app/(app)/usuarios-de-prueba/error.tsx`

- [ ] **Step 1: Re-export the existing app-level error**

The existing `app/(app)/error.tsx` already provides a "No pudimos cargar esta sección" boundary with a Reintentar button — perfect for this page. Next.js error boundaries are not inherited at deeper segments, so we must re-export it.

Create `app/(app)/usuarios-de-prueba/error.tsx`:

```tsx
'use client';

export { default } from '../error';
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Commit page + loading + error together**

```bash
git add app/\(app\)/usuarios-de-prueba/
git commit -m "feat(usuarios-de-prueba): page + loading skeleton + error boundary"
```

---

### Task 12: Wire sidebar — new "Recursos" group

**Files:**
- Modify: `components/shell/sidebar.tsx:7,17-64`

- [ ] **Step 1: Update icon import**

In `components/shell/sidebar.tsx`, change the `lucide-react` import (line 7) from:

```ts
import { Home, CheckSquare, Calendar, BookOpen, FolderKanban } from 'lucide-react';
```

to:

```ts
import { Home, CheckSquare, Calendar, BookOpen, FolderKanban, Key } from 'lucide-react';
```

- [ ] **Step 2: Add the "Recursos" group**

In `components/shell/sidebar.tsx`, locate the closing `</div>` of the "Workspace" `div` block (around line 53) — it ends right before `</LayoutGroup>`. Insert a new sibling block right after the Workspace `</div>`:

```tsx
        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            Recursos
          </div>
          <NavItem
            href="/usuarios-de-prueba"
            icon={<Key className="w-3.5 h-3.5" />}
          >
            Usuarios de prueba
          </NavItem>
        </div>
```

The result of the `<LayoutGroup>` body should look like:

```tsx
      <LayoutGroup id={groupId}>
        <div className="pb-3">
          <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />} exact>
            Home
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            Workspace
          </div>
          <NavItem href="/tareas" icon={<CheckSquare className="w-3.5 h-3.5" />}>
            Tareas
          </NavItem>
          <NavItem href="/reuniones" icon={<Calendar className="w-3.5 h-3.5" />}>
            Reuniones
          </NavItem>
          <NavItem href="/wiki" icon={<BookOpen className="w-3.5 h-3.5" />}>
            Wiki
          </NavItem>
          <NavItem href="/proyectos" icon={<FolderKanban className="w-3.5 h-3.5" />}>
            Proyectos
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            Recursos
          </div>
          <NavItem
            href="/usuarios-de-prueba"
            icon={<Key className="w-3.5 h-3.5" />}
          >
            Usuarios de prueba
          </NavItem>
        </div>
      </LayoutGroup>
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "feat(shell): 🧭 Recursos group with Usuarios de prueba nav"
```

---

### Task 13: Run the full test suite + smoke check

**Files:** none (verification only)

- [ ] **Step 1: Run all tests**

Run: `npm run test:run`
Expected: PASS — all suites green, including the 4 new test-users.test.ts cases and the 5 new credential-field.test.tsx cases.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exit 0.

- [ ] **Step 3: Smoke the route locally**

Run in one terminal: `npm run dev`
Open: `http://localhost:4000/usuarios-de-prueba`
Expected:
- Page renders with topbar showing "Usuarios de prueba".
- Sidebar shows new "Recursos" group with 🔑 "Usuarios de prueba" item active.
- If the customer has no credentials in Notion: empty state with link to Notion DB.
- If credentials exist: 2-column card grid where each card shows Nombre as title, Usuario as subtitle, and 3 fields (Usuario, Clave, URL) with copy/reveal buttons.
- Click the eye on Clave: value reveals.
- Wait 30 s: value re-masks.
- Click the copy button: toast appears, clipboard contains the real value.

If the DB is empty (it is at time of writing — `SAMPLE_COUNT: 0`), add one row in Notion to test rendered cards. The Notion DB URL is in `Task 8` empty-state action.

- [ ] **Step 4: Final clean commit if anything else surfaced**

If the smoke run revealed nothing more to fix, no further commit is needed. Otherwise commit the fix with a descriptive message.

---

## Self-Review Notes

- **Spec coverage:**
  - IA + sidebar group → Task 12 ✓
  - Notion data model + query → Tasks 1-4 ✓
  - `TestUserGrid` empty state w/ Notion link → Task 8 ✓
  - `TestUserCard` composition → Task 7 ✓
  - `CredentialField` with all 3 types + reveal + auto-hide + copy → Tasks 5-6 ✓
  - Loading skeleton → Task 10 ✓
  - Error boundary → Task 11 ✓
  - Tests for `lib/notion/test-users.ts` and `CredentialField` → Tasks 3, 5 ✓
  - Mobile BottomNav unchanged → no task needed (intentional) ✓
  - No new API endpoints / no Notas field — confirmed unchanged in plan ✓

- **No placeholders:** every code block is complete; no TODO/TBD; commands have expected output.

- **Type consistency:** `TestUser` shape used identically in `parseTestUser`, `TestUserCard`, `TestUserGrid`. Property names (`nombre`, `usuario`, `clave`, `url`, `customerIds`, `teamIds`, `lastEditedAt`) match across schema → query → consumers.
