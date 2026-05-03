# Test Users Tab — Design

**Date:** 2026-05-03
**Author:** Carlos
**Status:** Approved (pending user spec review)

## Goal

Surface a Notion database of test credentials inside the hub so customers can copy logins for their staging/QA environments without leaving the app or opening Notion. Read-only mirror of the Notion DB; editing happens in Notion.

## Information Architecture

A new sidebar group "Recursos" is added below "Workspace" in `components/shell/sidebar.tsx`. The group hosts a single nav item:

- 🔑 **Usuarios de prueba** → `/usuarios-de-prueba` (icon: `Key` from lucide-react)

The group is shaped to grow (future links/assets/shared docs) without bloating the existing Workspace section. The mobile `BottomNav` (`components/shell/bottom-nav.tsx`) keeps the existing 5 items unchanged — this section is sidebar-only on lg, accessible via the mobile sidebar drawer.

Scoping follows the existing pattern: the page filters by `customerId` from `requireContext()`, so each customer only sees their own credentials. No team scoping in v1 (Team relation in Notion is for ownership only, not visibility).

## Notion Data Model

**Database:** "Usuarios de prueba" — `29d0e14c-c874-43a7-a763-9460dfdd9f73`
**Data source ID (used in queries):** `b2dc5a7a-bb49-4450-b7ed-6b760511f1a6`

| Property   | Type       | Use                                             |
|------------|------------|-------------------------------------------------|
| `Nombre`   | title      | Card title — human label, e.g. "Usuario de Prueba 1" |
| `Usuario`  | rich_text  | Login (typically email)                         |
| `Clave`    | rich_text  | Password — masked by default in UI              |
| `URL`      | url        | Target environment URL                          |
| `Customers`| relation   | Customer scoping filter                         |
| `Team`     | relation   | Owner — not displayed in v1                     |

## Components

All new components live under `components/test-users/`.

### `TestUserGrid` (server component)

Receives `users: TestUser[]`. Renders `grid grid-cols-1 lg:grid-cols-2 gap-3`. If `users.length === 0`, delegates to `EmptyState` (existing in `components/common/empty-state.tsx`).

### `TestUserCard` (server component)

Composition:

```
┌──────────────────────────────────────┐
│ {Nombre}              [optional pill]│  ← h3, font-semibold
│ {Usuario}                            │  ← muted, 12px
│                                       │
│ ┌──────────────────────────────────┐ │
│ │ USUARIO  cliente@demo.com   📋  │ │
│ ├──────────────────────────────────┤ │
│ │ CLAVE    ••••••••           👁📋│ │
│ ├──────────────────────────────────┤ │
│ │ URL      staging.app.com    ↗📋│ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Card chrome: `bg-white border border-border rounded-[10px] p-4`. Title is plain text (no internal Notion page in v1 — keeps the focus on copying credentials, not navigation).

### `CredentialField` (client component)

The reusable copy/reveal block. Props:

```ts
type CredentialFieldProps = {
  label: 'Usuario' | 'Clave' | 'URL';
  value: string;
  type: 'text' | 'password' | 'url';
};
```

Behavior by `type`:

- `text` — render value as monospace, single copy button.
- `url` — render value as a blue link `text-[#2563eb]` with rel/noopener external open + copy buttons.
- `password` — render `••••••••` (fixed 8 chars, never proportional to length). Toggle `Eye` / `EyeOff` icon to reveal. On reveal, start a 30 s timer that flips it back to masked. Timer clears on unmount or re-toggle. **Copy works whether revealed or not** — the underlying value is always the real string.

Copy uses `navigator.clipboard.writeText`. Toast on success via Sonner (`toast.success("Copiado")`); toast.error on failure. Toast for password copy says `"Clave copiada"` to disambiguate from generic copies.

State is local to the component (no localStorage). Each page navigation resets all clave fields to masked.

### `EmptyState`

Reuses existing component:

- icon: `🔑`
- title: "Sin usuarios de prueba"
- description: `Aún no hay credenciales para {customerName}. Agrégalas desde Notion.`
- action: external link to the Notion DB URL `https://www.notion.so/recordarte/29d0e14cc87443a7a7639460dfdd9f73`.

## Data Layer

### `lib/notion/test-users.ts`

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
    usuario: p['Usuario']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
    clave: p['Clave']?.rich_text?.map((r: any) => r.plain_text).join('') ?? '',
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
    return res.results.filter((r): r is any => 'properties' in r).map(parseTestUser);
  },
);
```

### `schemas/test-user.ts`

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

### `lib/env.ts`

Add `NOTION_DB_TEST_USERS: z.string().min(10)` to `serverEnvSchema`. Add to `.env.local`:

```
NOTION_DB_TEST_USERS=b2dc5a7a-bb49-4450-b7ed-6b760511f1a6
```

(value is the data source ID, not the database ID — matches existing pattern in `wiki.ts`, `tasks.ts`, etc.)

## Routes

```
app/(app)/usuarios-de-prueba/
  page.tsx       — server component, dynamic = 'force-dynamic'
  loading.tsx    — skeleton (4 card placeholders)
  error.tsx      — error boundary with "Reintentar" button
