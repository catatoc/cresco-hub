# Quick‑Create estilo Linear — Design Spec

**Date:** 2026-04-26
**Status:** Approved by user, ready for implementation plan.

## Goal

Permitir al equipo crear **Tareas** y **Wiki pages** desde cualquier pantalla autenticada con un atajo `C` (estilo Linear), un botón visible "+ Crear" en el sidebar, un modal centrado con metadata heredada del contexto, y un modo "crear otra" para captura múltiple.

## Non‑goals

- Crear **Reuniones, Proyectos, Customers** desde el quick‑create. Esas entidades quedan fuera y se siguen creando desde sus pantallas/skills (`/meeting`, `/project`, `/customer`).
- Editar el cuerpo de la wiki desde el modal — sólo metadata. El cuerpo se edita en `/wiki/[pageId]`.
- Reemplazar el flujo del SearchPalette (`⌘K`) — convive con él, no lo modifica.

---

## 1. Resumen ejecutivo

`C` abre un modal centrado (~560px) que crea **Tarea** por defecto con un toggle visible para **Wiki**. El modal hereda contexto de la URL (Sprint, Proyecto, Reunión cuando aplica), respeta el Customer activo silenciosamente (no visible, no removible), y se invoca también desde un botón **+ Crear** en el sidebar bajo Buscar `⌘K`. Atajos: `⌘↵` crea, `⇧⌘↵` "crea otra", `Esc` cierra. Tarea cierra y muestra toast; Wiki redirige a `/wiki/[id]`.

---

## 2. Arquitectura y archivos

Sigue el patrón `SearchProvider` / `SearchPalette` del codebase para reusar muscle memory.

### Nuevos

| Path | Rol |
|---|---|
| `components/create/create-provider.tsx` | Context + `useGlobalHotkey('c')` con guards. Expone `open(type?)` y `close()`. |
| `components/create/create-trigger.tsx` | Botón **+ Crear** del sidebar con `kbd C`. |
| `components/create/create-modal.tsx` | `Dialog` centrado ~560px, header con toggle, body por tipo, footer con shortcuts visibles. |
| `components/create/tarea-form.tsx` | Título + textarea descripción + chips Sprint/Proyecto/Asignar(=Team)/Prioridad/Fecha. |
| `components/create/wiki-form.tsx` | Emoji picker + título + chips Categoría/Proyecto/Reunión. |
| `components/create/chips/chip-sprint.tsx` | Popover async list. |
| `components/create/chips/chip-project.tsx` | Popover async list. |
| `components/create/chips/chip-team.tsx` | Popover multi‑select async (relación **Team**). |
| `components/create/chips/chip-priority.tsx` | Popover select estático (Low/Medium/High/Urgent). |
| `components/create/chips/chip-date.tsx` | Popover date picker. |
| `components/create/chips/chip-category.tsx` | Popover multi‑select (Wiki). |
| `components/create/chips/chip-meeting.tsx` | Popover async list (Wiki). |
| `hooks/use-create-context.ts` | Lee pathname + searchParams y devuelve `{ sprintId?, projectId?, meetingId? }`. |
| `app/api/create/route.ts` | `POST` discriminated union. Auth por cookie. |
| `schemas/create.ts` | Zod `createTaskInput`, `createWikiInput`, `createInput`, `createResult`. |

### Modificados

| Path | Cambio |
|---|---|
| `components/shell/sidebar.tsx` | Montar `<CreateTrigger />` debajo de `<SearchTrigger />`. |
| `components/providers/*` (donde se monta `SearchProvider`) | Envolver con `<CreateProvider customerId={...}>`. |
| `lib/notion/tasks.ts` | Extender `createTask` para aceptar `description?`, `projectId?`, `assigneeIds?`, `priority?`, `dueDate?`. Description → block paragraph aparte vía `blocks.children.append`. |
| `lib/notion/wiki.ts` | Añadir `createWikiPage({ customerId, title, emoji, categories?, projectId?, meetingId? })`. |

---

## 3. Comportamiento e interacciones

### Apertura

- `C` global → `open()` con tipo recordado en `localStorage` (default `task`).
- Click en **+ Crear** del sidebar → mismo `open()`.
- Si la ruta es `/wiki/...`, `C` abre con `wiki` activo (override contextual).
- Toggle visible arriba: pills `📝 Tarea` / `📖 Wiki`. Cambia tipo sin cerrar; preserva título y descripción.

### Context inheritance (`use-create-context.ts`)

| Campo | Regla |
|---|---|
| `customerId` | Siempre desde cookie/contexto activo. **Invisible y no removible.** |
| `sprintId` | Si pathname `/tareas` y `searchParams.sprint` → hereda. Chip visible removible con ✕. |
| `projectId` | Si pathname empieza con `/proyectos/[id]` → hereda. Chip removible. |
| `meetingId` (Wiki) | Si pathname empieza con `/reuniones/[id]` → hereda. Chip removible. |

