# Tareas Detail Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar el rediseño aprobado en `docs/superpowers/specs/2026-04-26-tareas-detail-redesign-design.md`: eliminar el modal interceptado `@modal/(.)tareas/[id]`, reemplazar `<AnimatedMain key={pathname}>` por una primitiva opt-in `<PageEnter>`, y construir una página dedicada de detalle con layout 2-col (contenido + panel meta) más View Transitions API para la transición card → detalle.

**Architecture:** El layout `(app)` deja de envolver children con un componente que remonta on pathname change. Cada `page.tsx` opta por animar localmente con `<PageEnter>` (CSS-driven via `tw-animate-css`). La transición entre `/tareas` y `/tareas/[id]` usa la View Transitions API nativa (Next 15 experimental flag) con `viewTransitionName` en el título y chip de estado del card. La página `[taskId]` deja de ser un Sheet y pasa a ser un `<article>` full-page con grid responsive `[1fr_280px]` en `lg+` y banda compacta superior en `<lg`.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript strict, Tailwind v4, `tw-animate-css`, `motion` 11 (LazyMotion ya configurado), `base-ui` Dialog (no más usado para detalle), vitest + Testing Library.

**Convenciones del codebase a respetar:**
- Tokens motion en `app/globals.css` se consumen como `duration-(--duration-base)`, `ease-(--ease-linear)` — nunca hardcoded `duration-180ms`. Hay un guard `npm run check:motion` que falla CI.
- Pages renderizan `<Topbar />` arriba — no aplica al detalle (`tareas/[taskId]` no usa Topbar; el header de TaskDetail lo reemplaza).
- `requireContext()` (en `lib/auth/require-context.ts`) ya autentica en Server Components.
- Tests con `vitest` + `@testing-library/react` (jsdom). Setup en `vitest.setup.ts`.
- Componentes UI desde `@/components/ui/*`; helpers desde `@/components/motion/m`.
- Iconografía: `lucide-react`.

---

## File Structure

### New files

| Path | Responsibility |
|---|---|
| `components/motion/page-enter.tsx` | Primitiva opt-in para fade+slide enter de cada página. |
| `components/motion/__tests__/page-enter.test.tsx` | Test de render, className, delay. |
| `components/kanban/task-detail.tsx` | Root del detalle: layout 2-col, orchestration. |
| `components/kanban/task-detail-header.tsx` | Header sticky: botón "← Volver", breadcrumb, Esc handler, focus mgmt. |
| `components/kanban/__tests__/task-detail-header.test.tsx` | Test de navegación (router.back / push, Esc). |
| `components/kanban/task-detail-meta-panel.tsx` | Panel lateral de propiedades (lg+). |
| `components/kanban/task-detail-meta-strip.tsx` | Banda compacta de meta para `<lg`. |
| `app/(app)/tareas/[taskId]/loading.tsx` | Skeleton del detalle. |

### Modified files

| Path | Change |
|---|---|
| `next.config.ts` | Habilitar `experimental.viewTransition: true`. |
| `app/(app)/layout.tsx` | Quitar prop `modal`, quitar `<AnimatedMain>`, `<main>` simple. |
| `app/(app)/tareas/[taskId]/page.tsx` | Renderizar `<TaskDetail>` en lugar de `<TaskDrawer>`; quitar `closeMode`. |
| `components/kanban/card.tsx` | Añadir `viewTransitionName` al título y al chip de tipo en el `<Link>`. |
| `app/(app)/page.tsx` (home) | Wrap root en `<PageEnter>`. |
| `app/(app)/wiki/page.tsx` | Wrap root en `<PageEnter>` (donde aplica — si redirect, omitir). |
| `app/(app)/wiki/[pageId]/page.tsx` | Wrap root en `<PageEnter>`. |
| `app/(app)/proyectos/page.tsx` | Wrap root en `<PageEnter>`. |
| `app/(app)/reuniones/page.tsx` | Wrap root en `<PageEnter>`. |
| `app/(app)/reuniones/[meetingId]/page.tsx` | Wrap root en `<PageEnter>`. |
| `app/(app)/tareas/page.tsx` | Wrap root en `<PageEnter>`. |
| `app/(auth)/login/page.tsx` | Wrap root en `<PageEnter>` (sutil). |

### Deleted files

| Path | Reason |
|---|---|
| `app/(app)/@modal/default.tsx` | Slot del modal interceptado. |
| `app/(app)/@modal/(.)tareas/[taskId]/page.tsx` | Versión interceptada de la página de detalle. |
| `app/(app)/@modal/` (dir) | Vacío después de borrar contenido. |
| `components/motion/animated-main.tsx` | Reemplazado por `<PageEnter>` opt-in. |
| `components/kanban/task-drawer.tsx` | Reemplazado por `<TaskDetail>` y subcomponentes. |

