# UX Motion Polish — Design Spec

**Fecha:** 2026-04-26
**Estado:** Draft (pre-implementación)
**Branch:** `main` (working changes uncommitted)

## 1. Resumen

Pasar el notion-hub de un UI estático con transiciones funcionales a una experiencia con **motion intencional** alineada con la personalidad **Linear-snappy** y guiños puntuales **Apple-spring** reservados para celebraciones. Las 10 superficies del producto (drawer, kanban DnD, modal intercept, sidebar, search, loading, page transitions, status pill, microinteracciones, empty states) reciben tratamiento coherente apoyado en motion tokens compartidos.

**Motivación.** El UI actual tiene buena densidad visual y paleta refinada, pero el motion es plano y desigual: el drawer entra y sale igual, el kanban hace "snap" duro al soltar cards, el sidebar tiene active state binario, los hovers sólo cambian color y no hay feedback táctil de press. Falta el hilo conductor que indique al usuario qué cambió, dónde aterrizó su acción y cuándo algo tuvo éxito.

**Resultado esperado.** Una capa de motion sistémica, accesible (`prefers-reduced-motion` cubierto), de bundle controlado (~+5 kB gz), implementable en ~9 PRs independientes durante ~2.5 días.

## 2. Decisiones (ya validadas con el usuario)

| # | Decisión | Lock |
|---|----------|------|
| Q1 | Scope: las 10 superficies | ✅ |
| Q2 | Personalidad base: **Linear-snappy** + guiños Apple sólo en celebraciones | ✅ |
| Q3 | Drawer: **B · slide + stagger** del header | ✅ |
| Q4 | Kanban DnD: **C · FLIP + status flash** | ✅ |
| Q5 | Microinteracciones: **L2 Crafted** | ✅ |
| Q6 | Resto de superficies: recomendaciones default (modal scale+fade, sidebar sliding indicator, search stagger+match, loading crossfade, page view-transitions, Done celebration, EmptyState reutilizable) | ✅ |
| Approach | **B · CSS + motion selectivo** (CSS para todo lo aislado, `motion/mini` sólo para stagger/FLIP/confeti) | ✅ |

## 3. Arquitectura

### 3.1 Capas

1. **Motion tokens (CSS vars en `globals.css`)** — fuente de verdad de duraciones y easings. Expuestos a Tailwind v4 vía `@theme inline`.
2. **CSS animations (Tailwind utilities + tw-animate-css + base-ui data-state)** — cubren el 80%: slides, fades, scales, color tweens, shimmer, bobs.
3. **`motion`** (paquete npm, sucesor de framer-motion por Matt Perry; ~5 kB gz con imports `motion/react/m` y tree-shaking) — sólo cuando hay secuencia (stagger), layout shift (FLIP) o física (confeti, gestures). Lazy-loaded vía un wrapper `components/motion/m.tsx`.
4. **Reduced-motion guard** — media query global que colapsa duraciones a `0ms`; `motion` respeta `useReducedMotion()` automáticamente.

### 3.2 Convención de uso

- CSS animation cuando entra/sale **un elemento aislado**.
- `motion` cuando hay **secuencia** (stagger), **layout shift** (FLIP), o **física** (confeti, drag).
- Toda animación respeta `prefers-reduced-motion`.
- Hardcodear `duration-[Xms]` está prohibido fuera de `globals.css` (lint rule en CI).

## 4. Motion tokens

```css
/* app/globals.css */
@theme inline {
  /* durations */
  --duration-instant:   80ms;
  --duration-fast:      120ms;
  --duration-base:      180ms;  /* default Linear-snappy */
  --duration-slow:      240ms;
  --duration-celebrate: 320ms;

  /* easings */
  --ease-linear:    cubic-bezier(0.32, 0.72, 0, 1);   /* base */
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1); /* celebrate only */
  --ease-out-soft:  cubic-bezier(0.4, 0, 0.2, 1);     /* fade */
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-instant: 0ms;
    --duration-fast: 0ms;
    --duration-base: 0ms;
    --duration-slow: 0ms;
    --duration-celebrate: 0ms;
  }
}
```

Tailwind v4 reconoce automáticamente `--duration-*` y `--ease-*` bajo `@theme inline`, exponiéndolos como utilities `duration-base`, `ease-linear`, etc.

## 5. Especificación por superficie

### 5.1 Drawer (Sheet) — `components/ui/sheet.tsx` + `components/kanban/task-drawer.tsx`

