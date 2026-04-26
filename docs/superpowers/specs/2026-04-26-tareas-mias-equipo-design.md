# `/tareas` — Filtro Mías ↔ Equipo + asignados visibles

**Fecha:** 2026-04-26
**Estado:** Spec aprobada · pendiente de plan de implementación
**Alcance:** página `/tareas` (sprint board)

## Problema

Hoy en `/tareas` el equipo no puede:
1. **Identificar quién es el asignado** de una tarea sin pasar el mouse sobre el avatar — la card solo muestra iniciales y un color hash. Con varios "CC" o equipos pequeños esto es ruidoso y obliga a hover.
2. **Cambiar entre "mis tareas" y "todas las del equipo"** rápidamente. La página siempre muestra todo el sprint mezclado.

Causa raíz UI:
- `components/kanban/card.tsx` (`AssigneeStack`) muestra `[avatar] +N` sin texto. El nombre solo está en `title=`.
- No existe ningún concepto de "scope de visión" en `/tareas`. La query siempre es `tasks por customer + sprint`.

Causa raíz de data (no se resuelve aquí, solo se documenta):
- `lib/notion/tasks.ts:15` lee asignados desde la **relación `Team`** (canónica). La propiedad nativa `Assignee` (persona Notion) **no se usa** ni se renderiza. Si en Notion una tarea tiene `Assignee` poblado pero `Team` vacío, aparece sin avatar. Eso es **issue operativo en Notion**, no se mitiga en código.

## Decisiones de diseño

### Default y filosofía
- Entrar a `/tareas` muestra por defecto **Mis tareas** (las asignadas al usuario actual en el sprint activo).
- "Equipo" es la vista secundaria para PMs/leads/standup.

### Toggle de scope
- **Pill compacto** `Mías ▾` ubicado en el `Topbar`, justo después del último crumb.
- Estilo: `bg-[#eeeffc] text-[#5e6ad2] border-[#c9cbe8]` (mismo tinte indigo que el sprint chip — refuerza "filtro activo").
- Click abre dropdown alineado al borde derecho del pill, ancho 220px:
  - `✓ Mis tareas (12)` — checkmark = selección actual
  - `   Equipo completo (47)`
- Conteos calculados en server desde el mismo fetch de tareas del sprint.
- ESC / click fuera = cierra sin cambiar.
- Implementación: `<DropdownMenu>` de shadcn (ya disponible en `packages/ui`).
- **Solo se renderiza el pill en `/tareas`.** Otras páginas no muestran slot.

### Vista Mías (default)
- Sin cambios estructurales. Mismo `BoardClassic` o `BoardWeek` que hoy.
- Aplica el cambio común de la **card mejorada** (ver abajo).

### Vista Equipo (swimlanes con acordeones)
- Componente nuevo: `BoardByPerson`.
- Una sección `<details>` colapsable por miembro del equipo con ≥1 tarea en el sprint.
- Cada acordeón contiene su propio Kanban completo de 4 columnas (`BoardClassic`) o 3 (`BoardWeek`).
- Header del acordeón:
  - Avatar (28px) + nombre completo + área (`role` o `area` del `TeamMember`)
  - 4 chips de conteo por estado (`●Todo 2 · ●In progress 1 · ●In review 1 · ●Done 1`)
  - Botón colapsar/expandir a la derecha
- **Orden:** `In Progress` count desc → total desc.
- **Personas sin tareas en el sprint no se muestran.**
- **Estado inicial:** todos expandidos en primera carga. Colapso manual NO persiste (cada visita arranca expandido).
- **Tareas archivadas:** omitidas en vista Equipo (foco en sprint activo).
- **Drag & drop:** dentro del acordeón cambia status (mismo `DndContext` por sección). NO se soporta arrastrar entre acordeones (cambio de asignado sigue por `task-drawer`).
- **Tareas multi-asignado:** aparecen únicamente bajo el **primer asignado** (`assigneeIds[0]`). Mantiene la métrica de "carga por persona" precisa.
- **Tareas sin `Team` relation (`assigneeIds.length === 0`):** sección "Sin asignar" al final del listado, solo visible si hay alguna. Señal de data faltante en Notion.

### Card mejorada (aplica a Mías y Equipo)
- Reemplaza `AssigneeStack` (avatar + "+N" anónimo) por una **línea separada** al final de la card, debajo del row de tag/fecha.
- Layout:
  ```
  ┌─────────────────────────────────────┐
  │ [icon] Type              · meta     │
  │ Título de la tarea                  │
  │ [tag] [fecha]                       │
  │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
  │ ●●● Carlos, María, Juan             │
  └─────────────────────────────────────┘
  ```
- Borde superior `border-t border-dashed border-border` con `padding-top:5px`.
- Reglas:
  - **1 asignado:** stack de 1 avatar (18px) + nombre completo.
  - **2-3 asignados:** stack overlapping (-4px margin entre avatares, ring blanco 1.5px) + nombres separados por coma.
  - **4+ asignados:** stack de 3 avatares + `+N` numérico, nombres como `Carlos, María, Juan +2`. Tooltip nativo `title="Ana, Pedro"` con los restantes.
  - **0 asignados:** la línea entera **no se renderiza**.
