# Notion Hub — Design Doc

> **Fecha**: 2026-04-24
> **Autor**: Daniela (PM / Owner de Notion)
> **Estado**: Draft — pendiente de revisión

---

## 1. Problema

Los equipos cliente de Daniela no usan Notion. Pero todo el trabajo del proyecto —tareas, reuniones, wiki, proyectos— vive ahí. Hoy el hand-off se hace a mano: copiar links, compartir capturas, explicar estados. No escala, y los miembros pierden contexto.

Necesitamos una **vista ligera y enfocada** para que cada miembro del equipo entre a un link, haga login una vez, y vea exclusivamente lo de su proyecto, con estética profesional tipo Linear.

## 2. Objetivos

1. **Acceso sin fricción**: magic link (+ Google opcional). Un miembro entra una vez y queda.
2. **1 miembro ↔ 1 cliente**: el login determina qué cliente ves. Puede haber varios proyectos del mismo cliente, pero nunca ves data de otros clientes. Sin selector de cliente.
3. **Kanban semanal ejecutable**: mover tareas entre columnas es la única edición permitida.
4. **Consumo de Notion read-mostly**: reuniones, wiki y proyectos son solo lectura.
5. **Look & feel Linear**: high fidelity, minimalista, denso pero claro.
6. **Key de Notion nunca en el cliente**: toda llamada pasa por el server.

## 3. No-objetivos (explícitos)

- No hay CRUD de tareas (crear, eliminar, editar campos). El PM gestiona desde Notion.
- No hay comentarios, ni adjuntos editables, ni @mentions desde el hub.
- No hay vista multi-cliente para miembros. Solo la vista admin del PM.
- No hay notificaciones push ni email — v2.
- No hay app móvil nativa. Solo web responsive.
- No hay sync bidireccional en tiempo real (websockets). Cache con revalidación on-demand basta.

## 4. Stack

- **Next.js 15** (App Router, React 19) · **TypeScript strict**
- **Tailwind CSS v4** + **shadcn/ui** (componentes base)
- **Supabase** (Auth · magic link + Google)
- **@notionhq/client** (SDK oficial)
- **@dnd-kit/core** (drag & drop del Kanban)
- **TanStack Query** (cache cliente + optimistic updates)
- **Zod** (validación de payloads Notion)
- **date-fns** (manejo de ciclos semanales)

## 5. Roles

| Rol | Cómo se determina | Qué puede hacer |
|---|---|---|
| **Miembro** | Email coincide con una fila en la DB "Team" de Notion | Ver home/tareas/reuniones/wiki/proyectos de SU cliente. Mover tareas entre columnas. |
| **Admin (PM)** | Email marcado como `is_admin=true` en tabla Supabase `app_admins` | Ver todos los clientes. Acceder a `/admin`. Eventualmente invalidar caches. |
| **Sin acceso** | Email no está en Team DB ni en `app_admins` | Ve pantalla "No tienes acceso aún, contacta al admin". |

## 6. Arquitectura

### Flujo general

```
Browser (Next.js cliente)
    ↓ (cookie de sesión Supabase)
Next.js Route Handlers / Server Components
    ↓ (valida sesión, deriva email)
Middleware de autorización
    ↓ (consulta Notion Team DB por email)
    ├─ Match → extrae client_id + project_id
    └─ No match → 403
    ↓
Notion Proxy Service (server-only)
    ↓ (lee NOTION_API_KEY del env)
Notion API
```

### Ubicación de secretos