**Entrada/salida del panel.**
- Slide-x con distancia **100% del width** (no 2.5rem como hoy).
- Curva: `var(--ease-linear)` · `var(--duration-base)`.
- Backdrop: `blur(2px)` + `bg-black/6%` (más sutil que el `black/10%` actual).

**Stagger del header** (al abrir).
- `<SheetTitle>`: opacity 0→1 + translateX 8→0, delay 120ms.
- Meta pills (status + priority + progress): cascade 40ms entre elementos.
- Implementación: wrapper `<m.div>` (lazy-loaded) en el header del task-drawer.

**Cierre.**
- Esc (existente) + clic backdrop (nuevo) + clic en X (existente).
- Salida: slide reverso + opacity 1→0 simultáneo.

### 5.2 Modal intercept — `components/ui/dialog.tsx` + `app/(app)/@modal/(.)tareas/[taskId]/page.tsx`

**Distinción visual respecto al drawer**: el modal intercept usa `scale 0.94 → 1 + fade`, no slide. El drawer (deep-link `/tareas/[id]`) sigue siendo slide.

- Curva: `var(--ease-linear)` · `var(--duration-base)`.
- URL pill de feedback (`/tareas/abc`) en la esquina superior izquierda del modal — opacity 0→1 + translateY -4→0 con delay 60ms.
- Cierre: ESC, backdrop click, browser back-button.

### 5.3 Kanban DnD — `components/kanban/{board-classic,column,card}.tsx` + `hooks/use-move-task.ts`

**Drag start.**
- `body { cursor: grabbing }` global (hoy sólo en la card).
- Overlay: `rotate(2deg) scale(1.05)` + shadow rica.

**Hover sobre columna durante drag.**
- Columna `over` recibe `border-primary` + `bg-primary/3%` + `transition-colors var(--duration-fast)`.

**Landing FLIP.**
- Cada `<TaskCard>` envuelta en `<m.div layout="position">` (motion).
- Al soltar, las cards vecinas se reacomodan suavemente en lugar de saltar.
- Duración: `var(--duration-slow)` con `var(--ease-linear)`.

**Status flash (post-drop exitoso).**
- `useMoveTask` resuelve OK → la columna destino recibe atributo `data-flashed` durante 250ms.
- CSS: `data-flashed` activa `@keyframes column-flash` que pulsa `box-shadow inset` + `bg` en el color del status (Done verde, In Progress morado, etc.).
- En reduced-motion: sólo cambio de color sin animación.

### 5.4 Microinteracciones (L2 Crafted) — sistema

| Elemento | Hover | Active / Focus |
|----------|-------|----------------|
| Button primary | bg dim · `translateY(-0.5px)` · shadow grow | `scale(0.98)` · 80ms |
| Button ghost | bg `#f7f7f8` · border `#d4d4d8` | `scale(0.98)` |
| TaskCard | border `#c9cbe8` · shadow-md · `translateY(-1px)` | cursor grab |
| nav-item | bg `black/5%` | active: indicator bar 2px (FLIP via motion) |
| pill / tag | bg tinted · border `#c9cbe8` | `scale(0.97)` |
| Input / Textarea | border `#d4d4d8` | focus: ring 2px primary + offset 1px |

Todo aplicado con `transition-[transform,box-shadow,background,border-color] duration-base ease-linear` en los componentes base.

### 5.5 Sidebar sliding indicator — `components/shell/{nav-item,sidebar}.tsx`

```tsx
{items.map(item => (
  <NavItem key={item.href} active={pathname === item.href}>
    {pathname === item.href && (
      <m.div
        layoutId="active-indicator"
        className="absolute left-0 w-0.5 inset-y-1 bg-primary rounded"
      />
    )}
    {item.label}
  </NavItem>
))}
```

`motion`'s `layoutId` calcula el FLIP automáticamente cuando `pathname` cambia. Cero medición/scroll manual. Reduced-motion: el indicator salta sin animar.

### 5.6 Search ⌘K — `components/search/{search-results,search-filter-pills,search-no-results}.tsx`

**Stagger de resultados.**
- Cada row: `animate-in fade-in slide-in-from-bottom-1` (tw-animate-css) + `style={{ animationDelay: `${i * 40}ms` }}`.
- Sin `motion` aquí — el patrón es estático y leve.

**Match highlight.**
- Util nuevo: `lib/search/highlight.ts` con `highlightMatch(text, query)` retornando JSX con `<mark>` estilizados (`bg-amber-100 text-amber-700 font-semibold rounded-sm px-0.5`).

