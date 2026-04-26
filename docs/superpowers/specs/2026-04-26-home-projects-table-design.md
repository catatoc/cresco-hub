# Home: tabla de proyectos activos

**Fecha:** 2026-04-26
**Topic:** Integrar proyectos en el home como una tabla compacta debajo de las tareas.

---

## Contexto

El home actual (`app/(app)/page.tsx`) muestra:

1. Topbar con breadcrumb "Home" y badge del sprint activo.
2. `Greeting` — saludo + status line.
3. `StatsStrip` — 4 KPIs (En progreso · Por hacer · Completadas · Próxima reunión).
4. `MyTasks` — tus tareas de hoy y atrasadas.
5. Grid 2 columnas: `NextMeeting` | `WikiRecents`.

La intención es **integrar proyectos** sin perder lo que ya gusta del home. La decisión: agregar una nueva sección entre `MyTasks` y el grid inferior, en formato **tabla compacta** (estilo Linear/Notion). Los proyectos se tratan como pares — ningún proyecto se destaca sobre otros.

## Decisión de diseño (opción E refinada)

Una tabla con 7 columnas:

| icon | proyecto + meta | estado | barra de progreso | % | equipo | hover-arrow |
|------|-----------------|--------|-------------------|---|--------|-------------|

- **icon** (22×22) — emoji del proyecto (`project.icon`) o fallback `FolderKanban`.
- **proyecto + meta** — nombre del proyecto + indicador "pulse" de actividad. Subtítulo con `N abiertas · entrega Mes Día`.
- **estado** — pill coloreado según `project.status` (mismo color-map de `components/projects/project-card.tsx`).
- **progreso** — barra 5px de altura, color coordinado con el pill.
- **%** — `Math.round(project.completion * 100)` alineado a la derecha, tabular-nums.
- **equipo** — `AssigneeStack` (mismo componente que tareas) con los `teamIds` del proyecto.
- **hover-arrow** — flecha `→` muted, opacity 0.4, se intensifica con la fila al hover.

### Indicador de actividad ("pulse")

Pequeño dot animado al lado del nombre:

- **Verde animado** (pulse) → proyecto con tareas modificadas en los últimos 7 días.
- **Gris estático** → sin movimiento reciente.

Se calcula del lado del servidor: contar tareas del proyecto cuya fecha de actualización (o estado) cambió en los últimos 7 días. Si la API de Notion no expone `last_edited_time` por tarea fácilmente, el fallback v1 es: si hay tareas con `dueDate` en la última semana, marcar como activo.

### Ordenamiento

Proyectos ordenados por:
1. `status === 'In Progress'` primero (activos arriba).
2. Luego `Planning` y `Paused`.
3. Excluir `Done`, `Canceled`, `Backlog`.
4. Dentro de cada grupo: por `% completion` descendente.

### Estados

- **Carga normal**: 1–6 proyectos visibles directamente.
- **Overflow** (>6): mostrar 6 + link "Ver todos →" en el header de la sección. (Una iteración futura puede agregar scroll interno con sticky header — fuera de scope v1.)
- **Vacío**: container con `border-dashed`, copy "Sin proyectos activos."

### Mapping estado → color

Reutilizar el mapa existente en `components/projects/project-card.tsx`:

- `In Progress` → azul (`#3a5fcc` / `#eff6ff`)
- `Planning` → primary (`#5e6ad2` / `#eeeffc`)
- `Paused` → naranja (`#c78a2c` / `#faf0db`)
- (`Done`, `Canceled`, `Backlog` no entran en la tabla del home.)

> Nota: la opción E mostraba un pill "Casi listo" en verde para >85%. **No** lo incluimos en v1 — el % ya comunica eso. El pill refleja `project.status` literal.

## Cambios en código

### 1. Data layer

**`lib/home/queries.ts`** (modificar):

