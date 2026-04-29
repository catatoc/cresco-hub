# Copy Tasks Export — Design Spec

**Date:** 2026-04-29
**Status:** Approved by user, ready for implementation plan.

## Goal

Permitir al usuario logueado copiar las **tareas visibles del Kanban** (respetando filtros y vista activa) al portapapeles en formato **JSON** o **Markdown**, o descargarlas como archivo `.json`. El formato JSON está pensado para pegarse en un MCP / agente (ej. Linear MCP) que las convierta en tickets; el formato Markdown está pensado para humanos / quick paste en otras herramientas.

## Non‑goals

- **No** hay selección manual de tareas (no entra "modo selección con checkboxes"). Se exporta lo visible según filtros/vista.
- **No** hay endpoint backend nuevo. Todo es client-side; los datos ya están en memoria en `<KanbanView>`.
- **No** hay configurador de campos: el set de 9 campos es fijo.
- **No** hay export a CSV ni XLSX.
- **No** se persiste "último formato usado" entre sesiones.
- **No** hay sync bidireccional con Linear ni con ningún destino.

---

## 1. Resumen ejecutivo

Se añade un botón **icono ghost** (clipboard, 28×28) en la toolbar del Kanban, a la derecha del `ViewToggle`. Click → `DropdownMenu` con header "Copiar {N} tareas visibles" y tres acciones:

- **Como JSON** — `navigator.clipboard.writeText(...)` con payload estructurado.
- **Como Markdown** — checklist legible con metadata inline.
- **Descargar .json** — descarga `tareas-{sprint-slug}-{YYYY-MM-DD}.json`.

Tras una copia exitosa: el ícono muta a check verde por 1.5s + `toast.success(...)` (sonner ya está en el proyecto). Si `tasks.length === 0`, el menú está deshabilitado con tooltip "No hay tareas para copiar".

---

## 2. Arquitectura y archivos

100% client-side. La fuente de verdad es la lista `tasks` que ya vive en `<KanbanView>`. La resolución `assigneeId → nombre` se hace desde el `membersById` ya cargado.

### Nuevos

| Path | Rol |
|---|---|
| `components/kanban/copy-tasks-menu.tsx` | Botón icono ghost + `DropdownMenu` (shadcn). Recibe `tasks`, `membersById`, `sprintLabel`. Maneja clipboard, descarga y feedback (icono check + toast). |
| `lib/tasks/format-tasks.ts` | Pure functions: `serializeTasksJson(tasks, membersById)` y `serializeTasksMarkdown(tasks, membersById)`. Sin dependencias de React. |
| `lib/tasks/__tests__/format-tasks.test.ts` | Snapshot tests para JSON y Markdown; null-safety; resolución de nombres. |

### Modificados

| Path | Cambio |
|---|---|
| `components/kanban/kanban-view.tsx` | Importa `<CopyTasksMenu>` y lo monta en el cluster derecho de la toolbar, después de `<ViewToggle>`. Pasa `tasks` (la lista actual del estado), `membersById`, `sprintLabel`. |

---

## 3. Forma del payload

### TypeScript export shape

```ts
type TaskExport = {
  title: string;
  status: TaskStatus;             // enum del schema
  priority: TaskPriority | null;  // 'Low' | 'Medium' | 'High' | null
  type: TaskType | null;          // '🐛 Bug' | '✅ Task' | ...
  assignees: string[];            // nombres resueltos desde membersById
  tags: string[];
  dueDate: string | null;         // ISO
  plannedDate: string | null;     // ISO
  url: string;                    // notion.so/...
};

type TasksExportPayload = {
  exportedAt: string;             // ISO
  count: number;
  tasks: TaskExport[];
};
```

Total: **9 campos** por tarea. **No se incluyen** `id`, `assigneeIds`, `projectId`, `customerId`, `sprintId`, `progress`, `completedAt` — son ruido para el destino (Linear no usa IDs de Notion).

### JSON output

`JSON.stringify(payload, null, 2)` con indentación de 2 espacios para legibilidad humana al pegar.

### Markdown output

Una línea de header + un ítem por tarea:

```md
# 12 tareas (exportadas 2026-04-29)

- [ ] **Implementar copiar tareas** · 🐛 Bug · High · Due 2 may
      Asignados: Dani, Carlos · Tags: backend, urgent
      https://notion.so/abc123

- [ ] **Otro título** · ✅ Task · Medium
      Asignados: Dani
      https://notion.so/def456
```

**Reglas de formato Markdown:**

- Línea 1: `- [ ] **{title}** · {type} · {priority} · Due {dueDate corto}`
  - Cada metadata se omite si es `null` (ej. sin priority → no aparece "· null").
  - `dueDate` se formatea como `D mes` en español (`2 may`, `15 nov`).
- Línea 2 (indentada con 6 espacios): `Asignados: {nombres} · Tags: {tags}` — omitir secciones vacías; si ambas vacías, omitir la línea entera.
- Línea 3 (indentada con 6 espacios): el `url`.
- Separación de un blank line entre tareas.

---

## 4. UX del menú

### Botón