**Keyboard nav.**
- Arrow up/down: row activo gana `ring-1 ring-primary/30`.
- `scrollIntoView({ block: 'nearest' })` en cada cambio.

**Filter pills.**
- L2 Crafted aplicado: hover tint, active scale(0.97).

**Empty state.**
- Usa el componente reutilizable `<EmptyState>` (sección 5.9).

### 5.7 Loading crossfade + page transitions — `app/(app)/layout.tsx` + `app/(app)/*/loading.tsx`

**Skeleton → real content.**
- Wrapper con `view-transition-name` en cada `loading.tsx` y su contenido equivalente.
- React 19 `<Suspense>` resuelve → browser hace crossfade nativo via View Transitions API.

**Page transitions.**
- `app/(app)/layout.tsx` envuelve `{children}` en un wrapper que aplica `view-transition-name: main-content` al main area.
- Easing global definido vía CSS `::view-transition-old(*)` y `::view-transition-new(*)` con `animation-duration: var(--duration-base)` + `animation-timing-function: var(--ease-linear)`.
- Si Next 16 expone un helper estable (`unstable_ViewTransition` o similar), lo usamos; de lo contrario implementamos vía `document.startViewTransition()` en un client wrapper invocado en cambios de `pathname`.
- Scope: sólo main content area — sidebar y topbar permanecen quietos (no reciben `view-transition-name`).

**Fallback** (browsers sin View Transitions API):

```css
@supports not (view-transition-name: x) {
  main { animation: page-fade-in var(--duration-base) var(--ease-linear); }
}
@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

### 5.8 Done celebration — `components/kanban/task-status-pill.tsx` + `components/motion/done-celebration.tsx` (nuevo)

Detección: `usePrevious(status)`. Cuando `prev !== 'Done' && current === 'Done'`:

1. **Color tween** 250ms (gris → verde).
2. **Pill scale** 1 → 1.04 → 1 con `var(--ease-spring)`.
3. **Checkmark SVG**: scale 0 → 1.2 → 1 (350ms spring).
4. **4 partículas confeti** dispersándose 600ms en ángulos random (motion).

Reduced-motion: sólo el color tween. Los demás cambios de status (no-Done) usan el L2 estándar sin celebración.

### 5.9 Empty states reutilizables — `components/common/empty-state.tsx` (nuevo)

```tsx
<EmptyState
  icon="📋"
  title="No hay tareas todavía"
  description="Crea la primera para empezar"
  action={<Button>+ Nueva tarea</Button>}
/>
```

- Icono dentro de un `div` 48×48 con `bg-gradient-to-br from-primary-soft to-purple-100`.
- `animate-bob` (keyframe local 2.4s, ±3px en eje Y).
- Reduced-motion: sin bob.
- Usado en: `tareas/page.tsx`, `proyectos/page.tsx`, `wiki/page.tsx`, `search-no-results.tsx`, sprint vacío, reuniones vacío.

## 6. Cambios de archivo

```
docs/superpowers/specs/2026-04-26-ux-motion-polish-design.md   [NEW]

# Foundation
app/globals.css                                                [EDIT]  motion tokens

# UI primitives
components/ui/button.tsx                                       [EDIT]  L2 lift + press
components/ui/sheet.tsx                                        [EDIT]  tokens + blur backdrop
components/ui/dialog.tsx                                       [EDIT]  tokens + scale
components/ui/input.tsx                                        [EDIT]  focus ring 2px
components/ui/textarea.tsx                                     [EDIT]  focus ring 2px

# Motion utilities
components/motion/m.tsx                                        [NEW]   lazy motion wrapper
components/motion/done-celebration.tsx                         [NEW]   confeti + checkmark
components/common/empty-state.tsx                              [NEW]   reusable empty

# Kanban
components/kanban/board-classic.tsx                            [EDIT]  drop hover, cursor
components/kanban/column.tsx                                   [EDIT]  data-flashed, over state
components/kanban/card.tsx                                     [EDIT]  layout=position, overlay
components/kanban/task-drawer.tsx                              [EDIT]  header stagger
components/kanban/task-status-pill.tsx                         [EDIT]  Done celebration
hooks/use-move-task.ts                                         [EDIT]  trigger flash post-resolve

# Shell
components/shell/sidebar.tsx                                   [EDIT]  layoutId scope
components/shell/nav-item.tsx                                  [EDIT]  sliding indicator
components/projects/project-card.tsx                           [EDIT]  L2 hover