- `NOTION_API_KEY` → solo en `.env.local` del server. Nunca referenciado en `NEXT_PUBLIC_*`.
- `SUPABASE_SERVICE_ROLE_KEY` → solo en server actions (ops admin).
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` → cliente (seguros por diseño).

### Caching

- **Server cache**: `unstable_cache` de Next.js con tag por cliente (`client:{id}`). TTL base 60s para consultas Notion.
- **Cliente cache**: TanStack Query con `staleTime: 30s`, `refetchOnWindowFocus: true`.
- **Revalidación**: al mover una tarea, tras el éxito del `PATCH`, `revalidateTag('client:{id}:tasks')` en el server + `queryClient.invalidateQueries(['tasks', cycleId])` en el cliente.

### Rate limiting

Notion permite ~3 req/s por integración. Mitigación:
- Cache agresivo (60s mínimo)
- Debounce en drag & drop (aplicar mutación solo al `drop`, no a cada `over`)
- Batch en queries iniciales de Home (una sola `databases.query` por sección)

## 7. Modelo de datos

### Notion (source of truth)

Databases esperadas en el workspace del usuario:

| Database | Propósito | Propiedades mínimas |
|---|---|---|
| **Team** | Directorio de miembros | `Name`, `Email`, `Client` (relation → Clients), `Project` (relation → Projects), `Role` |
| **Clients** | Clientes del PM | `Name`, `Logo` o `Icon`, `Status` |
| **Projects** | Proyectos por cliente | `Name`, `Icon`, `Client` (relation), `Status`, `Progress`, `Team` (relation), `Deadline`, `Description` |
| **Tasks** | Tareas | `Title`, `Status` (select: Backlog/Todo/In Progress/Done), `Priority` (select), `Assignee` (relation → Team), `Project` (relation → Projects), `Client` (rollup o relation), `Cycle` (ISO week string, ej. `2026-W17`), `Due date`, `Labels` (multi-select) |
| **Meetings** | Reuniones | `Title`, `Date`, `Time`, `Duration`, `Meet URL`, `Recurrence`, `Facilitator` (relation → Team), `Attendees` (relation → Team), `Client` (relation), `Agenda` (rich text), `Decisions` (rich text), `Action items` (relation → Tasks) |
| **Wiki** | Páginas | Usa páginas anidadas nativas de Notion (parent/child). Propiedades: `Client` (relation), `Tags` (multi-select), `Owner` (relation → Team), `Last edited` (built-in) |

### Supabase

Tabla mínima: `app_admins`

```sql
create table app_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);
```

Sesión de usuario vive en `auth.users` de Supabase (built-in).

No necesitamos tabla `user_client_access` porque el match email↔cliente lo resuelve la Team DB de Notion. Si el rendimiento lo demanda en v2, se cachea esa relación en una tabla `user_context` con TTL de 5 min.

## 8. Flujo de autenticación

1. Usuario entra a `/login`
2. Ingresa email → Supabase envía magic link (o Google OAuth)
3. Click en magic link → callback `/auth/callback` setea cookie httpOnly
4. Middleware intercepta la siguiente request:
   - `supabase.auth.getUser()` → obtiene email
   - `notion.databases.query({ database_id: TEAM_DB, filter: { property: 'Email', email: { equals: email }}})`
   - Match → adjunta `client_id` + `project_ids[]` al request (header interno `x-app-context` firmado o pasado por server context)
   - No match + no admin → redirect `/no-access`
   - Admin → redirect `/admin` o `/` según configuración
5. Páginas subsecuentes leen el contexto del server y filtran queries a Notion por ese `client_id`

## 9. Pantallas y rutas

| Ruta | Propósito | Render |
|---|---|---|
| `/login` | Magic link + Google SSO | Static, client component para el form |
| `/auth/callback` | Procesa el magic link | Route handler |
| `/no-access` | Email no autorizado | Static |
| `/` | Home del miembro | Server Component, datos pre-fetcheados |
| `/tareas` | Kanban (toggle Clásico/Semana) | Server + Client (dnd-kit en cliente) |
| `/tareas/[taskId]` | Drawer de detalle (parallel/intercepting route) | Server Component dentro del drawer |
| `/reuniones` | Reunión de la semana + historial | Server Component |
| `/reuniones/[meetingId]` | Detalle de una reunión pasada | Server Component |
| `/wiki` | Tree + contenido | Server + Client (estado de expansión) |
| `/wiki/[pageId]` | Página específica de wiki | Server, render blocks Notion |
| `/proyectos` | Grid de proyectos del cliente | Server Component |
| `/proyectos/[projectId]` | (v2, no incluido) | — |
| `/admin` | PM: ver todos los clientes, mapear DBs | Server, protegido por `isAdmin` |

## 10. Sistema de diseño

**Tokens CSS** (ya validados en los mockups):

```css
--bg: #fafafa
--panel: #ffffff
--sidebar: #f7f7f8
--border: #ececee
--border-strong: #e1e1e4
--text: #0f0f10
--text-soft: #57575c
--text-muted: #8a8a91
--accent: #5e6ad2        /* Linear purple */
--accent-soft: #eeeffc
--green: #3f9f5c
--amber: #c78a2c
--red: #d24949
--radius: 6px (default), 8px (cards), 10px (project cards)
--shadow-sm: 0 1px 2px rgba(15,15,16,0.04)
```

**Tipografía**: Inter con features `cv11 ss01 ss03` activadas. Base 13px. Headings con `letter-spacing: -0.01em` a `-0.02em`.

**Componentes shadcn/ui usados**: `button`, `input`, `dialog`, `sheet` (drawer), `tabs`, `avatar`, `badge`, `skeleton`, `toast` (sonner), `command` (⌘K), `tooltip`.

## 11. Detalle de pantallas

### 11.1 Home (`/`)

- Saludo contextual con fecha + nombre + status de la semana
- 4 stat cards: En progreso · Por hacer (con flag atrasada) · Completadas / total · Próxima reunión
- Tabla "Tus tareas" — filtro = hoy + atrasadas (máx 5 rows)
- Split 2 cols: Próxima reunión card (con CTA Unirse) + Recientes en wiki (últimas 4 páginas editadas)

### 11.2 Kanban (`/tareas`)

- **Toggle Clásico/Semana** arriba a la derecha
- **Vista Clásico**: 4 columnas (Backlog, Por hacer, En progreso, Hecho)
- **Vista Semana**: stripe de días arriba + 3 columnas (Por hacer, En progreso, Hecho esta semana). Backlog oculto.
- Cards: priority icon + ID + título + label chip + due/day chip + avatar
- **Drag & drop con `@dnd-kit`**:
  - Al soltar: optimistic update local + `PATCH /api/tasks/{id}/status` + revalidate tag
  - Si falla: revert + toast de error
- Selector de ciclo ‹ › al lado del badge "Semana 17"
- Click en card → abre `/tareas/[taskId]` como drawer (intercepting route)

### 11.3 Detalle de tarea (drawer)

- Sheet/drawer lateral de 520px desde la derecha (shadcn `Sheet`)
- Contenido:
  - Header: ID + status pill + botón close
  - Título grande
  - Propiedades en grid 2 col: Status, Priority, Assignee, Due date, Project, Labels, Cycle
  - Descripción (render de blocks Notion, read-only)
  - Subtasks/checklist (si existen, read-only)
  - Comentarios de Notion (read-only)
  - Footer: "Abrir en Notion ↗"
- **Solo mover status es editable** (botón/select arriba) — todo lo demás read-only

### 11.4 Reuniones (`/reuniones`)

Vista default = reunión **actual/próxima de la semana** como página hero, con:
- Hero card: live badge si aplica · título · metadata (hora, lugar, recurrencia, facilitador) · 3 CTAs
- Agenda numerada (con tiempos)
- Decisiones de la reunión anterior
- Action items ligados a tareas del Kanban (chip con FK-XXX clickeable)
- Historial en panel derecho (280px): lista de reuniones pasadas con click para cambiar de detalle

Si no hay reunión esta semana → mostrar la más próxima o la última pasada, con indicador visual.

### 11.5 Wiki (`/wiki`)

- Split: árbol 260px (izquierda) + contenido (derecha)
- Árbol renderiza páginas anidadas de Notion, con buscador global arriba (⌘K)
- Contenido = render de bloques Notion con `@notion-render/core` o custom:
  - Cover (si existe)
  - Emoji + título H1
  - Properties card (Sección, Tags, Owner, Última edición)
  - Bloques: párrafos, H2/H3, listas, tablas, callouts, code, toggles
- Pill "Solo lectura" arriba

### 11.6 Proyectos (`/proyectos`)

- Tabs: Activos · En planeación · Completados · Todos
- Grid `minmax(300px, 1fr)`
- Cards con:
  - Accent stripe top 3px (gradient por proyecto)
  - Icon chip + título + sub (cliente · quarter)
  - Status pill con dot
  - Descripción 2 líneas
  - Progress bar (%)
  - Footer: avatars del equipo + tareas count + deadline

### 11.7 Login (`/login`)

- Split 50/50: brand panel oscuro (izq) + form panel (der)
- Brand: logo, headline, 3 features
- Form: email input + botón magic link + Google SSO + hint sobre autorización
- Responsive: a <900px solo form

### 11.8 Admin (`/admin`) — alcance mínimo v1

- Tabla de clientes con: nombre · miembros · proyectos · reuniones · link al hub del cliente
- Form para mapear IDs de databases Notion (Team, Clients, Tasks, etc.) por cliente — aunque en v1 asumimos un solo workspace con IDs en env vars
- CTA "Invalidar cache" (limpia tags)

> v1 puede vivir con IDs de DBs hardcoded en env vars. `/admin` es upgrade v1.5.

## 12. Contratos de API (route handlers)

```
POST   /api/auth/callback        - Supabase magic link callback
GET    /api/context              - Devuelve { email, clientId, clientName, projectIds[], isAdmin }
GET    /api/tasks?cycle=2026-W17 - Tareas del cliente en ese ciclo
PATCH  /api/tasks/:id/status     - Body: { status: 'In Progress' }  → mueve la tarea
GET    /api/tasks/:id            - Detalle de tarea (incluye blocks)
GET    /api/meetings             - Reuniones del cliente, ordenadas por fecha
GET    /api/meetings/:id         - Detalle de reunión
GET    /api/wiki                 - Árbol del wiki del cliente
GET    /api/wiki/:pageId         - Página específica con blocks
GET    /api/projects             - Proyectos del cliente
POST   /api/admin/revalidate     - (admin only) invalidar tags de cache
```

Todos con middleware de auth + validación del client_id del contexto.

## 13. Manejo de errores

| Caso | UX |
|---|---|
| Notion API down | Skeleton persistente + banner "Sincronizando…" + retry exponencial. Si >30s, toast con "Intenta recargar" |
| Rate limit (429) | Cache se mantiene, refresh silencioso cuando expire |
| Email no autorizado | Redirect a `/no-access` con instrucciones |
| Sesión expirada | Redirect a `/login?redirect=<original>` |
| Drop fallido | Revert optimistic + toast rojo "No se pudo mover. Intenta de nuevo" |
| DB "Team" mal configurada | Admin panel muestra validación con los campos faltantes |

## 14. Performance

- **Home**: 1 Server Component, 5 queries paralelas (stats + tasks + próx reunión + recientes wiki)
- **Kanban**: 1 query (tasks by cycle), render server + hidratación cliente para dnd
- **Wiki tree**: cacheado por 5 min, lazy-load de blocks al abrir página
- **LCP target**: <1.5s en home con cache frío · <500ms con cache cálido
- **JS bundle**: target <180KB gzip en ruta kanban

## 15. Accesibilidad

- Focus rings visibles (ring-2 purple) en todos los interactivos
- Drag & drop con keyboard (@dnd-kit soporta Space+arrow keys)
- Contraste AA: texto `#57575c` sobre `#ffffff` pasa. Texto `#8a8a91` muted solo en metadata no-crítica
- `prefers-reduced-motion` respeta animaciones (pulse del "En vivo", hover transforms)