- **Tamaño:** 28×28px (mismo que `tb-nav-btn` existente en la toolbar).
- **Estilo:** ghost — `border-1 border-[#e5e7eb] bg-white text-gray-500`.
- **Ícono:** Clipboard de `lucide-react` (14×14).
- **Tooltip:** "Copiar tareas visibles".
- **`aria-label`:** "Copiar tareas visibles".
- **Posición:** Cluster derecho de la toolbar, después de `<ViewToggle>`.
- **Estado deshabilitado** (`tasks.length === 0`): opacidad 50%, cursor not-allowed, tooltip "No hay tareas para copiar".

### Dropdown (shadcn `DropdownMenu`)

- **Ancho:** ~230px.
- **Header:** texto small color gris — `Copiar {N} tareas visibles`.
- **Items:**
  1. **Como JSON** — hint a la derecha: "para MCP".
  2. **Como Markdown** — hint a la derecha: "para Linear".
  3. *(separador)*
  4. **Descargar .json** — sin hint.

### Feedback post-acción

- **Copiar JSON / Markdown:**
  - Ícono del botón muta a `Check` verde por 1500ms, luego vuelve al clipboard.
  - `toast.success(\`{N} tareas copiadas como ${formato}\`)`.
- **Descargar .json:**
  - Trigger inmediato del download. `toast.success(\`{N} tareas descargadas\`)`.
- **Error de clipboard:**
  - Fallback a `document.execCommand('copy')`. Si también falla → `toast.error("No se pudo copiar al portapapeles")`.

### Naming del archivo descargado

`tareas-{sprint-slug}-{YYYY-MM-DD}.json`

- `sprint-slug`: slugify del `sprintLabel` actual (ej. "Sprint #142 · 28 abr – 5 may" → "sprint-142"). Si no hay parseable → `tareas-{YYYY-MM-DD}.json` simple.

---

## 5. Errores y casos borde

| Caso | Comportamiento |
|---|---|
| `tasks.length === 0` | Botón deshabilitado, tooltip explícito. Dropdown no abre. |
| `assigneeId` no encontrado en `membersById` | Se resuelve a `"Desconocido"`. No rompe la copia. |
| `navigator.clipboard` no disponible (HTTP, viejo Safari) | Fallback `document.execCommand('copy')` con `<textarea>` temporal. |
| Ambos métodos fallan | `toast.error("No se pudo copiar al portapapeles")`. Ícono no muta a check. |
| Tarea con `dueDate` malformada | Se imprime crudo en JSON; en Markdown se intenta parsear, si falla se omite el segmento "Due". |

---

## 6. Tests

### `lib/tasks/__tests__/format-tasks.test.ts`

- **JSON snapshot — tarea mínima:** Solo `title`, `status`, `url`. Verificar que los nullables salen como `null` y arrays vacíos como `[]`.
- **JSON snapshot — tarea completa:** Todos los campos populados, 2 assignees resueltos, 3 tags.
- **Markdown snapshot — tarea mínima:** Verificar que omite metadata vacía y que la línea 2 desaparece si no hay assignees ni tags.
- **Markdown snapshot — tarea completa:** Verificar formato de fecha en español, indentación, separadores `·`.
- **Resolución de nombres:** `assigneeIds: ['id-1', 'id-unknown']` con `membersById` que solo tiene `'id-1'` → `assignees: ['Dani', 'Desconocido']`.
- **Header:** `count` correcto, `exportedAt` parseable como ISO.
- **Ordering:** verificar que el orden de `tasks` se preserva (el formateador no reordena).

### `components/kanban/__tests__/copy-tasks-menu.test.tsx` (mínimo)

- Render con 0 tareas → botón deshabilitado.
- Render con N tareas → header del dropdown muestra N.
- Click en "Como JSON" → `navigator.clipboard.writeText` recibe el JSON correcto (mock).

No se hace test E2E del dropdown completo — los items disparan funciones puras ya cubiertas.

---

## 7. i18n y a11y

- Strings en español (consistente con el proyecto): "Copiar", "Descargar .json", "Como JSON", "Como Markdown", "para MCP", "para Linear", "tareas copiadas", "tareas descargadas".
- `aria-label` en el botón ghost.
- `DropdownMenu` de shadcn ya provee `role="menu"` y navegación con teclado.
- Tooltip vía `Tooltip` de shadcn (consistente con el resto de la toolbar).

---

## 8. Lo que NO se hace (YAGNI)

- ❌ Selección manual con checkboxes.
- ❌ Endpoint backend.
- ❌ Configurador de campos exportados.
- ❌ Export a CSV / XLSX.
- ❌ Persistir último formato usado (localStorage).
- ❌ Atajo de teclado global para "Copiar tareas".
- ❌ Sync bidireccional con Linear / cualquier destino.
- ❌ Modal de preview antes de copiar.

---

## 9. Criterios de éxito

- [ ] El botón aparece en la toolbar del Kanban en las 3 vistas (classic / week / by-person).
- [ ] El conteo en el dropdown coincide con la cantidad de tareas visibles tras aplicar filtros.
- [ ] "Como JSON" copia un payload parseable que un MCP puede consumir.
- [ ] "Como Markdown" copia un texto que se ve bien al pegar en Linear / Notion / Slack.
- [ ] "Descargar .json" produce un archivo válido con nombre informativo.
- [ ] El ícono check + toast confirman cada acción exitosa.
- [ ] Tests unitarios del formateador pasan en CI.
- [ ] Cero cambios en el backend / Prisma / endpoints.