- Agregar `queryProjectsByCustomer(customerId)` al `Promise.all` paralelo.
- Filtrar a estados visibles: `In Progress`, `Planning`, `Paused`.
- Ordenar por reglas arriba.
- Limitar a 6.
- Calcular `recentlyActive: boolean` por proyecto: usar `tasks` ya cargadas y mirar si alguna tarea con ese `projectId` tiene movimiento reciente. v1 fallback: hay alguna tarea no `Done`/`Archived` en el proyecto → activo.
- Devolver `activeProjects: Array<Project & { openTaskCount: number; recentlyActive: boolean }>`.

### 2. Component nuevo

**`components/home/active-projects.tsx`** (nuevo):

```
type Props = {
  projects: Array<Project & { openTaskCount: number; recentlyActive: boolean }>;
  membersById: Map<string, TeamMember>;
};
```

- Header con `<h2>Proyectos activos · N</h2>` + link "Ver todos →" hacia `/proyectos`.
- Container `border border-border rounded-lg bg-white overflow-hidden`.
- Header de columnas estilo `text-muted-foreground uppercase tracking-wider text-[11px]`.
- Cada `<Link href="/proyectos/[id]">` (o `project.url` Notion si no tenemos página interna) como fila clickeable.
- Reutiliza `AssigneeStack` desde `@/components/kanban/card`.
- Empty state si `projects.length === 0`.

### 3. Page

**`app/(app)/page.tsx`** (modificar):

- Importar `getHomeData` con el nuevo campo `activeProjects`.
- Recolectar también los `teamIds` de los proyectos en `memberIds` para que `AssigneeStack` tenga los avatares.
- Renderizar `<ActiveProjects projects={data.activeProjects} membersById={membersById} />` justo después de `<MyTasks />` y antes del grid `NextMeeting | WikiRecents`.

### 4. Order de render

```
<Topbar />
<Greeting />
<StatsStrip />
<MyTasks />            ← se mantiene
<ActiveProjects />     ← NUEVO
<grid>
  <NextMeeting />
  <WikiRecents />
</grid>
```

## Specs visuales

- Container: `rounded-lg border border-border bg-white`.
- Header de columnas: `bg-[#fbfbfc] border-b border-border px-4 py-2.5 text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium`.
- Filas: `px-4 py-3 border-b border-border last:border-b-0 hover:bg-[#f7f7f8]`.
- Grid columns: `grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5`.
- Pulse animation: `keyframes` con `box-shadow` (3px → 5px → 3px) en 2s ease-in-out infinite.
- Barra: `h-1.5 bg-[#f7f7f8] rounded-full overflow-hidden`, fill `bg-gradient-to-r from-[color] to-[color]`.
- Avatares: tamaño 20 (mismo que en `MyTasks`).

## Lo que NO entra en v1

- Sticky header al scrollear con muchos proyectos.
- Menú contextual (right-click) en cada fila.
- Filtros/búsqueda dentro de la tabla (eso queda en `/proyectos`).
- Drag-to-reorder.
- Cálculo "real" de actividad reciente (usaremos fallback simple).

## Testing

- `lib/home/queries.test.ts`: tests para el ordenamiento y filtrado de proyectos en `getHomeData`.
- Snapshot/render test de `ActiveProjects` con: 0 proyectos, 1 proyecto, 6 proyectos, datos con `completion = null`.
- Verificación visual en browser (`npm run dev`) — flujo: cargar home, ver tabla, hover, click → proyecto.

## Riesgos

- **Notion rate limit**: ya cargamos proyectos en `/proyectos`; agregarlo al home suma 1 query más por carga del home. Es un dashboard interno con tráfico bajo, aceptable.
- **Avatares**: si los `teamIds` de proyectos son distintos a los `assigneeIds` de tareas, `getTeamMembers` recibirá una lista combinada más grande. No debería ser problema (la query es por `id IN [...]`).
- **Iconos faltantes**: si `project.icon` es `null`, el fallback `FolderKanban` debe verse bien dentro del cuadro 22×22.