## 16. Responsive

- **Desktop (≥1024px)**: layout con sidebar 232px fijo
- **Tablet (768-1023px)**: sidebar colapsable (toggle icon en topbar)
- **Mobile (<768px)**: sidebar como drawer, topbar con menú hamburger, grids reflow a 1 col, kanban scroll horizontal
- Kanban en mobile: carrusel de columnas con swipe

## 17. Seguridad

- API key de Notion solo en server, jamás en cliente (auditado en build)
- Supabase RLS en `app_admins`: solo el service role puede leer
- Todas las rutas API validan sesión antes de responder
- `x-frame-options: DENY` para evitar embedding malicioso
- Rate limiting por IP en `/api/tasks/:id/status` (max 30 req/min)

## 18. Migración / Onboarding

1. PM inicia: crea proyecto Supabase, obtiene URL + anon key
2. PM crea integración en Notion, obtiene API key, comparte las 6 databases con la integración
3. PM pega IDs de databases en `.env.local`
4. PM deploya (Vercel), configura env vars en prod
5. PM agrega miembros en Team DB con su email + relation a Client/Project
6. PM comparte el link del hub al miembro
7. Miembro entra → magic link → está dentro

## 19. Rollout

- **v1** (este spec): MVP completo con 1 workspace de Notion hardcoded en env vars
- **v1.5**: `/admin` para mapear DBs desde UI + cache invalidation manual
- **v2**: Notificaciones push cuando tarea se mueve a "Hecho" por el miembro, comentarios en tareas, wiki editable
- **v3**: Multi-workspace (varios PMs en una instalación)