```

`page.tsx` skeleton:

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
      <div className="px-6 py-5 max-w-5xl mx-auto w-full">
        <TestUserGrid users={users} customerName={ctx.customerName} />
      </div>
    </>
  );
}
```

## States

- **Loading**: `loading.tsx` renders 4 card-shaped skeletons (`bg-[#f4f4f5] rounded-[10px] h-[180px]`) in the same grid layout.
- **Empty**: `users.length === 0` → `EmptyState` with link to Notion.
- **Error**: any thrown error from `queryTestUsersByCustomer` (Notion API failure, missing integration permissions, env var missing) bubbles up to `error.tsx`, which shows a generic message and a `Reintentar` button.
- **Customer with 0 access in Notion**: identical to empty state because the relation filter returns 0 rows.

## Security

- Credentials are sent as props from server to client component. The server component runs only after `requireContext()` succeeds (Supabase auth → membership lookup), so by the time the page renders, the user is authenticated and tied to a `customerId`. The `relation contains customerId` filter ensures cross-tenant isolation.
- `Clave` is masked by default with 8 fixed bullets — does not leak length.
- Auto-hide of revealed clave at 30 s.
- No localStorage / no persistence of revealed state.
- Copy works without revealing.
- No new API endpoints — the only network surface is the existing server-side Notion call.

## Tests

Vitest, following the existing patterns in `lib/notion/__tests__/` and `components/.../__tests__/`.

- `lib/notion/__tests__/test-users.test.ts`
  - Mock `notion.dataSources.query` and assert: filter shape (`Customers.relation.contains`), `parseTestUser` happy path, missing optional fields → defaults, malformed row → throws via Zod.
- `components/test-users/__tests__/credential-field.test.tsx`
  - Renders 8 bullets when `type='password'`.
  - Toggle eye reveals real value.
  - After 30 s with `vi.useFakeTimers()` and `vi.advanceTimersByTime(30_000)`, value re-masks.
  - Click copy invokes `navigator.clipboard.writeText` with the real value (regardless of mask state).
  - URL type has open-in-new-tab anchor with `rel="noopener noreferrer"` and `target="_blank"`.

## Out of Scope (v1)

- Creating / editing credentials from the UI (Notion handles writes).
- Notion page detail view (no `/usuarios-de-prueba/[id]` route).
- Search / filter UI (sort by name is enough at expected scale ≤ 30 entries).
- Team-based scoping — Team relation is metadata only.
- Audit log of who copied what — out of scope, deferred until there's a real need.
- Notas field — not present in current Notion schema.

## File Manifest

New files:

- `app/(app)/usuarios-de-prueba/page.tsx`
- `app/(app)/usuarios-de-prueba/loading.tsx`
- `app/(app)/usuarios-de-prueba/error.tsx`
- `components/test-users/test-user-grid.tsx`
- `components/test-users/test-user-card.tsx`
- `components/test-users/credential-field.tsx`
- `components/test-users/__tests__/credential-field.test.tsx`
- `lib/notion/test-users.ts`
- `lib/notion/__tests__/test-users.test.ts`
- `schemas/test-user.ts`

Modified files:

- `components/shell/sidebar.tsx` — add "Recursos" group with `NavItem` to `/usuarios-de-prueba`.
- `lib/env.ts` — add `NOTION_DB_TEST_USERS` to `serverEnvSchema`.
- `.env.local` (and `.env.example` if present) — add `NOTION_DB_TEST_USERS`.