# Search
components/search/search-results.tsx                           [EDIT]  stagger + highlight
components/search/search-filter-pills.tsx                      [EDIT]  L2 pills
components/search/search-no-results.tsx                        [EDIT]  use EmptyState
lib/search/highlight.ts                                        [NEW]   match highlight util

# App-level
app/(app)/layout.tsx                                           [EDIT]  ViewTransition wrapper
app/(app)/tareas/page.tsx                                      [EDIT]  use EmptyState
app/(app)/proyectos/page.tsx                                   [EDIT]  use EmptyState
app/(app)/wiki/page.tsx                                        [EDIT]  use EmptyState

# Tests + tooling
__tests__/motion-tokens.test.ts                                [NEW]
__tests__/reduced-motion.test.ts                               [NEW]
scripts/check-motion-tokens.sh                                 [NEW]   lint hardcoded ms
package.json                                                   [EDIT]  add `motion`
```

## 7. Testing & accesibilidad

**Reduced motion.**
- Tests con `matchMedia('(prefers-reduced-motion: reduce)')` mockeado.
- Verifican que duraciones colapsan a `0ms` y que `motion` respeta `useReducedMotion()`.

**Visual regression (opcional).**
- Playwright + screenshots por surface clave (drawer abierto, kanban dragging, modal intercept, search abierto).

**Lint rule.**
- `scripts/check-motion-tokens.sh`: regex que rechaza `duration-[0-9]+ms` y `transition-duration:\s*[0-9]+ms` fuera de `globals.css`. Se corre en CI.

**Bundle budget.**
- Añadir `motion` (~5kB gz). Falla CI si crece >7kB gz.

**Accesibilidad funcional.**
- Focus rings visibles (no se pierden con los hovers).
- Confetti y celebrations no bloquean interacción.
- `aria-live` no aplica (todo decorativo).

## 8. Plan de rollout — orden de PRs

1. **PR 1** · Motion tokens + reduced-motion media query (foundation, sin cambio visual)
2. **PR 2** · L2 Crafted: button/input/textarea/cards/pills (cobertura amplia, cero risk)
3. **PR 3** · Drawer + Dialog (slide curve + stagger + dialog scale)
4. **PR 4** · Sidebar sliding indicator
5. **PR 5** · Kanban FLIP + status flash + drop hover
6. **PR 6** · Search stagger + match highlight
7. **PR 7** · View Transitions + skeleton crossfade
8. **PR 8** · Done celebration + EmptyState component
9. **PR 9** · Tests + bundle budget + lint rule

Cada PR es independiente y mergeable; los later PRs se benefician de los earlier (todos consumen tokens del PR 1). Estimado total: **~2.5 días** de trabajo concentrado.

## 9. Riesgos & mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| `motion` crece más de lo esperado | Bundle budget en CI · usamos `motion/mini` y `motion/react/m` (lazy) |
| FLIP del kanban interfiere con `useSortable` | `layout="position"` (no `layout` total) · QA específico de drag |
| View Transitions API incompleta en Safari | `@supports not (view-transition-name: x)` fallback CSS |
| `prefers-reduced-motion` ignorado por motion | Tests dedicados · `useReducedMotion()` en cada wrapper de motion |
| `data-[state]` de base-ui choca con CSS custom | Documentar precedencia · usar tokens vía CSS vars (no Tailwind utilities directas en data-attrs) |
| `motion` lib package mismatch (existe también `motion-one` y `framer-motion`) | El package canónico es **`motion`** en npm (autor: framer / Matt Perry, sucesor de framer-motion). Spec lock: `npm i motion`, imports `motion/react`, `motion/react/m` |

## 10. Decisiones explícitamente fuera de scope

- **Drag-to-close del drawer (opción D del Q3)** — requiere lib extra (`vaul`/`use-gesture`) y QA cross-browser; rechazado a favor de simplicidad.
- **Parallax del fondo al abrir drawer (opción C del Q3)** — choca con kanban DnD activo; rechazado.
- **Spring overshoot global (Q2 opción C)** — choca con personalidad Linear; reservado sólo para Done celebration.
- **L3 Expressive (Q5)** — ripple/glow/big lifts; choca con power-user density.
- **Dark mode tweaks específicos** — los tokens funcionan en ambos temas; no hay overrides necesarios.
- **Mobile gestures (swipe back, pull-to-refresh)** — fuera de scope; el producto es web-first.