- Truncamiento: nombres en una línea con `text-overflow: ellipsis`. Se prioriza mantener avatares completos y truncar nombres del final.
- Tooltip nativo (`title`) con todos los nombres siempre disponible.
- Costo visual: ~10–12px más alto por card. Aceptable.
- Refactor:
  - Extraer nuevo `AssigneeLine` para uso en `Column` y archived.
  - `AssigneeStack` actual se mantiene exportado para `my-tasks.tsx` (la lista del home no requiere cambio).

### Persistencia de scope
- **URL:** `?scope=mine|team` (omitido = `mine`).
- **Cookie:** `tareas-scope` (`mine` o `team`), nombre constante en `lib/auth/context.ts`.
- **Precedencia al entrar a `/tareas`:**
  1. Si la URL trae `?scope=…` → usa ese valor y actualiza la cookie.
  2. Si no, lee la cookie.
  3. Si no hay cookie → `mine`.
- **Switch:** Server Action que escribe la cookie y hace `redirect()` a `/tareas?sprint=X&scope=…`.
- `?scope` se preserva al navegar sprints (‹ ›) y al cambiar el view toggle Clásico/Semana — son ortogonales.

## Arquitectura

### Constantes nuevas (`lib/auth/context.ts`)
```ts
export const TAREAS_SCOPE_COOKIE = 'tareas-scope';
export type TareasScope = 'mine' | 'team';
```

### Page (`app/(app)/tareas/page.tsx`)
1. Lee `searchParams.scope` con fallback a la cookie.
2. `ctx.memberId` viene de `requireContext()`.
3. Hace **un solo** `queryTasksByCustomerAndSprint(customerId, sprintId)` (sin cambio en la query).
4. Filtra en server según scope:
   - `mine`: `tasks.filter(t => t.assigneeIds.includes(ctx.memberId))`
   - `team`: pasa todas
5. Calcula `myCount` y `teamCount` ambos siempre (para los chips del menú).
6. Pasa `scope`, `myCount`, `teamCount`, `currentMemberId` al `KanbanView`.

### `KanbanView` (`components/kanban/kanban-view.tsx`)
- Nueva prop: `scope: 'mine' | 'team'`.
- Si `scope === 'mine'` → renderiza `BoardClassic` o `BoardWeek` (sin cambios).
- Si `scope === 'team'` → renderiza `BoardByPerson` (nuevo).

### `BoardByPerson` (`components/kanban/board-by-person.tsx`, nuevo)
- Agrupa `tasks` por `assigneeIds[0]`.
- Para cada miembro con ≥1 tarea, renderiza `<details>` con header + una instancia completa de `BoardClassic`/`BoardWeek` (mismo componente que se usa en vista Mías) filtrado a las tareas de esa persona.
- Cada acordeón tiene **su propio `DndContext`** (viene incluido en `BoardClassic`/`BoardWeek`). Drag & drop solo funciona dentro de un acordeón.
- Orden: `In Progress` desc → total desc.
- Sección final "Sin asignar" si `assigneeIds.length === 0` para alguna tarea.

### `ScopePill` (`components/kanban/scope-pill.tsx`, nuevo)
- Renderiza pill + dropdown (shadcn `DropdownMenu`).
- Props: `scope`, `myCount`, `teamCount`.
- Al cambiar invoca Server Action `setTareasScope(value)` que escribe la cookie y `redirect()` a la URL con el nuevo `?scope=…`.

### `Topbar` (`components/shell/topbar.tsx`)
- Nueva prop opcional `endSlot?: ReactNode`.
- En `tareas/page.tsx` se pasa `<ScopePill … />` como `endSlot`.
- Otras páginas no requieren cambio (default = sin slot).

### `card.tsx`
- Extraer `AssigneeLine` (nuevo, usado en `Column` y archived).
- Mantener `AssigneeStack` exportado (consumido por `home/my-tasks.tsx`).

## Verificación manual

- [ ] `/tareas` por defecto muestra solo mis tareas
- [ ] `?scope=team` muestra acordeones por persona
- [ ] Switch desde el menú actualiza URL + cookie + data
- [ ] Cookie sobrevive al cierre del tab y restaura el scope
- [ ] `?sprint=X&scope=team` funciona combinado
- [ ] Cambiar sprint con ‹ › preserva el scope
- [ ] Cambiar view (Clásico ↔ Semana) preserva el scope
- [ ] Card con 0 asignados no renderiza la línea inferior
- [ ] Card con 1 asignado muestra avatar + nombre completo
- [ ] Card con 2-3 muestra stack + nombres con coma
- [ ] Card con 4+ muestra stack de 3 + `+N` y tooltip con restantes
- [ ] Acordeones de personas vienen ordenados por carga
- [ ] Tareas multi-asignado aparecen solo bajo `assigneeIds[0]`
- [ ] Sección "Sin asignar" aparece si hay tareas sin `Team` relation
- [ ] Drag & drop dentro de un acordeón cambia status

## Fuera de alcance (follow-ups)

- Selector multi-persona en el menú del pill (queda en backlog).
- Drag & drop entre acordeones para reasignar (sigue por `task-drawer`).
- Diseño dedicado del pill/menú en mobile (v1 usa el dropdown automático).
- Unificar `AssigneeLine` también en `home/my-tasks.tsx`.
- Auto-correlacionar `Assignee` (persona) ↔ `Team` (relación) en Notion al detectar mismatch.

## Nota operativa

Verificar en la base de Notion que cada tarea tenga la relación `Team` poblada con los miembros correspondientes. Las tareas con `Assignee` (persona) pero sin `Team` aparecerán como "Sin asignar" en la nueva vista.
