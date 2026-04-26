# Rediseño UX: Página de detalle de tarea + sistema de animaciones

**Fecha:** 2026-04-26
**Estado:** Diseño aprobado · pendiente plan de implementación
**Scope:** `/tareas`, `/tareas/[id]`, layout `(app)`, sistema de motion

---

## Resumen ejecutivo

Eliminar el patrón **intercepted modal** (`@modal/(.)tareas/[id]`) que se sabotea con el `key={pathname}` de `<AnimatedMain>` y reemplazarlo por una **página de detalle dedicada** con layout de dos columnas (contenido + panel meta lateral).

En el camino: reemplazar `<AnimatedMain>` por una primitiva explícita `<PageEnter>` que cada página opta-in localmente, y activar la **View Transitions API** de Next 15 para la transición card → página de detalle.

## Problema (estado actual)

Al click en una tarea desde el kanban:

1. La URL cambia de `/tareas` a `/tareas/[id]`.
2. `<AnimatedMain key={pathname}>` en `app/(app)/layout.tsx` remonta `<main>` porque cambió la `key`.
3. El estado del kanban se pierde: scroll, secciones colapsadas en `BoardByPerson`, vista activa.
4. La página debajo dispara su animación de entrada (`animate-in fade-in slide-in-from-bottom-1`).
5. Al mismo tiempo, el slot `@modal` renderiza el Sheet encima.
6. El usuario percibe doble animación / "salto" / "está roto".

El comentario en `components/motion/animated-main.tsx` ya documenta el trade-off:

> *"Trade-off: intercepted parallel routes (e.g. @modal/(.)tareas/[id]) also change pathname, so the underlying page may re-mount briefly when the modal opens."*

El CSS y los tokens motion **no son el problema**. El commit `bb29eea` ya arregló los tokens fuera de `@theme inline`. El problema es **arquitectónico**: dos patrones de Next.js que no son compatibles entre sí.

## Diseño aprobado

### 1. Eliminación del modal interceptado

**Borrar:**

- `app/(app)/@modal/default.tsx`
- `app/(app)/@modal/(.)tareas/[taskId]/page.tsx`
- Directorio `app/(app)/@modal/` completo
- Prop `modal` y su render en `app/(app)/layout.tsx`
- `closeMode` (rama `'back'` y `'push'`) en `<TaskDrawer>` (que se elimina)

**Resultado:** una sola fuente de verdad para `/tareas/[id]`. Cero parallel routes. Cero Sheet.

### 2. Página de detalle dedicada — layout dos columnas

Reemplazar `<TaskDrawer>` por un nuevo `<TaskDetail>` con esta estructura:

```
<article class="flex flex-col h-full overflow-hidden">
  Header (sticky top, border-b)
    - Botón "← Volver" (link a /tareas, focus default)
    - Breadcrumb: Tareas / [proyecto] · [sprint] · [type]

  Body (grid: 1fr 280px en lg+, 1 col en <lg)
    Main column (overflow-y-auto, max-w-[720px], px-8 py-6)
      - <h1> Título (view-transition-name: task-{id}-title)
      - Strip de chips: Estado + Prioridad + Progreso (view-transition-name: task-{id}-status)
      - <hr> sutil
      - <BlocksRenderer> envuelto en <PageEnter delay={120}>

    Meta panel (border-l, sticky, bg-[#fafafa], p-5)
      Label "Propiedades" (uppercase, muted)
      - Estado · Prioridad · Progreso (con barra)
      - Vencimiento · Planeado
      - Asignados (stack vertical de chips)
      - Tags · Proyecto

  Footer (border-t, sticky bottom, bg-[#fafafa])
    - "Esc para volver" (texto muted)
    - Botón "Abrir en Notion"
</article>
```

**Responsive:**

- `>=lg` (1024px): grid `[1fr_280px]`, panel meta sticky a la derecha.
- `<lg`: una sola columna; panel meta colapsa a una **banda compacta de chips** arriba del contenido (estado, prioridad, fechas, asignados, tags inline).

**Ancho de columna principal:** `max-w-[720px]`. Sweet spot para `BlocksRenderer` y matches Notion.

### 3. Sistema de animaciones — eliminar `<AnimatedMain>`, introducir `<PageEnter>`

**Justificación de code quality:**

- Separation of concerns: el layout no debe decidir cómo animan sus children.
- No state loss: preservar estado entre navegaciones es la expectativa correcta de React.
- Compatible con View Transitions: sumar un remount manual encima es animación duplicada.
- Menos código mágico: `key={pathname}` invisible se reemplaza por un wrapper explícito por página.

**Borrar:** `components/motion/animated-main.tsx` y su uso en `app/(app)/layout.tsx`.

**Crear `components/motion/page-enter.tsx`:**

```tsx
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function PageEnter({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        'animate-in fade-in slide-in-from-bottom-1 fill-mode-both',
        'duration-(--duration-base) ease-(--ease-linear)',
        className,
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
```

### 4. View Transitions API para card → detalle

- Habilitar en `next.config.ts`: `experimental: { viewTransition: true }`.
- En `<TaskCard>`: añadir `style={{ viewTransitionName: 'task-' + task.id + '-title' }}` al título y `'-status'` al chip de estado.
- En `<TaskDetail>`: los mismos elementos reciben los mismos `viewTransitionName`s.
- El browser interpola automáticamente. Fallback automático en navegadores sin soporte (cae en el `<PageEnter>` del detalle).
- Reduced motion respetado nativamente por la API.

### 5. Animaciones internas del detalle

- Header (back + breadcrumb): estático.
- Título y chips: vienen del view transition, sin animación local.
- Descripción: envuelta en `<PageEnter delay={120}>` para que entre tras el view transition.
- Panel meta: estático.