## 20. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Rate limit de Notion (3 req/s) | Cache agresivo + debounce + batch queries |
| Miembro ve tareas que no debería (bug de filtro) | Test: en cada endpoint, assert que el `client_id` filtrado coincide con el contexto. Log de auditoría. |
| API key de Notion comprometida | Rotar trimestralmente. Key en Vercel env vars, no en código. Monitoring de uso inusual. |
| Un miembro con múltiples proyectos del mismo cliente | Diseño contempla `projectIds[]` en contexto. Kanban y Proyectos muestran todos los proyectos permitidos; si hay más de 1 proyecto, Kanban agrega filtro por proyecto en topbar. |
| Notion cambia API | Abstraer en `services/notion.ts`, pin al SDK version. |

## 21. Estructura de código propuesta

```
notion-hub/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── no-access/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # sidebar + topbar shell
│   │   ├── page.tsx                # home
│   │   ├── tareas/
│   │   │   ├── page.tsx
│   │   │   └── @drawer/[taskId]/page.tsx  # intercepting route
│   │   ├── reuniones/
│   │   │   ├── page.tsx
│   │   │   └── [meetingId]/page.tsx
│   │   ├── wiki/
│   │   │   ├── page.tsx
│   │   │   └── [pageId]/page.tsx
│   │   └── proyectos/page.tsx
│   ├── admin/page.tsx
│   ├── api/
│   │   ├── auth/callback/route.ts
│   │   ├── context/route.ts
│   │   ├── tasks/route.ts
│   │   ├── tasks/[id]/route.ts
│   │   ├── tasks/[id]/status/route.ts
│   │   ├── meetings/route.ts
│   │   ├── wiki/route.ts
│   │   └── projects/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                         # shadcn
│   ├── kanban/
│   │   ├── board.tsx
│   │   ├── column.tsx
│   │   ├── card.tsx
│   │   └── week-stripe.tsx
│   ├── wiki/
│   │   ├── tree.tsx
│   │   └── renderer.tsx
│   └── shell/
│       ├── sidebar.tsx
│       └── topbar.tsx
├── lib/
│   ├── notion/
│   │   ├── client.ts              # singleton del SDK
│   │   ├── team.ts                # match email → cliente
│   │   ├── tasks.ts
│   │   ├── meetings.ts
│   │   ├── wiki.ts
│   │   └── projects.ts
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   │   └── middleware.ts
│   ├── auth/context.ts            # resolveContext()
│   └── cycles.ts                  # ISO week helpers
├── hooks/
│   ├── use-tasks.ts
│   ├── use-move-task.ts
│   └── use-context.ts
├── schemas/
│   ├── task.ts
│   ├── meeting.ts
│   └── notion-blocks.ts
├── middleware.ts
└── .env.local (gitignored)
```

## 22. Variables de entorno

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NOTION_API_KEY=
NOTION_DB_TEAM=31d8af9a4f71801ab5fbec553b430b99
NOTION_DB_CLIENTS=
NOTION_DB_PROJECTS=
NOTION_DB_TASKS=
NOTION_DB_MEETINGS=
# Wiki usa page IDs de root por cliente, o se infiere por relation

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 23. Criterios de éxito (medibles)

- ✅ Miembro entra por primera vez y ve su Kanban en ≤15 segundos desde click en magic link
- ✅ 0 errores de "email no autorizado" cuando la configuración es correcta
- ✅ Drag & drop completa round-trip en <400ms (optimistic UI lo disimula)
- ✅ Home LCP <1.5s con cache frío
- ✅ 100% de requests a Notion pasan por el server (verificado por grep de `NOTION_API_KEY` en bundle cliente)

---

**Fin del spec.**