### Submit

- `⌘↵` o click "Crear" → `POST /api/create`. Botón disabled, label "Creando…".
- **Tarea OK** → cierra modal, `toast.success("Tarea creada", { action: { label: 'Ver', onClick: () => router.push('/tareas/${id}') } })`. Si pathname empieza con `/tareas`, dispara `router.refresh()`.
- **Wiki OK** → cierra modal, `router.push('/wiki/${id}')`.
- **Error** → toast destructivo, modal queda abierto con datos.

### "Crear otra" (`⇧⌘↵`)

- Aplica a Tarea y Wiki.
- Crea, dispara toast con acción ("Ver" para Tarea, "Abrir" para Wiki), **deja el modal abierto y limpio** (preserva tipo, Sprint y Proyecto heredados; limpia título, descripción, asignados, prioridad, fecha).
- Foco vuelve al input de título.
- Para Wiki en este modo, **no redirige** (excepción al flujo normal).

### Cierre

- `Esc` o click fuera → si título no vacío, confirma ("¿Descartar?"). Si vacío, cierra silenciosamente.

### Guards de `C`

`C` no dispara si:
- foco en `input` / `textarea` / `[contenteditable]`
- otro dialog abierto (`[role="dialog"][data-state="open"]`)
- `e.metaKey || e.ctrlKey || e.altKey`
- ruta sin auth (`/login`, `/no-access`) — el `CreateProvider` no se monta ahí.

---

## 4. Data flow y contratos

### Schemas Zod (`schemas/create.ts`)

```ts
export const createTaskInput = z.object({
  type: z.literal('task'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  sprintId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).default([]), // Team relation, NOT Notion people
  priority: z.enum(['Low','Medium','High','Urgent']).nullable().optional(),
  dueDate: z.string().date().nullable().optional(),
});

export const createWikiInput = z.object({
  type: z.literal('wiki'),
  customerId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  emoji: z.string().max(8).default('📄'),
  categories: z.array(z.string()).default([]),
  projectId: z.string().nullable().optional(),
  meetingId: z.string().nullable().optional(),
});

export const createInput = z.discriminatedUnion('type', [createTaskInput, createWikiInput]);
export const createResult = z.object({ id: z.string(), url: z.string() });
```

### Endpoint `POST /api/create`

- Auth: `getAppContext()` (cookie). Reject si `customerId` del body ≠ del contexto → 401.
- Validate body con `createInput.parse()` → 400 con primer `issue.message` en error.
- Dispatch:
  - `type === 'task'` → `lib/notion/tasks.ts` → `createTask(...)`.
  - `type === 'wiki'` → `lib/notion/wiki.ts` → `createWikiPage(...)`.
- Return `createResult` (200) o `{ error }` (400/500).

### Notion mapping

**Tarea** (extiende `createTask` existente):
- `Task name` ← title
- `Status` ← `'Not Started'`
- `Customer` (relation) ← customerId
- `Sprint` (relation) ← sprintId
- `Project` (relation) ← projectId
- `Team` (relation) ← assigneeIds — **NO `Assignee` people**
- `Priority` (select) ← priority
- `Due` (date) ← dueDate
- Description → block `paragraph` aparte vía `blocks.children.append`.

**Wiki** (`createWikiPage` nuevo):
- `Doc name` ← title
- `Customer` (relation) ← customerId
- `Category` (multi_select) ← categories
- `Projects` (relation) ← `[projectId]` si viene
- `Meetings` (relation) ← `[meetingId]` si viene
- `icon` ← `{ type: 'emoji', emoji }`

### Cliente → Servidor

- Form mantiene state local (React state, no RHF — sólo título obligatorio).
- En `handleSubmit`: `createInput.parse(payload)` local → `fetch('/api/create', { method: 'POST', body: JSON.stringify(payload) })` → toast/redirect.

### Cache invalidation

- Después de crear Tarea: si pathname empieza con `/tareas`, `router.refresh()`.
- Después de crear Wiki: `router.push('/wiki/${id}')` ya gatilla data fetch fresco.

---

## 5. Error handling, edge cases y accesibilidad

### Errores

| Caso | Comportamiento |
|---|---|
| Timeout / 5xx Notion | `toast.error("No pude crear la tarea. Reintentar")` con action que re-envía. Modal queda abierto. |
| 401 sesión caída | Toast + `router.push('/login?next=...')`. |
| 400 Zod fail server | Muestra `issue.message` debajo del título. |

### Validación cliente

- Título vacío → botón "Crear" disabled, `⌘↵` no dispara.
- Título > 200 chars → contador rojo, truncado a 200 al submit.

### Edge cases de contexto