### 6. Navegación de salida (3 caminos a un solo handler)

```tsx
function goBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
  } else {
    router.push('/tareas');
  }
}
```

- Botón "← Volver" en el header (link visible).
- Breadcrumb "Tareas" clickeable.
- Tecla `Esc` (event listener global mientras la página está montada).

### 7. Preservación del estado del kanban

Sin `key={pathname}`, `<main>` no remonta. `<KanbanView>` mantiene:

- Vista activa (`classic` / `week`) — `useState` local.
- Secciones colapsadas en `BoardByPerson` — `useState` local en `<PersonSection>`.
- Scroll: el browser lo restaura al hacer back (comportamiento nativo).

### 8. Focus management (a11y)

- Al entrar a `/tareas/[id]`: focus programático en el botón "← Volver" (ref + `useEffect`).
- Al volver al kanban: focus restaurado por el browser (default).
- `<h1>` recibe `tabIndex={-1}` para que screen readers anuncien el cambio de página.

### 9. Loading state

Nuevo `app/(app)/tareas/[taskId]/loading.tsx`:

- Header con back + breadcrumb skeleton.
- Main: título skeleton, chips skeleton, descripción skeleton (3 líneas).
- Meta panel: stack de skeletons de propiedades.

Mismo patrón visual que `app/(app)/tareas/loading.tsx`.

### 10. Aplicación de `<PageEnter>` a otras rutas

Cada `page.tsx` que hoy se beneficiaba de `AnimatedMain` envuelve su root en `<PageEnter>`. 1 línea por archivo:

- `app/(app)/home/page.tsx`
- `app/(app)/wiki/page.tsx` (si existe)
- `app/(app)/wiki/[pageId]/page.tsx`
- `app/(app)/proyectos/page.tsx` (si existe)
- `app/(auth)/login/page.tsx`

## Plan de archivos

### Borrar

- `app/(app)/@modal/default.tsx`
- `app/(app)/@modal/(.)tareas/[taskId]/page.tsx`
- `app/(app)/@modal/` (directorio)
- `components/motion/animated-main.tsx`
- `components/kanban/task-drawer.tsx`

### Crear

- `components/motion/page-enter.tsx`
- `components/kanban/task-detail.tsx` (raíz del detalle)
- `components/kanban/task-detail-header.tsx` (back + breadcrumb)
- `components/kanban/task-detail-meta-panel.tsx` (panel lateral)
- `components/kanban/task-detail-meta-strip.tsx` (banda compacta <lg)
- `app/(app)/tareas/[taskId]/loading.tsx`

### Modificar

- `app/(app)/layout.tsx` — quitar prop `modal` y su render; quitar `AnimatedMain`; `<main>` simple.
- `app/(app)/tareas/[taskId]/page.tsx` — renderizar `<TaskDetail>` en lugar de `<TaskDrawer>`; quitar `closeMode`.
- `components/kanban/card.tsx` — añadir `viewTransitionName` al título y al chip de estado del Link.
- `next.config.ts` — habilitar `experimental.viewTransition = true`.
- `app/globals.css` — opcional: fine-tune `::view-transition-*` si la duración default no calza con `--duration-base`.
- `app/(app)/home/page.tsx`, `app/(app)/wiki/page.tsx`, `app/(app)/wiki/[pageId]/page.tsx`, `app/(app)/proyectos/page.tsx`, `app/(auth)/login/page.tsx` — wrap root en `<PageEnter>`.

## Orden de ejecución sugerido

1. **Setup**: habilitar View Transitions en `next.config.ts`, crear `<PageEnter>`.
2. **Detail page core**: crear `<TaskDetail>` + subcomponentes, conectar a `[taskId]/page.tsx`.
3. **Kill the modal**: borrar `@modal/`, `AnimatedMain`, `TaskDrawer`; limpiar `layout.tsx`.
4. **Wire transitions**: añadir `viewTransitionName` en card y detail.
5. **Apply PageEnter**: wrap en otras rutas.
6. **Loading state**: crear `loading.tsx` del detalle.
7. **Polish**: focus management, Esc handler, a11y.

## Riesgos y consideraciones

- **View Transitions API** aún es experimental en Next 15. Si presenta bugs en Safari/Firefox, el fallback automático cae en el `<PageEnter>` del detalle (UX aceptable, sin shared element).
- **TaskDrawer references**: confirmar via `grep` que solo se usa en `[taskId]/page.tsx` y `(.)tareas/[taskId]/page.tsx`. Confirmado en exploración inicial.
- **Out of scope** (NO tocar):
  - Lógica de DnD del kanban.
  - `BoardByPerson` / `BoardClassic` / `BoardWeek` (excepto el efecto secundario de no perder estado al navegar, que se obtiene gratis).
  - Schemas de tarea.
  - Acciones server (`tareas/actions.ts`).
- **Tests**: `lib/auth/__tests__/context.test.ts` y similares no se tocan. Si hay tests sobre el modal interceptado, se borran.

## Criterios de éxito

1. Click en una tarjeta de tarea: el título y los chips de estado se interpolan suavemente desde el card hasta el header del detalle (View Transitions).
2. Al volver al kanban: scroll y secciones colapsadas se preservan.
3. Esc, browser back, breadcrumb "Tareas" y botón "← Volver" llevan los cuatro al kanban.
4. En pantallas `<lg`: panel meta colapsa a banda compacta arriba sin scroll horizontal.
5. `prefers-reduced-motion`: cero animaciones, navegación instantánea.
6. Cero referencias a `@modal/`, `AnimatedMain`, `TaskDrawer` o `closeMode` en el repo.
7. Otras rutas (home, wiki, proyectos) mantienen su animación de entrada via `<PageEnter>`.
