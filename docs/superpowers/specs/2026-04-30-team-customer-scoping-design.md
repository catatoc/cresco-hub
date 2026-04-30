# Team / Customer Scoping — Home, Reuniones, Tareas, Proyectos

> Date: 2026-04-30
> Owner: Dani
> Status: Approved (brainstorming)

## Goal

Limitar el contenido de Home, Reuniones, Tareas y Proyectos a **lo del usuario logueado dentro del Customer activo**, con escape explícito a "Equipo completo" y paginación correcta para volúmenes grandes.

## Definitions

- **Customer activo** — fila de Customers seleccionada (cookie `selected-customer-id`).
- **Member logueado** — fila de TeamMember con `Email = currentUserEmail` (`ctx.memberId`).
- **Scope** — `'mine' | 'team'`. Default global: `'mine'`.

## Reglas confirmadas

| Sección | Default | Excepción |
|---|---|---|
| Home (overview) | Solo mío | — (sin toggle visual; el toggle vive en cada subpágina) |
| Reuniones (lista) | Mías (Team relation contiene memberId) | Toggle a Equipo |
| Reunión individual (action items, blocks) | **Todos** | Es la excepción explícita: refleja lo discutido |
| Tareas (kanban) | Mías | Toggle a Equipo (ya existe) |
| Proyectos (lista) | Mis | Toggle a Equipo |

> **Nota v1.1 (TODO documentado):** El campo `Attendees` de Meeting es `people` (Notion users), no relation. En v1 filtramos solo por `Team` relation usando `memberId` (consistente con tasks). Si los datos muestran muchas reuniones donde se llena `Attendees` y no `Team`, agregamos `notionUserId` al `AppContext` (resolverlo via `findMemberByEmail` ya devuelve email, falta llamada a `users.list`) y el filtro pasa a `or: [Attendees, Team]`.

## Pagination

Notion data sources query devuelve max 100 por página (`page_size` default 100, top 100). Sin loop de cursor se pierden filas silenciosamente.

**Tareas** (volumen alto):
- `mine` → loop completo con `start_cursor`, sin cap (volumen bajo en la práctica para una persona).
- `team` → loop con techo de **500** filas. Si se topa: `truncated=true` y banner UX guiando a filtrar.

**Reuniones / Proyectos** (volumen bajo):
- Ambas queries (mine y team) usan loop completo con `start_cursor`, sin cap. No se aplica `truncated`. Si en el futuro un cliente excede 500 reuniones/proyectos, se reevalúa.

El helper `queryAllPages` admite `cap = Infinity` para los casos sin techo.

## Architecture (4 capas)

### Capa 1 — Notion query layer

Nuevo archivo `lib/notion/pagination.ts`:

```ts
export async function queryAllPages<T>(
  fetchPage: (cursor?: string) => Promise<{
    results: T[];
    has_more: boolean;
    next_cursor: string | null;
  }>,
  opts: { cap: number }, // pasar Infinity para "sin techo"
): Promise<{ items: T[]; truncated: boolean }>;
```

Si `cap` se alcanza durante el loop, se trunca al cap exacto y se marca `truncated=true`. Errores intermedios se propagan (no devolver lista parcial sin marcar).

Nuevas funciones por dominio:

```ts
// lib/notion/tasks.ts
export async function queryTasksByCustomerSprintAndMember(
  customerId: string,
  sprintId: string | null,
  memberId: string,
): Promise<Task[]>;

export async function queryTasksByCustomerAndSprintPaginated(
  customerId: string,
  sprintId: string | null,
  cap?: number, // default 500
): Promise<{ tasks: Task[]; truncated: boolean }>;

// lib/notion/meetings.ts
export async function queryMeetingsByCustomerAndMember(
  customerId: string,
  memberId: string,
): Promise<Meeting[]>;

// lib/notion/projects.ts
export async function queryProjectsByCustomerAndMember(
  customerId: string,
  memberId: string,
): Promise<Project[]>;
```

Filtros Notion:

```ts
// Tasks "mine" (sin cap, loop completo)
{ and: [
  { property: 'Customer', relation: { contains: customerId } },
  ...(sprintId ? [{ property: 'Sprint', relation: { contains: sprintId } }] : []),
  { property: 'Team',     relation: { contains: memberId } },
]}

// Meetings "mine"
{ and: [
  { property: 'Customer', relation: { contains: customerId } },
  { property: 'Team',     relation: { contains: memberId } },
]}

// Projects "mine"
{ and: [
  { property: 'Customer', relation: { contains: customerId } },
  { property: 'Team',     relation: { contains: memberId } },
]}
```

### Capa 2 — Scope layer

Generalizar `lib/tareas/scope.ts` → `lib/scope/resolve.ts`:

```ts
export type Scope = 'mine' | 'team';
export type ScopeKey = 'home' | 'tareas' | 'reuniones' | 'proyectos';

export const SCOPE_COOKIE: Record<ScopeKey, string> = {
  home: 'home-scope',
  tareas: 'tareas-scope',       // existente — preservar
  reuniones: 'reuniones-scope',
  proyectos: 'proyectos-scope',
};

export function resolveScope(
  key: ScopeKey,
  urlValue: string | undefined,
  cookieValue: string | undefined,
): Scope; // default 'mine'
```

Server action genérica `lib/scope/actions.ts`:

```ts
'use server';
export async function setScope(key: ScopeKey, scope: Scope, redirectPath: string): Promise<void>;
```

Cookies independientes (decisión confirmada): cada página recuerda su propio toggle, sin contaminación cruzada.

`lib/auth/context.ts` mantiene `TareasScope` exportado para retro-compat, pero el tipo se redefine como alias de `Scope`.

### Capa 3 — Page layer

Cada `page.tsx` resuelve scope y ramifica:

```tsx
const ctx = await requireContext();
const scope = resolveScope('home', sp.scope, cookie.get(SCOPE_COOKIE.home)?.value);
const data = await getHomeData(
  ctx.customerId,
  sprintId,
  scope === 'mine' ? ctx.memberId : null,
);
```

`getHomeData` acepta `memberId: string | null` y ramifica internamente entre `*ByMember` y `*ByCustomer`.

Para tareas:

```tsx
const result = scope === 'mine'
  ? { tasks: await queryTasksByCustomerSprintAndMember(...), truncated: false }
  : await queryTasksByCustomerAndSprintPaginated(customerId, sprintId);
```

### Capa 4 — Component layer

Mover `components/kanban/scope-pill.tsx` → `components/common/scope-pill.tsx` con props generalizadas:

```ts
type Props = {
  scopeKey: ScopeKey;
  scope: Scope;
  myCount: number;
  teamCount: number;
  labels?: { mine: string; team: string }; // default: { mine: 'Yo', team: 'Equipo' }
  redirectPath: string; // para el server action
};
```

Estilo Linear-ish actual (bg `#eeeffc`, text `#5e6ad2`). Mobile colapsa a "Yo ▾".

Banner de truncación (`components/kanban/truncation-banner.tsx`):

- Visible solo cuando `scope='team'` y `truncated=true`.
- Estilo ámbar `#faf0db / #c78a2c`.
- Copy: "Mostrando 500 tareas. Filtra por sprint/proyecto o cambia a Mías para ver todo."
- Sticky top del Kanban.

Empty states con CTA cuando `scope='mine'` y vacío:
- Reuniones: "No tienes reuniones todavía — Ver todas del cliente →"
- Proyectos: "No estás en proyectos del cliente — Ver todos del cliente →"
- Home / "Tus tareas": copy actual ("Sin tareas para hoy. Buen momento para respirar.") — no es problema de scope.

## Data flow por página

### Home (`app/(app)/page.tsx`)

```
ctx → scope=resolveScope('home') → getHomeData(customerId, sprintId, scope==='mine' ? memberId : null)
  → tasks, meetings, projects (todos filtrados o no según memberId)
  → stats counts derivados del set ya filtrado (verdad reflejada)
  → render: ScopePill('home', counts) + secciones existentes
```

### Reuniones (`app/(app)/reuniones/page.tsx`)

```
ctx → scope=resolveScope('reuniones')
  → scope==='mine' ? queryMeetingsByCustomerAndMember : queryMeetingsByCustomer
  → render: ScopePill('reuniones', counts) + lista actual
  → empty (mine + length===0): CTA "Ver todas del cliente"
```