- `sprintId` heredado ya no existe (sprint cerrado mientras modal abierto): Notion 400 → mostramos error y removemos chip automáticamente.
- Cambio de Customer (workspace switcher) con modal abierto → cerramos sin guardar.
- Race con `⌘K`: guard "otro dialog abierto" lo previene.
- "Crear otra" en Wiki → toast con acción "Abrir" (`router.push`), no redirige automáticamente.

### Loading states

- Botón "Crear" → "Creando…" + spinner + disabled.
- Chips async (Sprint, Proyecto, Asignar=Team, Reunión) → skeleton inline mientras `useQuery` carga opciones del popover.

### Accesibilidad (WCAG AA)

- `Dialog` de shadcn: role/aria/focus-trap correctos por default.
- `aria-label` en toggle: "Tipo: Tarea, presiona para cambiar a Wiki".
- `aria-keyshortcuts="c"` en botón **+ Crear**.
- Footer del modal lista shortcuts visibles: `⌘↵ Crear · ⇧⌘↵ Crear otra · Esc cerrar`.
- Foco inicial → input de título (`autoFocus`).
- `Tab` navega: toggle → título → descripción → cada chip → "Crear otra" toggle → botón "Crear".
- `aria-live="polite"` para "Tarea creada" si toast no es leído por screen reader.

### Telemetría

Eventos consistentes con el patrón `search:no-results` ya existente:

```
create:opened          { source: 'shortcut'|'sidebar', initialType }
create:type-switched   { from, to }
create:submitted       { type, hasDescription, chipsUsed: string[], createAnother: boolean }
create:cancelled       { type, hadTitle: boolean }
```

### Mobile / pantallas chicas

- En `< sm` (640px) usa `Sheet` bottom (componente ya existe) en vez de `Dialog`, ~85vh. Toggle, título y chips con scroll vertical. Footer sticky.
- Shortcut `C` no se monta en touch devices — botón sidebar es la única entrada.

---

## 6. Testing

### Unit (vitest)

**`hooks/__tests__/use-create-context.test.ts`**
- Devuelve `{ sprintId }` cuando pathname `/tareas` y `?sprint=abc`.
- Devuelve `{ projectId }` cuando pathname `/proyectos/[id]`.
- Devuelve `{ meetingId }` cuando pathname `/reuniones/[id]`.
- Devuelve `{}` cuando ninguna ruta aplica.

**`schemas/__tests__/create.test.ts`**
- `createTaskInput` rechaza título vacío, > 200 chars, customerId vacío.
- `createWikiInput` default `emoji = '📄'`, default `categories = []`.
- `discriminatedUnion` falla si falta `type`.

**`lib/notion/__tests__/wiki.test.ts`** (extender)
- `createWikiPage` mapea Doc name, Customer, Category, Projects, Meetings, icon.emoji.
- Mock `getNotion()` igual que tests existentes.

**`lib/notion/__tests__/tasks.test.ts`** (extender)
- `createTask` con nuevos opcionales mapea a **Team** (no Assignee), Project, Priority, Due.
- Description → block paragraph aparte vía `blocks.children.append`.

### Component (vitest + Testing Library)

**`components/create/__tests__/create-modal.test.tsx`**
- Render abre con type `task` por default.
- Toggle a Wiki preserva título.
- `⌘↵` con título vacío no dispara submit.
- `⇧⌘↵` queda el modal abierto y limpia título.
- `Esc` con título no vacío pide confirmación.
- Chip Sprint pre-llenado por contexto y removible con ✕.
- Customer no aparece como chip y no es removible.

**`components/create/__tests__/create-provider.test.tsx`**
- `C` global abre modal.
- `C` no abre si foco en input/textarea/contenteditable.
- `C` no abre si otro dialog ya abierto.
- `⌘C` no abre.

**`components/shell/__tests__/sidebar.test.tsx`**
- Sidebar renderiza `<CreateTrigger />` debajo de `<SearchTrigger />`.
- Click en **+ Crear** llama `open()`.

### Integration (API)

**`app/api/create/__tests__/route.test.ts`**
- POST sin auth → 401.
- POST con customerId distinto al de la cookie → 401.
- POST con body inválido (Zod) → 400 con `error.issues[0].message`.
- POST `type: 'task'` válido → 200 + `{ id, url }`.
- POST `type: 'wiki'` válido → 200 + `{ id, url }`.

### E2E manual (golden path)

1. Login → `/tareas?sprint=abc`. Pulso `C`. Modal abre con tipo Tarea, chip Sprint visible. Escribo título, `⌘↵`. Toast "Tarea creada · Ver". Listado refresca.
2. Pulso `C` en `/proyectos/[id]`. Chip Proyecto pre-llenado. Toggle a Wiki conserva título. `⌘↵` redirige a `/wiki/[id]`.
3. Pulso `C` con foco en buscador — escribe "c", no abre modal.
4. Activo "Crear otra", `⌘↵` 3 veces seguidas, modal queda abierto, 3 toasts.