---

## Task 1: Habilitar View Transitions API en Next.js

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Editar next.config.ts**

Reemplazar el contenido completo de `next.config.ts` con:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    viewTransition: true,
  },
};

export default nextConfig;
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificar dev server arranca**

Run: `npm run dev` (en otra terminal o background)
Expected: server arranca sin warnings sobre `viewTransition`.

Detener el dev server.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat(motion): enable Next 15 View Transitions API"
```

---

## Task 2: Crear primitiva `<PageEnter>` con tests

**Files:**
- Create: `components/motion/page-enter.tsx`
- Create: `components/motion/__tests__/page-enter.test.tsx`

- [ ] **Step 1: Escribir el test failing**

Crear `components/motion/__tests__/page-enter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageEnter } from '../page-enter';

describe('PageEnter', () => {
  it('renders children inside a wrapper div', () => {
    render(<PageEnter><span data-testid="child">hi</span></PageEnter>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('applies the enter animation classes', () => {
    const { container } = render(<PageEnter>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('animate-in');
    expect(wrapper.className).toContain('fade-in');
    expect(wrapper.className).toContain('slide-in-from-bottom-1');
  });

  it('merges custom className', () => {
    const { container } = render(<PageEnter className="custom-class">x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('custom-class');
  });

  it('applies animation-delay when delay prop is set', () => {
    const { container } = render(<PageEnter delay={120}>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.animationDelay).toBe('120ms');
  });

  it('does not set animation-delay when delay is 0 or omitted', () => {
    const { container } = render(<PageEnter>x</PageEnter>);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.animationDelay).toBe('');
  });
});
```

- [ ] **Step 2: Run test — verify failing**

Run: `npm run test:run -- components/motion/__tests__/page-enter.test.tsx`
Expected: FAIL — module not found `../page-enter`.

- [ ] **Step 3: Implementar PageEnter**

Crear `components/motion/page-enter.tsx`:

```tsx
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  className?: string;
  /** ms — `animation-delay` for staggered enters */
  delay?: number;
};

/**
 * Page-level enter animation. Each `page.tsx` opts in by wrapping its root.
 *
 * Replaces the old AnimatedMain (which keyed `<main>` on pathname and remounted
 * on every navigation, including parallel-route opens). Local opt-in means
 * pages preserve state across navigation while still animating on first mount.
 */
export function PageEnter({ children, className, delay = 0 }: Props) {
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

- [ ] **Step 4: Run test — verify passing**

Run: `npm run test:run -- components/motion/__tests__/page-enter.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Verify check:motion guard**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

- [ ] **Step 6: Commit**

```bash
git add components/motion/page-enter.tsx components/motion/__tests__/page-enter.test.tsx
git commit -m "feat(motion): add PageEnter primitive (opt-in page enter animation)"
```

---

## Task 3: Crear `<TaskDetailHeader>` con navegación + Esc

**Files:**
- Create: `components/kanban/task-detail-header.tsx`
- Create: `components/kanban/__tests__/task-detail-header.test.tsx`

- [ ] **Step 1: Escribir el test failing**

Crear `components/kanban/__tests__/task-detail-header.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetailHeader } from '../task-detail-header';

const mockBack = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

describe('TaskDetailHeader', () => {
  beforeEach(() => {
    mockBack.mockReset();
    mockPush.mockReset();
  });

  it('renders back button and breadcrumb crumbs', () => {
    render(
      <TaskDetailHeader
        crumbs={[{ label: 'App Mobile' }, { label: 'Sprint 24' }]}
      />,
    );
    expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument();
    expect(screen.getByText('Tareas')).toBeInTheDocument();
    expect(screen.getByText('App Mobile')).toBeInTheDocument();
    expect(screen.getByText('Sprint 24')).toBeInTheDocument();
  });

  it('calls router.back when back button is clicked and history exists', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    await user.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('calls router.push("/tareas") when there is no history', async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 1 } });
    render(<TaskDetailHeader crumbs={[]} />);
    await user.click(screen.getByRole('button', { name: /volver/i }));
    expect(mockPush).toHaveBeenCalledWith('/tareas');
  });

  it('triggers goBack on Escape key', () => {
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('does not trigger goBack on other keys', () => {
    Object.defineProperty(window, 'history', { configurable: true, value: { length: 5 } });
    render(<TaskDetailHeader crumbs={[]} />);
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(mockBack).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — verify failing**

Run: `npm run test:run -- components/kanban/__tests__/task-detail-header.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implementar TaskDetailHeader**

Crear `components/kanban/task-detail-header.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';

type Crumb = { label: string; href?: string };

type Props = {
  crumbs: Crumb[];
};

export function TaskDetailHeader({ crumbs }: Props) {
  const router = useRouter();
  const backRef = useRef<HTMLButtonElement>(null);

  function goBack() {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/tareas');
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    backRef.current?.focus();
  }, []);

  return (
    <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-white">
      <button
        ref={backRef}
        type="button"
        onClick={goBack}
        className="inline-flex items-center gap-1 px-2 py-1 -ml-2 rounded-md text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors duration-(--duration-fast) ease-(--ease-out-soft)"
        aria-label="Volver a Tareas"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Volver
      </button>
      <nav className="flex items-center gap-2 text-[13px] min-w-0">
        <Link href="/tareas" className="text-foreground font-medium hover:underline">
          Tareas
        </Link>
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-2 shrink-0">
            <span className="text-muted-foreground">/</span>
            {c.href ? (
              <Link href={c.href} className="text-muted-foreground hover:text-foreground truncate">
                {c.label}
              </Link>
            ) : (
              <span className="text-muted-foreground truncate">{c.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Run test — verify passing**

Run: `npm run test:run -- components/kanban/__tests__/task-detail-header.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Run check:motion**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

- [ ] **Step 6: Commit**

```bash
git add components/kanban/task-detail-header.tsx components/kanban/__tests__/task-detail-header.test.tsx
git commit -m "feat(tareas): add TaskDetailHeader with back nav and Esc handler"
```

---

## Task 4: Crear `<TaskDetailMetaPanel>` (panel lateral lg+)

**Files:**
- Create: `components/kanban/task-detail-meta-panel.tsx`

- [ ] **Step 1: Implementar TaskDetailMetaPanel**

Crear `components/kanban/task-detail-meta-panel.tsx`:

```tsx
import { Calendar, CalendarClock, CheckCircle2, Tag } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { TeamMember } from '@/schemas/team-member';

const PRIORITY_COLOR: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#5e6ad2',
  Low: '#8a8a91',
};

const PRIORITY_LABEL: Record<string, string> = {
  High: 'Alta',
  Medium: 'Media',
  Low: 'Baja',
};

const TAG_MAP: Record<string, string> = {
  Mobile: 'bg-[#eef4ff] text-[#3a5fcc]',
  Website: 'bg-[#f0f4e6] text-[#556c1d]',
  Improvement: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Marketing: 'bg-[#fceaea] text-[#a92f2f]',
  Research: 'bg-[#eeeffc] text-[#5e6ad2]',
  Branding: 'bg-[#faf0db] text-[#c78a2c]',
  Metrics: 'bg-[#e8f5ec] text-[#3f9f5c]',
  Meeting: 'bg-[#f7f7f8] text-[#57575c]',
  Email: 'bg-[#f7f7f8] text-[#57575c]',
  'Video production': 'bg-[#f4ecf8] text-[#7f3aa7]',
};

function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority] ?? '#8a8a91';
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Low' ? 10 : 6}
        width="4"
        height={priority === 'Low' ? 12 : 16}
        opacity={priority === 'Low' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'High' ? 6 : 2}
        width="4"
        height={priority === 'High' ? 16 : 20}
        opacity={priority === 'High' ? 1 : 0.3}
      />
    </svg>
  );
}

function formatRelative(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  const distance = formatDistanceToNowStrict(d, { locale: es, addSuffix: true });
  const exact = format(d, "d 'de' MMM", { locale: es });
  return `${exact} · ${distance}`;
}

type Props = {
  task: Task;
  project: Project | null;
  assignees: TeamMember[];
};

export function TaskDetailMetaPanel({ task, project, assignees }: Props) {
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <aside className="border-l border-border bg-[#fafafa] p-5 overflow-y-auto">
      <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground mb-3">
        Propiedades
      </div>

      <div className="flex flex-col gap-3.5 text-[12px]">
        <Field label="Estado">
          <TaskStatusPill taskId={task.id} status={task.status} />
        </Field>

        {task.priority && (
          <Field label="Prioridad">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f7f7f8] text-[11px] font-medium text-[#57575c]">
              <PriorityBars priority={task.priority} />
              {PRIORITY_LABEL[task.priority] ?? task.priority}
            </span>
          </Field>
        )}

        {progressPct !== null && (
          <Field label="Progreso">
            <span className="inline-flex items-center gap-2 text-[11px] text-foreground">
              <span className="relative w-20 h-1.5 rounded-full bg-[#eeeff1] overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 bg-[#5e6ad2]"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
              {progressPct}%
            </span>
          </Field>
        )}

        <Field label="Vencimiento" icon={<Calendar className="w-3 h-3" />}>
          <span className={cn(!task.dueDate && 'text-muted-foreground')}>
            {task.dueDate ? formatRelative(task.dueDate) : '—'}
          </span>
        </Field>

        <Field label="Planeado" icon={<CalendarClock className="w-3 h-3" />}>
          <span className={cn(!task.plannedDate && 'text-muted-foreground')}>
            {task.plannedDate ? formatRelative(task.plannedDate) : '—'}
          </span>
        </Field>

        {task.completedAt && (
          <Field label="Completado" icon={<CheckCircle2 className="w-3 h-3" />}>
            <span>{formatRelative(task.completedAt)}</span>
          </Field>
        )}

        <Field label="Asignados">
          {assignees.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {assignees.map((member) => (
                <span key={member.id} className="inline-flex items-center gap-2">
                  <AssigneeAvatar member={member} size={18} />
                  <span className="text-[11.5px] font-medium">{member.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Sin asignar</span>
          )}
        </Field>

        {task.tags.length > 0 && (
          <Field label="Tags" icon={<Tag className="w-3 h-3" />}>
            <span className="flex flex-wrap gap-1">
              {task.tags.map((t) => (
                <span
                  key={t}
                  className={cn(
                    'px-1.5 py-0.5 rounded text-[11px] font-medium',
                    TAG_MAP[t] ?? 'bg-[#f7f7f8] text-[#57575c]',
                  )}
                >
                  {t}
                </span>
              ))}
            </span>
          </Field>
        )}

        {project && (
          <Field label="Proyecto">
            <Link
              href={`/proyectos?project=${project.id}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5e6ad2] hover:underline"
            >
              {project.icon && <span>{project.icon}</span>}
              {project.name}
            </Link>
          </Field>
        )}
      </div>
    </aside>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificar check:motion**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

- [ ] **Step 4: Commit**

```bash
git add components/kanban/task-detail-meta-panel.tsx
git commit -m "feat(tareas): add TaskDetailMetaPanel (lg+ side panel)"
```

---

## Task 5: Crear `<TaskDetailMetaStrip>` (banda compacta para `<lg`)

**Files:**
- Create: `components/kanban/task-detail-meta-strip.tsx`

- [ ] **Step 1: Implementar TaskDetailMetaStrip**

Crear `components/kanban/task-detail-meta-strip.tsx`:

```tsx
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

const PRIORITY_COLOR: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#5e6ad2',
  Low: '#8a8a91',
};

const PRIORITY_LABEL: Record<string, string> = {
  High: 'Alta',
  Medium: 'Media',
  Low: 'Baja',
};

function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority] ?? '#8a8a91';
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Low' ? 10 : 6}
        width="4"
        height={priority === 'Low' ? 12 : 16}
        opacity={priority === 'Low' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'High' ? 6 : 2}
        width="4"
        height={priority === 'High' ? 16 : 20}
        opacity={priority === 'High' ? 1 : 0.3}
      />
    </svg>
  );
}

function formatShort(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  return format(d, "d MMM", { locale: es });
}

type Props = {
  task: Task;
  assignees: TeamMember[];
};

export function TaskDetailMetaStrip({ task, assignees }: Props) {
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <div className="lg:hidden border-b border-border bg-[#fafafa] px-6 py-3 flex items-center gap-3 flex-wrap text-[11.5px] text-foreground">
      <TaskStatusPill taskId={task.id} status={task.status} />

      {task.priority && (
        <span className="inline-flex items-center gap-1.5">
          <PriorityBars priority={task.priority} />
          {PRIORITY_LABEL[task.priority] ?? task.priority}
        </span>
      )}

      {progressPct !== null && (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <span className="relative w-12 h-1 rounded-full bg-[#eeeff1] overflow-hidden">
            <span className="absolute inset-y-0 left-0 bg-[#5e6ad2]" style={{ width: `${progressPct}%` }} />
          </span>
          {progressPct}%
        </span>
      )}

      {task.dueDate && (
        <span className={cn('text-muted-foreground')}>
          📅 {formatShort(task.dueDate)}
        </span>
      )}

      {assignees.length > 0 && (
        <span className="inline-flex items-center gap-1">
          {assignees.slice(0, 3).map((m) => (
            <AssigneeAvatar key={m.id} member={m} size={16} />
          ))}
          {assignees.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{assignees.length - 3}</span>
          )}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add components/kanban/task-detail-meta-strip.tsx
git commit -m "feat(tareas): add TaskDetailMetaStrip (compact meta for <lg)"
```

---

## Task 6: Crear `<TaskDetail>` (root del detalle)

**Files:**
- Create: `components/kanban/task-detail.tsx`

- [ ] **Step 1: Implementar TaskDetail**

Crear `components/kanban/task-detail.tsx`:

```tsx
import { ExternalLink } from 'lucide-react';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { PageEnter } from '@/components/motion/page-enter';
import { TaskDetailHeader } from './task-detail-header';
import { TaskDetailMetaPanel } from './task-detail-meta-panel';
import { TaskDetailMetaStrip } from './task-detail-meta-strip';
import { buttonVariants } from '@/components/ui/button';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { Sprint } from '@/schemas/sprint';
import type { TeamMember } from '@/schemas/team-member';

type Props = {
  task: Task;
  blocks: any[];
  project: Project | null;
  sprint: Sprint | null;
  assignees: TeamMember[];
};

export function TaskDetail({ task, blocks, project, sprint, assignees }: Props) {
  const crumbs = [
    ...(project ? [{ label: project.name, href: `/proyectos?project=${project.id}` }] : []),
    ...(sprint ? [{ label: sprint.name }] : []),
    ...(task.type ? [{ label: task.type }] : []),
  ];

  return (
    <article className="flex flex-col h-full overflow-hidden">
      <TaskDetailHeader crumbs={crumbs} />

      <TaskDetailMetaStrip task={task} assignees={assignees} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        {/* Main column */}
        <div className="overflow-y-auto bg-white">
          <div className="max-w-[720px] mx-auto px-8 py-8">
            <h1
              tabIndex={-1}
              className="text-[26px] font-semibold tracking-[-0.015em] leading-[1.2] mb-3 outline-none"
              style={{ viewTransitionName: `task-${task.id}-title` }}
            >
              {task.title}
            </h1>

            <hr className="border-border mt-6 mb-6" />

            <PageEnter delay={120}>
              {blocks.length > 0 ? (
                <div className="text-[14px]">
                  <BlocksRenderer blocks={blocks} />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
              )}
            </PageEnter>
          </div>
        </div>

        {/* Meta panel (lg+) */}
        <div className="hidden lg:block">
          <TaskDetailMetaPanel task={task} project={project} assignees={assignees} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2.5 border-t border-border bg-[#fafafa] flex items-center justify-between shrink-0">
        <span className="text-[11px] text-muted-foreground">
          Esc para volver
        </span>
        <a
          href={task.url}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants({ variant: 'outline', size: 'sm' })}
        >
          Abrir en Notion <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
        </a>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores. Si `viewTransitionName` da error de tipo en `style`, añadir `as React.CSSProperties`:

```tsx
style={{ viewTransitionName: `task-${task.id}-title` } as React.CSSProperties}
```

- [ ] **Step 3: Verificar check:motion**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

- [ ] **Step 4: Commit**

```bash
git add components/kanban/task-detail.tsx
git commit -m "feat(tareas): add TaskDetail root component (2-col layout + view-transition)"
```

---

## Task 7: Conectar `<TaskDetail>` a `/tareas/[taskId]/page.tsx`

> **Nota:** En esta tarea aún NO borramos el modal. La página directa (`/tareas/[taskId]`) usará TaskDetail; el modal interceptado seguirá usando TaskDrawer hasta la Task 9. Esto permite verificar TaskDetail antes de eliminar el patrón viejo.

**Files:**
- Modify: `app/(app)/tareas/[taskId]/page.tsx`

- [ ] **Step 1: Reemplazar el contenido de la page**

Reemplazar `app/(app)/tareas/[taskId]/page.tsx` con:

```tsx
import { requireContext } from '@/lib/auth/require-context';
import { getTask } from '@/lib/notion/tasks';
import { getBlocks } from '@/lib/notion/blocks';
import { getProject } from '@/lib/notion/projects';
import { getSprint } from '@/lib/notion/sprints';
import { getTeamMembers } from '@/lib/notion/team';
import { notFound } from 'next/navigation';
import { TaskDetail } from '@/components/kanban/task-detail';

export const dynamic = 'force-dynamic';

export default async function TaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const ctx = await requireContext();
  const { taskId } = await params;

  const task = await getTask(taskId);
  if (!task || task.customerId !== ctx.customerId) notFound();

  const [blocks, project, sprint, assignees] = await Promise.all([
    getBlocks(taskId),
    task.projectId ? getProject(task.projectId) : Promise.resolve(null),
    task.sprintId ? getSprint(task.sprintId) : Promise.resolve(null),
    getTeamMembers(task.assigneeIds),
  ]);

  return (
    <TaskDetail
      task={task}
      blocks={blocks}
      project={project}
      sprint={sprint}
      assignees={assignees}
    />
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`
Abrir el browser en `http://localhost:3000/tareas`
- Click en una tarjeta — debe abrir el modal interceptado (Sheet) como antes (sigue funcionando porque el slot @modal todavía existe).
- Acceder directo a `http://localhost:3000/tareas/<task-id>` (sin venir del kanban) — debe ver la nueva página dedicada con layout 2-col, header con "← Volver", panel meta a la derecha.
- Click en "← Volver" — vuelve a `/tareas`.
- Press Esc — vuelve a `/tareas`.

Detener el dev server.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/tareas/\[taskId\]/page.tsx
git commit -m "feat(tareas): wire TaskDetail to /tareas/[id] direct route"
```

---

## Task 8: Crear `loading.tsx` para el detalle

**Files:**
- Create: `app/(app)/tareas/[taskId]/loading.tsx`

- [ ] **Step 1: Implementar loading skeleton**

Crear `app/(app)/tareas/[taskId]/loading.tsx`:

```tsx
export default function Loading() {
  return (
    <article className="flex flex-col h-full overflow-hidden">
      {/* Header skeleton */}
      <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-white">
        <div className="h-5 w-16 bg-[#f7f7f8] rounded animate-pulse" />
        <div className="h-4 w-12 bg-[#eeeff1] rounded animate-pulse" />
        <span className="text-muted-foreground">/</span>
        <div className="h-4 w-24 bg-[#f7f7f8] rounded animate-pulse" />
      </div>

      {/* Body skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-y-auto bg-white">
          <div className="max-w-[720px] mx-auto px-8 py-8">
            <div className="h-7 w-3/4 bg-[#eeeff1] rounded animate-pulse mb-3" />
            <hr className="border-border mt-6 mb-6" />
            <div className="space-y-3">
              <div className="h-3 w-full bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-full bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-4/6 bg-[#f7f7f8] rounded animate-pulse" />
            </div>
          </div>
        </div>

        <aside className="hidden lg:block border-l border-border bg-[#fafafa] p-5">
          <div className="h-3 w-20 bg-[#e1e1e4] rounded animate-pulse mb-4" />
          <div className="flex flex-col gap-3.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-2.5 w-16 bg-[#eeeff1] rounded animate-pulse mb-1.5" />
                <div className="h-4 w-24 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/tareas/\[taskId\]/loading.tsx
git commit -m "feat(tareas): add loading skeleton for task detail page"
```

---

## Task 9: Eliminar el modal interceptado y AnimatedMain

**Files:**
- Delete: `app/(app)/@modal/(.)tareas/[taskId]/page.tsx`
- Delete: `app/(app)/@modal/default.tsx`
- Delete: `app/(app)/@modal/` (dir)
- Delete: `components/motion/animated-main.tsx`
- Delete: `components/kanban/task-drawer.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Borrar el slot @modal**

```bash
rm "app/(app)/@modal/(.)tareas/[taskId]/page.tsx"
rm "app/(app)/@modal/default.tsx"
rmdir "app/(app)/@modal/(.)tareas/[taskId]"
rmdir "app/(app)/@modal/(.)tareas"
rmdir "app/(app)/@modal"
```

- [ ] **Step 2: Borrar AnimatedMain y TaskDrawer**

```bash
rm components/motion/animated-main.tsx
rm components/kanban/task-drawer.tsx
```

- [ ] **Step 3: Reemplazar `app/(app)/layout.tsx`**

Reemplazar el contenido completo con:

```tsx
import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { SearchProvider } from '@/components/search/search-provider';
import { Toaster } from 'sonner';
import { LazyMotion, domMax, MotionConfig } from '@/components/motion/m';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  return (
    <>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <SearchProvider customerId={ctx.customerId}>
            <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
              <Sidebar context={ctx} />
              <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white">
                {children}
              </main>
            </div>
          </SearchProvider>
        </MotionConfig>
      </LazyMotion>
      <Toaster position="bottom-right" />
    </>
  );
}
```

- [ ] **Step 4: Verificar zero references**

Run: `grep -rn "AnimatedMain\|animated-main\|TaskDrawer\|task-drawer\|@modal" app/ components/ 2>/dev/null`
Expected: sin output (zero references).

- [ ] **Step 5: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 6: Verificar build**

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 7: Verificación manual**

Run: `npm run dev`
- Abrir `http://localhost:3000/tareas`.
- Click en una tarjeta — ahora debe navegar a la página dedicada (no a un modal/Sheet).
- Esc, "← Volver", click en breadcrumb "Tareas", browser back — los 4 deben volver al kanban.
- Verificar: el kanban preserva scroll y secciones colapsadas (BoardByPerson) al volver.
- Refresh en `/tareas/<id>` directo (deep-link) — debe cargar correctamente.

Detener el dev server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "refactor(motion): remove intercepted modal + AnimatedMain (replaced by TaskDetail page)"
```

---

## Task 10: Añadir `viewTransitionName` al card y wire transition

**Files:**
- Modify: `components/kanban/card.tsx`

- [ ] **Step 1: Editar el `<Link>` del card**

En `components/kanban/card.tsx`, localizar el `<Link href={\`/tareas/${task.id}\`}>` (línea ~173) y añadir `style` al Link:

```tsx
<Link
  href={`/tareas/${task.id}`}
  onPointerDown={(e) => e.stopPropagation()}
  style={{ viewTransitionName: `task-${task.id}-title` } as React.CSSProperties}
  className={cn(
    'block text-[13px] leading-tight mb-2 hover:underline',
    isDone && 'line-through text-muted-foreground',
  )}
>
  {task.title}
</Link>
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificación manual de la transición**

Run: `npm run dev`
- Abrir `http://localhost:3000/tareas` en Chrome (View Transitions soportado).
- Click en una tarjeta — observar: el título debe interpolarse suavemente desde el card hasta el header del detalle (efecto morphing).
- Volver, repetir con varias tarjetas.
- Probar también en Firefox (sin soporte): debe funcionar pero sin morphing — la descripción se anima con `<PageEnter>` (fade-in 120ms delay).

Detener el dev server.

- [ ] **Step 4: Commit**

```bash
git add components/kanban/card.tsx
git commit -m "feat(motion): wire view-transition-name on card → task detail"
```

---

## Task 11: Aplicar `<PageEnter>` a las rutas restantes

> **Nota:** Una página por step para mantener el commit pequeño y permitir rollback.

**Files:**
- Modify: `app/(app)/page.tsx`
- Modify: `app/(app)/tareas/page.tsx`
- Modify: `app/(app)/wiki/[pageId]/page.tsx`
- Modify: `app/(app)/proyectos/page.tsx`
- Modify: `app/(app)/reuniones/page.tsx`
- Modify: `app/(app)/reuniones/[meetingId]/page.tsx`
- Modify: `app/(auth)/login/page.tsx`

> `app/(app)/wiki/page.tsx` no requiere cambio: su return path es `redirect()` o un EmptyState — ningún caso necesita PageEnter.

- [ ] **Step 1: Wrap home (`app/(app)/page.tsx`)**

Localizar el `return (` y envolver el JSX raíz en `<PageEnter>`. El patrón:

1. Añadir import: `import { PageEnter } from '@/components/motion/page-enter';`
2. Cambiar el `return ( <> ... </> )` por `return ( <PageEnter> <> ... </> </PageEnter> )` o `return ( <PageEnter className="..."> ... </PageEnter> )`.

Ejemplo concreto para home:

```tsx
import { PageEnter } from '@/components/motion/page-enter';
// ... otros imports

export default async function HomePage() {
  // ... lógica igual
  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: 'Inicio' }]} />
      {/* ... resto del contenido */}
    </PageEnter>
  );
}
```

(Ajustar el className para que el wrapper no rompa el `flex flex-col` que el `<main>` espera. Si el contenido ya está envuelto en un fragment `<>`, mover el `flex flex-col h-full` al PageEnter.)

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Run: `npm run dev`. Navegar a `/`. La página debe tener un fade+slide sutil al cargar.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/page.tsx
git commit -m "feat(motion): wrap home page in PageEnter"
```

- [ ] **Step 5: Repetir para `app/(app)/tareas/page.tsx`**

Mismo patrón. El return actual es:

```tsx
return (
  <>
    <Topbar crumbs={[...]}>
      <ScopePill ... />
    </Topbar>
    <KanbanView ... />
  </>
);
```

Cambiar a:

```tsx
return (
  <PageEnter className="flex flex-col h-full overflow-hidden">
    <Topbar crumbs={[...]}>
      <ScopePill ... />
    </Topbar>
    <KanbanView ... />
  </PageEnter>
);
```

Añadir el import. Verificar visualmente. Commit:

```bash
git add app/\(app\)/tareas/page.tsx
git commit -m "feat(motion): wrap /tareas in PageEnter"
```

- [ ] **Step 6: Repetir para `app/(app)/wiki/[pageId]/page.tsx`**

El return actual envuelve un fragment con la cover y el `<article>`. Envolver el fragment entero en `<PageEnter>`. Commit:

```bash
git add app/\(app\)/wiki/\[pageId\]/page.tsx
git commit -m "feat(motion): wrap wiki detail in PageEnter"
```

- [ ] **Step 7: Repetir para `app/(app)/proyectos/page.tsx`**

```bash
git add app/\(app\)/proyectos/page.tsx
git commit -m "feat(motion): wrap /proyectos in PageEnter"
```

- [ ] **Step 8: Repetir para `app/(app)/reuniones/page.tsx` y `[meetingId]/page.tsx`**

Ambas en commits separados:

```bash
git add app/\(app\)/reuniones/page.tsx
git commit -m "feat(motion): wrap /reuniones in PageEnter"
```

```bash
git add app/\(app\)/reuniones/\[meetingId\]/page.tsx
git commit -m "feat(motion): wrap reuniones detail in PageEnter"
```

- [ ] **Step 9: Wrap `app/(auth)/login/page.tsx`**

El return abre con un `<div className="min-h-screen grid ...">` — envolver ese div en `<PageEnter>` directamente, o mover las clases del div al PageEnter.

```tsx
import { PageEnter } from '@/components/motion/page-enter';
// ...
return (
  <PageEnter className="min-h-screen grid grid-cols-1 md:grid-cols-[1fr_520px]">
    {/* el contenido del div original, sin el outer wrapper */}
  </PageEnter>
);
```

```bash
git add app/\(auth\)/login/page.tsx
git commit -m "feat(motion): wrap login in PageEnter"
```

- [ ] **Step 10: Final typecheck + check:motion**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

---

## Task 12: Verificación manual final + tests completos

**Files:** ninguno modificado — solo verificación.

- [ ] **Step 1: Suite de tests completa**

Run: `npm run test:run`
Expected: todos los tests pasan. Si algún test pre-existente sobre TaskDrawer falla, eliminar ese test (TaskDrawer ya no existe).

- [ ] **Step 2: Build de producción**

Run: `npm run build`
Expected: build exitoso, sin warnings nuevos sobre `viewTransition`.

- [ ] **Step 3: Smoke manual completo**

Run: `npm run dev`. Probar en orden:

1. **Login** — navegar a `/login`, verificar fade-in suave.
2. **Home** — login, redirect a `/`, verificar fade-in.
3. **Tareas → detalle** (View Transition):
   - `/tareas` → click en una tarjeta → observar morphing del título.
   - Ver "← Volver" enfocado al cargar (anillo de focus visible al pulsar Tab).
   - Press Esc → vuelve.
   - Click en breadcrumb "Tareas" → vuelve.
   - Click en "← Volver" → vuelve.
   - Browser back → vuelve.
4. **Estado del kanban se preserva**:
   - En `/tareas` con scope = "team", colapsar una sección de BoardByPerson.
   - Hacer scroll hacia abajo.
   - Click en una tarea → ir al detalle.
   - Volver con Esc — la sección debe seguir colapsada y el scroll en su posición.
5. **Deep-link**:
   - Refresh en `/tareas/<id>` — debe cargar el loading skeleton brevemente y luego el detalle.
6. **Responsive**:
   - Achicar el viewport a < 1024px en el detalle — el meta panel debe colapsar a banda compacta arriba.
7. **Reduced motion**:
   - Activar `prefers-reduced-motion: reduce` en DevTools (Rendering tab → "Emulate CSS media feature prefers-reduced-motion").
   - Navegar a `/tareas` → click tarjeta → no debe haber animaciones.
8. **Otras rutas**:
   - `/wiki/<id>`, `/proyectos`, `/reuniones`, `/reuniones/<id>` — todas con fade-in al entrar.

Detener el dev server.

- [ ] **Step 4: Verificar zero referencias residuales**

Run:
```bash
grep -rn "AnimatedMain\|animated-main\|TaskDrawer\|task-drawer\|closeMode\|@modal" app/ components/
```
Expected: sin output.

- [ ] **Step 5: Verificar guard de motion**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.`

- [ ] **Step 6: Commit final (si quedó algo) + push**

Si hubo limpieza de tests obsoletos:

```bash
git add -A
git commit -m "chore(tests): remove obsolete TaskDrawer tests"
```

Si todo limpio, no hay commit final.

---

## Resumen de commits esperados

```
feat(motion): enable Next 15 View Transitions API
feat(motion): add PageEnter primitive (opt-in page enter animation)
feat(tareas): add TaskDetailHeader with back nav and Esc handler
feat(tareas): add TaskDetailMetaPanel (lg+ side panel)
feat(tareas): add TaskDetailMetaStrip (compact meta for <lg)
feat(tareas): add TaskDetail root component (2-col layout + view-transition)
feat(tareas): wire TaskDetail to /tareas/[id] direct route
feat(tareas): add loading skeleton for task detail page
refactor(motion): remove intercepted modal + AnimatedMain (replaced by TaskDetail page)
feat(motion): wire view-transition-name on card → task detail
feat(motion): wrap home page in PageEnter
feat(motion): wrap /tareas in PageEnter
feat(motion): wrap wiki detail in PageEnter
feat(motion): wrap /proyectos in PageEnter
feat(motion): wrap /reuniones in PageEnter
feat(motion): wrap reuniones detail in PageEnter
feat(motion): wrap login in PageEnter
chore(tests): remove obsolete TaskDrawer tests   (si aplica)
```

~17 commits. Cada uno verificable por sí solo. Rollback granular posible.