Dentro de `app/(app)/reuniones/[meetingId]/page.tsx`: **sin cambios**. Action items y blocks siguen mostrando todo lo discutido (excepción confirmada).

### Tareas (`app/(app)/tareas/page.tsx`)

```
ctx → scope=resolveScope('tareas')
  → scope==='mine' ? queryTasksByCustomerSprintAndMember : queryTasksByCustomerAndSprintPaginated
  → render: ScopePill (ya existe, migrar a common) + Kanban
  → if (truncated): TruncationBanner
```

### Proyectos (`app/(app)/proyectos/page.tsx`)

```
ctx → scope=resolveScope('proyectos')
  → scope==='mine' ? queryProjectsByCustomerAndMember : queryProjectsByCustomer
  → render: ScopePill('proyectos', counts) + ProjectsView
  → empty (mine + length===0): CTA
```

### Search & otros endpoints

`app/api/search/*` y `app/api/create/options/*` siguen usando filtros por Customer (transversal). La búsqueda explícita es global por intención del usuario; no se aplica scope.

## Estados UI

| Estado | UI |
|---|---|
| `mine` con datos | Pill `Yo`, secciones normales |
| `mine` vacío (Reuniones/Proyectos) | Empty state con CTA "Ver todas del cliente" |
| `team` con datos < cap | Pill `Equipo`, kanban completo |
| `team` `truncated` | Banner ámbar arriba del kanban |
| Cambio de scope | Server action set cookie + redirect; `PageEnter` fade |
| Loading | Loading skeletons existentes (no cambian) |

## Error handling

- `queryAllPages` propaga el primer error que ocurra durante el loop. No devuelve resultado parcial sin marcar.
- Si `team` falla por timeout: banner rojo "Carga incompleta — Reintentar" (Reintentar = reload con `?_=timestamp`).
- `notionUserId` no aplica en v1; si en v1.1 falla la resolución, se cae back al filtro `Team` only.

## Testing (Vitest)

- `lib/notion/__tests__/pagination.test.ts` — loop con 1, 2, N páginas; cap respetado; `truncated` flag; error mid-loop.
- `lib/notion/__tests__/tasks.test.ts` — nueva función con filter `{ and: [Customer, Sprint?, Team] }` mockeada vía `notion.dataSources.query`.
- `lib/notion/__tests__/meetings.test.ts` y `projects.test.ts` — análogos.
- `lib/scope/__tests__/resolve.test.ts` — extender los tests existentes de `lib/tareas/__tests__/scope.test.ts` para 4 keys.
- `lib/home/__tests__/queries.test.ts` — `getHomeData` con `memberId` filtra correctamente; con `null` no filtra.
- `components/common/__tests__/scope-pill.test.tsx` — server action correcta por key, render labels, accessibility.
- `components/kanban/__tests__/truncation-banner.test.tsx` — visibilidad condicional.

## Migration / orden de PRs

1. **PR1 — paginación core**: `lib/notion/pagination.ts` + `queryTasksByCustomerAndSprintPaginated` + `TruncationBanner`. Solo `/tareas` scope=team. Bug fix puro, sin cambios de UX visibles.
2. **PR2 — scope generalizado**: extraer `lib/scope/`, mover `tareas-scope` (mantener cookie name), extraer `<ScopePill>` a `components/common/`.
3. **PR3 — Home filtrado**: nuevas queries `*ByMember` + `getHomeData(customerId, sprintId, memberId | null)` + pill en topbar de Home.
4. **PR4 — Reuniones filtrado** + empty state CTA.
5. **PR5 — Proyectos filtrado** + empty state CTA.
6. **TODO v1.1**: documentado en código y en este spec — `notionUserId` en `AppContext` + filter `or: [Attendees, Team]` para reuniones.

URLs existentes no se rompen: `?scope=mine|team` opt-in, cookie persistente, default `mine`.

## Out of scope (explícito)

- Concepto de "Área/Grupo" (Marketing, Engineering) — todavía no existe.
- Filtros multi-team o multi-customer simultáneos.
- Búsqueda con scope (search siempre transversal por Customer).
- Vista admin (todos los Customers a la vez).
- WebSocket / refresh en vivo cuando cambian datos en Notion.
