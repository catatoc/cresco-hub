# Vista de Proyecto in-app · Mission Control

**Fecha:** 2026-04-27
**Autor:** Dani + brainstorm
**Status:** Approved (ready for plan)

## Problema

Hoy, al hacer clic en una `ProjectCard` en `/proyectos`, la app abre el proyecto en Notion en una pestaña nueva (`<a href={project.url} target="_blank">`). Eso saca al usuario de la app, rompe la continuidad visual y desperdicia los datos relacionados (tareas, reuniones, wiki, equipo) que ya tenemos accesibles vía la integración con Notion.

Queremos que el clic abra una **vista de proyecto dentro de la app** — consistente con `/reuniones/[meetingId]` y `/tareas/[taskId]` — que sirva como **hub de trabajo** para ese proyecto: tareas operativas + contexto glanceable.

## Decisión de diseño · Layout "Mission Control" (B)

Se evaluaron 3 layouts:

| Opción | Descripción | Por qué no |
| --- | --- | --- |
| A · Header + Tabs | Header denso + tabs por módulo | Esconde reuniones/wiki/equipo detrás de clicks |
| **B · Mission Control** | **Hero con summary + stats + grid de módulos** | **Elegida** |
| C · Split | Tareas dominan + side-rail con todo el contexto | Sesga demasiado a "task list view" |

**Elegida: B** — porque escanea el estado del proyecto de un vistazo (stats + summary), y los 4 módulos clave (Tareas, Reuniones, Equipo, Wiki) están todos visibles sin clicks.

## Ruta y archivos

### Nueva ruta

- `app/(app)/proyectos/[projectId]/page.tsx` — Server Component, fetch del proyecto + módulos relacionados.
- `app/(app)/proyectos/[projectId]/loading.tsx` — Skeleton consistente con otros detalles.

### Cambio en card existente

- `components/projects/project-card.tsx` — `<a href={project.url} target="_blank">` → `<Link href={`/proyectos/${project.id}`}>`. Eliminar `target="_blank"`/`rel="noreferrer"`.

### Componentes nuevos (en `components/projects/`)

- `project-detail.tsx` — orquesta el layout (recibe `project`, `tasks`, `meetings`, `wiki`, `members`).
- `project-hero.tsx` — icono, nombre, status pill, priority pill, summary, acciones (+ Tarea, ↗ Abrir en Notion).
- `project-meta-row.tsx` — fechas, owner, headcount, customer.
- `project-stats.tsx` — 4 tarjetas: Avance %, Tareas X/Y, Reuniones, Días restantes.
- `project-tasks-module.tsx` — lista de tareas activas (top 5) con check + status pill + due, link a `/tareas/[taskId]`.
- `project-meetings-module.tsx` — top 3 reuniones recientes, link a `/reuniones/[meetingId]`.
- `project-team-module.tsx` — chips de miembros con nombre + avatar + rol del owner.
- `project-wiki-module.tsx` — top 3 wiki, link a Notion (la app aún no tiene `/wiki/[id]` detalle).

### Datos · nuevas funciones en `lib/notion/`

- `lib/notion/projects.ts` — `getProject(id)` ya existe, no cambia.
- `lib/notion/tasks.ts` — agregar `queryTasksByProject(projectId)`.
- `lib/notion/meetings.ts` — agregar `queryMeetingsByProject(projectId)` (filter por `Projects` relation contains).
- `lib/notion/wiki.ts` — agregar `queryWikiByProject(projectId)` (filter por `Projects` relation contains).
- `lib/notion/team.ts` — reutilizar `getTeamMembers(ids)` con `project.teamIds` (la team relation ya existe).

Todos los queries son del lado server (fetch en el Server Component).

## Layout (desktop, ≥1024px)

```
┌─────────────────────────────────────────────────────────────┐
│ [acento gradient]                                           │
│ Proyectos › Lanzamiento Amedi v2                            │
│                                                             │
│ ┌────┐  Lanzamiento Amedi v2   [In Progress] [High]   [+ Tarea] [↗] │
│ │ 🏥 │  Lanzar la v2 de la plataforma de telemedicina,      │
│ └────┘  con onboarding renovado y panel de doctor.          │
│                                                             │
│ 📅 15 jun – 30 sep · 👤 Owner: Dani · 👥 4 · 🏢 Amedi Salud │
│                                                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                         │
│ │ 62%  │ │ 8/12 │ │  4   │ │ 12d  │                         │
│ │Avance│ │Tareas│ │Reun. │ │Restan│                         │
│ │ ▓▓▓░ │ │      │ │      │ │      │                         │
│ └──────┘ └──────┘ └──────┘ └──────┘                         │
│                                                             │
│ ┌──────────────────────────┐ ┌────────────────────┐         │
│ │ Tareas activas    Ver→  │ │ Equipo             │         │
│ │ ☐ QA mobile · 28 abr    │ │ [DL] [MR] [AL] [MA]│         │
│ │ ☐ TestFlight · 2 may    │ └────────────────────┘         │
│ │ ☐ Copy onboarding       │ ┌────────────────────┐         │
│ │ ☑ Onboarding doctor     │ │ Wiki         Ver→  │         │
│ │                          │ │ 📄 Brief inicial   │         │
│ │ Reuniones recientes Ver→│ │ 🛠 Decisiones téc. │         │
│ │ • Sync semanal · 22 abr │ │ 🎯 OKRs Q3         │         │
│ │ • Decisión redes · 18ab │ └────────────────────┘         │
│ │ • Kickoff · 15 jun      │                                 │
│ └──────────────────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

## Layout (mobile, <640px)

Stack vertical, mismo orden:

1. Hero (acento gradient + breadcrumbs + icon + nombre + pills + summary + acciones colapsadas a iconos).
2. Meta-row (chips wrapean a 2 líneas si es necesario).
3. Stats grid 2×2.
4. Módulos en stack: Tareas → Reuniones → Equipo → Wiki.

## Especificación detallada por sección

### 1. Hero (`project-hero.tsx`)

- **Acento gradient** (3px) arriba, mismo patrón que `ProjectCard` — color elegido por `accentIndex` o por `status`.
- **Breadcrumbs**: `<Topbar crumbs={[{ label: 'Proyectos', href: '/proyectos' }, { label: project.name }]} />` — patrón existente.
- **Icon** (48×48): emoji de Notion o fallback `<FolderKanban>`.
- **Nombre** (`text-[20px]` semibold tracking tight) + **status pill** (mismo `STATUS` map de `ProjectCard`) + **priority pill** (Low gray / Medium amber / High red).
- **Summary**: `text-[13px] text-foreground/80 leading-relaxed`. Se renderiza si `project.summary != null`. Si no existe, se omite (no placeholder).
- **Acciones** (a la derecha, justified-end):
  - Primary: `+ Tarea` → abre el modal de creación existente con `projectId` pre-rellenado.
  - Ghost: `↗` → abre `project.url` en Notion en pestaña nueva (`target="_blank"` aquí sí, porque es ruta externa).

### 2. Meta-row (`project-meta-row.tsx`)

- Display inline, separado por `·`. Color `text-muted-foreground`, font 11px.
- Items:
  - 📅 `startDate – endDate` (formateado `15 jun – 30 sep` con `toLocaleDateString('es')`). Si solo hay endDate, mostrar `Vence 30 sep`. Si no hay fechas, omitir el chip.
  - 👤 `Owner: <name>` — primer member de `ownerIds` (resuelto vía `getTeamMembers`). Si no hay owner, omitir.
  - 👥 `<n> personas` — `teamIds.length` (incluye al owner si está en team).
  - 🏢 `<customer name>` — opcional, solo si la app va a soportar multi-customer (hoy hay solo uno por context, así que se puede omitir en MVP).

### 3. Stats (`project-stats.tsx`)

Grid de 4 tarjetas (`grid-cols-4` desktop, `grid-cols-2` mobile):

1. **Avance** — `Math.round(project.completion * 100)%` con barrita de progreso debajo (gradient idéntico al acento). Si `completion == null`, omitir esta tarjeta y pasar a 3 tarjetas.
2. **Tareas** — `<done> / <total>`, donde `done = tasks.filter(t => t.status === 'Done' || t.status === 'Archived').length` y `total = tasks.length`.
3. **Reuniones** — `meetings.length`.
4. **Días restantes** — `Math.ceil((endDate - now) / day)`. Color amber si <14 días, red si <0 (ya vencido), gris en otro caso. Si no hay endDate, omitir esta tarjeta.

### 4. Módulo Tareas (`project-tasks-module.tsx`)

- Ordenar tasks por status (activas primero: `In Progress` > `In Review` > `Refining` > `Not Started` > `Done` > `Archived`), luego por `dueDate` ascendente.
- Mostrar las **top 5**. Si hay más, link "Ver todas →" navega a `/tareas?projectId=<id>` (filtro pre-aplicado — requiere extender `tareas/page.tsx` para aceptar query string `projectId`, pero eso queda fuera de MVP; en MVP el link va a `project.url` o se desactiva si no hay filtro listo).
- Cada fila: checkbox visual (display only — el toggle se hace en el detalle de la tarea), título, due chip ("vence 28 abr" o relativo), status pill.
- Click en fila → `/tareas/[taskId]`.
- Empty state: "Sin tareas en este proyecto. + Crea la primera".

### 5. Módulo Reuniones (`project-meetings-module.tsx`)

- Ordenar por `date` desc (fallback `createdTime`).
- Mostrar las **top 3**. Link "Ver todas →" navega a `/reuniones?projectId=<id>` (mismo caveat de filtro — MVP puede dejar el link al listado completo sin filtro).
- Cada fila: título (bold), small line con `date · meetingType · "<n> acciones"` (donde n = `taskIds.length`).
- Click → `/reuniones/[meetingId]`.
- Empty state: "Aún no hay reuniones asociadas a este proyecto".

### 6. Módulo Equipo (`project-team-module.tsx`)

- Resolver `project.teamIds` vía `getTeamMembers(teamIds)`.
- Mostrar como chips con avatar (iniciales sobre fondo color) + nombre. El owner lleva `· Owner` en gris a la derecha.
- Si más de 6 miembros, mostrar primeros 5 + chip `+N`.
- Sin click action en MVP (solo display). Opcional futuro: hover con email/role.

### 7. Módulo Wiki (`project-wiki-module.tsx`)

- Ordenar por `lastEditedAt` desc.
- Mostrar las **top 3**. Link "Ver todo →" navega a `/wiki` (sin filtro por proyecto en MVP — es aceptable porque el wiki global ya muestra todos).
- Cada fila: icon (emoji de Notion o 📄 fallback), título, chip de categoría a la derecha.
- Click → abre `wikiPage.url` en Notion (la app aún no tiene `/wiki/[id]`). Usar `target="_blank"`.
- Empty state: "Sin documentación asociada".

## Animación · `PageEnter`

Envolver toda la página en `<PageEnter>` (patrón existente en `proyectos/page.tsx`, `reuniones/[meetingId]/page.tsx`, etc).

## Estados

- **Loading**: `loading.tsx` con skeleton del hero (icon, lines), stats grid, y módulos. Reusar utility skeleton ya en el repo si existe; si no, hacer uno simple con `animate-pulse`.
- **404 / proyecto no existe**: `getProject(id)` retorna `null` → `notFound()` de Next.js.
- **Sin permiso (proyecto no pertenece al customer del usuario)**: comparar `project.customerId === ctx.customerId`. Si no, `notFound()` (no leak).

## Loading-strategy

Server Component fetcha en paralelo:
```ts
const [project, tasks, meetings, wiki, members] = await Promise.all([
  getProject(projectId),
  queryTasksByProject(projectId),
  queryMeetingsByProject(projectId),
  queryWikiByProject(projectId),
  // members se resuelve después de project
]);
```
Luego `getTeamMembers([...project.teamIds, ...project.ownerIds])` (deduped).

## Testing

- Unit (`vitest`):
  - `project-stats.test.tsx` — render correcto con/sin completion, con/sin endDate, color de "días restantes".
  - `project-tasks-module.test.tsx` — orden por status, empty state, top 5.
  - `project-meta-row.test.tsx` — formato de fechas, owner resuelto.
- E2E manual: clic en card de proyecto → carga la página, hero correcto, módulos pueblan, click en tarea va a `/tareas/[id]`.

## Out of scope (MVP)

- Filtros `/tareas?projectId=<id>` y `/reuniones?projectId=<id>` (links pueden ir al listado global por ahora).
- Edición inline (status del proyecto, summary): hoy se hace en Notion.
- Subscripción real-time / refresh automático.
- `/wiki/[id]` detalle in-app.
- Personalización de qué módulos se muestran.
- Tasks: bulk actions, drag-reorder.

## Riesgos / preguntas abiertas (cero — todo decidido)

Ninguno. Todas las dependencias existen (datos, patrones de routing, componentes de pill, motion, topbar).
