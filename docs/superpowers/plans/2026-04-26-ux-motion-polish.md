# UX Motion Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply systemic motion polish across 10 surfaces of the notion-hub (drawer, kanban DnD, modal intercept, sidebar, search, loading, page transitions, status pill, microinteractions, empty states) with the Linear-snappy personality + selective Apple-spring celebrations.

**Architecture:** Three layers — motion tokens (CSS vars in `globals.css` exposed to Tailwind v4), CSS animations (Tailwind utilities + `tw-animate-css` + base-ui `data-[state]`) for 80% of cases, and `motion` (npm package, ~5 kB gz) lazy-loaded only for stagger / FLIP / particle physics. Reduced-motion guard via media query at the token layer.

**Tech Stack:** Next 16 · React 19 · Tailwind v4 · `@base-ui/react` · `@dnd-kit` · `tw-animate-css` (existing) · **`motion` ^11** (new dep, ~5 kB gz tree-shaken via `motion/react/m`) · Vitest + jsdom · Playwright (optional, for visual regression).

**Spec:** `docs/superpowers/specs/2026-04-26-ux-motion-polish-design.md`

---

## File Structure

This decomposition is locked in before any task begins.

```
NEW
├── components/motion/m.tsx                          # Lazy <m.div> wrapper, useReducedMotion re-export
├── components/motion/done-celebration.tsx           # Confetti + checkmark on Done
├── components/common/empty-state.tsx                # Reusable empty state (icon + title + desc + CTA)
├── lib/search/highlight.ts                          # highlightMatch util for search results
├── __tests__/motion/tokens.test.ts                  # Asserts CSS vars defined
├── __tests__/motion/reduced-motion.test.ts          # Asserts media query collapses durations
├── __tests__/motion/empty-state.test.tsx            # EmptyState renders icon + title + CTA
├── __tests__/search/highlight.test.ts               # highlightMatch behavior
└── scripts/check-motion-tokens.sh                   # CI lint: rejects hardcoded duration-Xms

EDIT
├── app/globals.css                                  # Motion tokens (foundation)
├── app/(app)/layout.tsx                             # ViewTransition wrapper for main
├── app/(app)/tareas/page.tsx                        # use <EmptyState>
├── app/(app)/proyectos/page.tsx                     # use <EmptyState>
├── app/(app)/wiki/page.tsx                          # use <EmptyState>
├── components/ui/button.tsx                         # L2: lift + press scale
├── components/ui/sheet.tsx                          # tokens, blur backdrop, slide distance
├── components/ui/dialog.tsx                         # tokens, scale curve
├── components/ui/input.tsx                          # focus ring 2px (token-driven)
├── components/ui/textarea.tsx                       # focus ring 2px (token-driven)
├── components/kanban/board-classic.tsx              # cursor: grabbing global, drop hover
├── components/kanban/column.tsx                     # data-flashed flash, over state
├── components/kanban/card.tsx                       # layout=position, overlay scale, L2 hover
├── components/kanban/task-drawer.tsx                # header stagger via <m>
├── components/kanban/task-status-pill.tsx           # Done celebration
├── components/projects/project-card.tsx             # L2 hover lift
├── components/shell/sidebar.tsx                     # LayoutGroup wrapper
├── components/shell/nav-item.tsx                    # sliding indicator (layoutId)
├── components/search/search-results.tsx             # stagger + highlight (NOTE: file may not exist; see Task 6.1)
├── components/search/search-filter-pills.tsx        # L2 pills hover
├── components/search/search-no-results.tsx          # use <EmptyState>
├── hooks/use-move-task.ts                           # trigger flash callback post-resolve
└── package.json                                     # add motion ^11
```

---

## Task Sequencing

Tasks are grouped by PR. Each PR is mergeable independently. Inside a PR, tasks must run in order. Across PRs, tasks 1.x must complete before any 2.x–8.x (everyone consumes tokens). Tasks within PRs 2–8 are independent and can be parallelized after PR 1 lands.

**Estimated total: ~2.5 days of concentrated work.**

---

## PR 1 — Motion Tokens Foundation

### Task 1.1: Add motion tokens to globals.css

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Read the current globals.css**

Run: confirm the `@theme inline` block exists and ends at line ~52.

- [ ] **Step 2: Add motion tokens inside `@theme inline`**

Edit `app/globals.css` — at the end of the existing `@theme inline { ... }` block (just before the closing `}` on line 52), append:

```css
  /* Motion durations */
  --duration-instant: 80ms;
  --duration-fast: 120ms;
  --duration-base: 180ms;
  --duration-slow: 240ms;
  --duration-celebrate: 320ms;

  /* Motion easings */
  --ease-linear: cubic-bezier(0.32, 0.72, 0, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-out-soft: cubic-bezier(0.4, 0, 0.2, 1);
```

- [ ] **Step 3: Add reduced-motion override after `:root`**

After the closing `}` of the `:root { ... }` block (after line ~83), append:

```css
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

- [ ] **Step 4: Verify Tailwind picks up tokens**

Run: `npm run dev` (in background), open any page, check the computed CSS in DevTools shows the variables on `:root`. Then stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(motion): add motion duration and easing tokens"
```

---

### Task 1.2: Add motion package dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install motion**

Run:
```bash
npm install motion@^11
```

- [ ] **Step 2: Verify import works**

Run:
```bash
node --input-type=module -e "import('motion/react').then(m => console.log(Object.keys(m).slice(0,5)))"
```
Expected: array of motion exports including `motion`, `AnimatePresence`, `useReducedMotion`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(motion): add motion package dep"
```

---

### Task 1.3: Create motion wrapper component

**Files:**
- Create: `components/motion/m.tsx`

- [ ] **Step 1: Write the wrapper**

Create `components/motion/m.tsx`:

```tsx
'use client';

/**
 * Lazy re-export of `motion/react/m` for tree-shaking.
 *
 * Use `<m.div>` instead of `<motion.div>` in feature code — same API,
 * only loads the features explicitly added via LazyMotion (none yet).
 *
 * Why: pure CSS handles 80% of motion in this codebase. JS-driven motion
 * is reserved for stagger, FLIP, and particle physics. Keeping bundle
 * minimal is the contract.
 */
export { m, LazyMotion, domAnimation, useReducedMotion, AnimatePresence, LayoutGroup } from 'motion/react';
```

- [ ] **Step 2: Verify it type-checks**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/motion/m.tsx
git commit -m "feat(motion): add lazy m wrapper"
```

---

### Task 1.4: Add LazyMotion provider to app layout

**Files:**
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Edit the layout**

Wrap the existing return body with `<LazyMotion features={domAnimation} strict>`:

```tsx
import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { SearchProvider } from '@/components/search/search-provider';
import { Toaster } from 'sonner';
import { LazyMotion, domAnimation } from '@/components/motion/m';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const ctx = await requireContext();
  return (
    <LazyMotion features={domAnimation} strict>
      <SearchProvider customerId={ctx.customerId}>
        <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
          <Sidebar context={ctx} />
          <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white">
            {children}
          </main>
        </div>
        {modal}
      </SearchProvider>
      <Toaster position="bottom-right" />
    </LazyMotion>
  );
}
```

- [ ] **Step 2: Run dev and verify no console errors**

Run: `npm run dev` in background, navigate to `/`, check DevTools Console.
Expected: No errors. Page renders normally.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat(motion): wire LazyMotion provider"
```

---

## PR 2 — L2 Crafted Microinteractions

### Task 2.1: Update button with L2 lift + press

**Files:**
- Modify: `components/ui/button.tsx`

- [ ] **Step 1: Replace base classes in cva**

In `buttonVariants` (line 6), replace the long base string with the version below. The change: replace `transition-all` with the explicit token-driven transition, and replace `active:not-aria-[haspopup]:translate-y-px` with the L2 press scale + position.

Find:
```
"group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

Replace with:
```
"group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none transition-[transform,box-shadow,background-color,border-color,color] duration-(--duration-base) ease-(--ease-linear) hover:not(:disabled):-translate-y-px focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:scale-[0.98] active:not-aria-[haspopup]:duration-(--duration-instant) disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
```

- [ ] **Step 2: Add primary-variant shadow**

In the same `cva`, find the `default:` variant (line 11) and replace:
```
default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
```

With:
```
default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_1px_2px_rgba(94,106,210,0.25)] hover:bg-primary/95 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_2px_6px_rgba(94,106,210,0.35)] [a]:hover:bg-primary/80",
```

- [ ] **Step 3: Run dev, verify hover lifts and click presses**

Run: `npm run dev`. Open any page with a button (e.g. `/tareas`). Hover a `Crear` button — should lift 1px with stronger shadow. Click — should press down with scale.
Expected: Visible lift on hover, scale on press.

- [ ] **Step 4: Verify reduced-motion**

In DevTools → Rendering → Emulate CSS media feature `prefers-reduced-motion: reduce`. Hover button.
Expected: still color change (because we don't transition background-color via duration when reduced-motion = 0ms — visual is still snappy).

- [ ] **Step 5: Commit**

```bash
git add components/ui/button.tsx
git commit -m "feat(motion): apply L2 crafted lift + press to button"
```

---

### Task 2.2: Update input + textarea with token-driven focus

**Files:**
- Modify: `components/ui/input.tsx`
- Modify: `components/ui/textarea.tsx`

- [ ] **Step 1: Replace transition class in input.tsx**

Find: `transition-colors` (line 12 area).

Replace with: `transition-[border-color,box-shadow] duration-(--duration-fast) ease-(--ease-linear)`.

- [ ] **Step 2: Replace transition class in textarea.tsx**

Same change in `textarea.tsx` (line 10 area).

- [ ] **Step 3: Run dev, verify focus is smoother**

Run: `npm run dev`. Tab through any input.
Expected: focus ring fades in instead of snapping.

- [ ] **Step 4: Commit**

```bash
git add components/ui/input.tsx components/ui/textarea.tsx
git commit -m "feat(motion): token-driven focus on input + textarea"
```

---

### Task 2.3: Update TaskCard with L2 lift on hover

**Files:**
- Modify: `components/kanban/card.tsx`

- [ ] **Step 1: Update card hover classes**

In `card.tsx` line 159 area, find:
```
'bg-white border border-border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow',
```

Replace with:
```
'bg-white border border-border rounded-md p-2.5 cursor-grab active:cursor-grabbing transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-(--ease-linear) hover:-translate-y-px hover:shadow-md hover:border-[#c9cbe8]',
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Hover a kanban card.
Expected: lifts 1px, border tints purple, shadow grows.

- [ ] **Step 3: Commit**

```bash
git add components/kanban/card.tsx
git commit -m "feat(motion): L2 lift on TaskCard hover"
```

---

### Task 2.4: Update ProjectCard with L2 lift

**Files:**
- Modify: `components/projects/project-card.tsx`

- [ ] **Step 1: Update card classes**

In `project-card.tsx` line 44, find:
```
"relative rounded-xl border border-border p-4 pt-4 bg-white hover:shadow-sm hover:border-[#e1e1e4] transition-all block overflow-hidden"
```

Replace with:
```
"relative rounded-xl border border-border p-4 pt-4 bg-white transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-(--ease-linear) hover:-translate-y-px hover:shadow-md hover:border-[#c9cbe8] block overflow-hidden"
```

- [ ] **Step 2: Verify in browser**

Navigate to `/proyectos`. Hover a project card.
Expected: lifts 1px with stronger shadow.

- [ ] **Step 3: Commit**

```bash
git add components/projects/project-card.tsx
git commit -m "feat(motion): L2 lift on ProjectCard hover"
```

---

### Task 2.5: Update search filter pills with L2

**Files:**
- Modify: `components/search/search-filter-pills.tsx`

- [ ] **Step 1: Read the file to find the pill button class**

Run: `grep -n "transition" components/search/search-filter-pills.tsx`

- [ ] **Step 2: Update pill transitions**

Replace any existing `transition-colors` class on the pill button(s) with:
```
transition-[transform,background-color,border-color,color] duration-(--duration-fast) ease-(--ease-linear) active:scale-[0.97]
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Open search (⌘K). Click a filter pill.
Expected: presses down on click.

- [ ] **Step 4: Commit**

```bash
git add components/search/search-filter-pills.tsx
git commit -m "feat(motion): L2 press on search filter pills"
```

---

## PR 3 — Drawer + Dialog Motion

### Task 3.1: Update Sheet (drawer) backdrop and curve

**Files:**
- Modify: `components/ui/sheet.tsx`

- [ ] **Step 1: Update overlay class**

In `sheet.tsx` line 31, find:
```
"fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs"
```

Replace with:
```
"fixed inset-0 z-50 bg-black/[0.06] transition-opacity duration-(--duration-fast) ease-(--ease-out-soft) data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]"
```

- [ ] **Step 2: Update SheetContent transition + slide distance**

In `sheet.tsx` line 56, find the long className. Replace `transition duration-200 ease-in-out` with `transition-transform duration-(--duration-base) ease-(--ease-linear)`.

Replace `data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem]` with `data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full`.

Apply the same `2.5rem → full` replacement for `[side=left]` (`-2.5rem` → `-full`), `[side=top]` (`-2.5rem` → `-full`), `[side=bottom]` (`2.5rem` → `full`).

- [ ] **Step 3: Run dev and verify**

Run: `npm run dev`. Open any task drawer (e.g. click a kanban card → wait for drawer). Watch the slide.
Expected: slides in from full-width-right with sharper Linear curve, backdrop is more subtle.

- [ ] **Step 4: Commit**

```bash
git add components/ui/sheet.tsx
git commit -m "feat(motion): drawer slide full-width + subtle backdrop"
```

---

### Task 3.2: Update Dialog (intercept modal) curves

**Files:**
- Modify: `components/ui/dialog.tsx`

- [ ] **Step 1: Update overlay duration**

In `dialog.tsx` line 34, find `duration-100` and replace with `duration-(--duration-fast) ease-(--ease-out-soft)`.

Also change `bg-black/10` to `bg-black/[0.08]` and `backdrop-blur-xs` to `backdrop-blur-[2px]`.

- [ ] **Step 2: Update content duration**

In `dialog.tsx` line 56, find `duration-100` and replace with `duration-(--duration-base) ease-(--ease-linear)`.

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Open a confirmation dialog (e.g. delete-project flow if available, or any DialogContent).
Expected: scales 0.94 → 1 with smoother curve.

- [ ] **Step 4: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "feat(motion): dialog scale + token-driven curves"
```

---

### Task 3.3: Add stagger to TaskDrawer header

**Files:**
- Modify: `components/kanban/task-drawer.tsx`

- [ ] **Step 1: Import m wrapper**

At the top of `task-drawer.tsx` (after line 17), add:
```tsx
import { m } from '@/components/motion/m';
```

- [ ] **Step 2: Wrap title in <m.div> with stagger initial/animate**

Find the `<SheetTitle>` block (line 149-151):
```tsx
<SheetTitle className="text-[22px] tracking-[-0.01em] leading-[1.25] font-semibold mb-3">
  {task.title}
</SheetTitle>
```

Replace with:
```tsx
<m.div
  initial={{ opacity: 0, x: 8 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.18, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
>
  <SheetTitle className="text-[22px] tracking-[-0.01em] leading-[1.25] font-semibold mb-3">
    {task.title}
  </SheetTitle>
</m.div>
```

- [ ] **Step 3: Wrap meta pills row with cascading delay**

Find the meta pills wrapper at line 153:
```tsx
<div className="flex items-center gap-2 flex-wrap">
```

Replace the opening `<div>` and closing `</div>` (line 172) with `<m.div>` and `</m.div>`, adding props:
```tsx
<m.div
  initial={{ opacity: 0, x: 8 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ duration: 0.18, delay: 0.16, ease: [0.32, 0.72, 0, 1] }}
  className="flex items-center gap-2 flex-wrap"
>
  {/* existing children unchanged */}
</m.div>
```

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Open a task drawer.
Expected: title fades in slightly after panel slide, then meta pills cascade. Total entrance feels deliberate.

- [ ] **Step 5: Commit**

```bash
git add components/kanban/task-drawer.tsx
git commit -m "feat(motion): drawer header stagger entrance"
```

---

## PR 4 — Sidebar Sliding Indicator

### Task 4.1: Wrap Sidebar nav items with LayoutGroup

**Files:**
- Modify: `components/shell/sidebar.tsx`

- [ ] **Step 1: Wrap each NavItem group with LayoutGroup**

Replace the file contents:

```tsx
import type { AppContext } from '@/lib/auth/context';
import { WorkspaceHeader } from './workspace-header';
import { UserCard } from './user-card';
import { NavItem } from './nav-item';
import { SearchTrigger } from '@/components/search/search-trigger';
import { Home, CheckSquare, Calendar, BookOpen, FolderKanban } from 'lucide-react';
import { LayoutGroup } from '@/components/motion/m';

export function Sidebar({ context }: { context: AppContext }) {
  return (
    <aside className="bg-[#f7f7f8] border-r border-border flex flex-col p-2">
      <WorkspaceHeader
        current={{ id: context.customerId, name: context.customerName, icon: context.customerIcon }}
        customers={context.customers}
      />

      <LayoutGroup id="sidebar-nav">
        <div className="pb-3">
          <SearchTrigger />
          <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />} exact>
            Home
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            Workspace
          </div>
          <NavItem href="/tareas" icon={<CheckSquare className="w-3.5 h-3.5" />}>
            Tareas
          </NavItem>
          <NavItem href="/reuniones" icon={<Calendar className="w-3.5 h-3.5" />}>
            Reuniones
          </NavItem>
          <NavItem href="/wiki" icon={<BookOpen className="w-3.5 h-3.5" />}>
            Wiki
          </NavItem>
          <NavItem href="/proyectos" icon={<FolderKanban className="w-3.5 h-3.5" />}>
            Proyectos
          </NavItem>
        </div>
      </LayoutGroup>

      <div className="flex-1" />
      <UserCard name={context.memberName} role={`Miembro · ${context.customerName}`} />
    </aside>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/shell/sidebar.tsx
git commit -m "feat(motion): wrap sidebar nav with LayoutGroup"
```

---

### Task 4.2: Add sliding indicator to NavItem

**Files:**
- Modify: `components/shell/nav-item.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { m } from '@/components/motion/m';

type Props = {
  href: string;
  icon: React.ReactNode;
  kbd?: string;
  count?: number;
  children: React.ReactNode;
  exact?: boolean;
};

export function NavItem({ href, icon, kbd, count, children, exact }: Props) {
  const pathname = usePathname();
  const active =
    exact || href === '/' || href === '#'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-[13px] font-normal text-muted-foreground transition-[background-color,color] duration-(--duration-fast) ease-(--ease-linear) hover:bg-black/[0.04] hover:text-foreground',
        active && 'bg-white text-foreground font-medium shadow-sm border border-border',
      )}
    >
      {active && (
        <m.span
          layoutId="sidebar-active-indicator"
          className="absolute -left-px top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {kbd && (
        <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground font-[inherit]">
          {kbd}
        </kbd>
      )}
      {typeof count === 'number' && (
        <span className="text-[11px] bg-black/[0.05] text-muted-foreground px-1.5 rounded-full min-w-[18px] text-center leading-[18px]">
          {count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Run dev and click between sidebar items**

Run: `npm run dev`. Click between `/tareas`, `/proyectos`, `/wiki`, `/reuniones`.
Expected: A 2px purple bar slides between active items vertically.

- [ ] **Step 3: Commit**

```bash
git add components/shell/nav-item.tsx
git commit -m "feat(motion): sidebar sliding active indicator"
```

---

## PR 5 — Kanban FLIP + Status Flash

### Task 5.1: Add `cursor: grabbing` global during drag

**Files:**
- Modify: `components/kanban/board-classic.tsx`

- [ ] **Step 1: Add useEffect to toggle body cursor**

Add an `useEffect` that toggles `document.body.classList` based on `activeId`. After the `useState` block (around line 86), add:

```tsx
import { useEffect } from 'react';
// ... existing imports

// Inside BoardClassic, after `const [activeId, setActiveId] = useState<string | null>(null);`:
useEffect(() => {
  if (activeId) {
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  } else {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
  return () => {
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
}, [activeId]);
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Drag a kanban card.
Expected: cursor stays `grabbing` even when over the gaps between columns.

- [ ] **Step 3: Commit**

```bash
git add components/kanban/board-classic.tsx
git commit -m "feat(motion): global grabbing cursor during kanban drag"
```

---

### Task 5.2: Add status flash to Column

**Files:**
- Modify: `components/kanban/column.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add column-flash keyframe to globals.css**

Append to `app/globals.css`:

```css
@keyframes column-flash-success {
  0% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
  35% { box-shadow: inset 0 0 0 2px rgba(63, 159, 92, 0.5); background-color: rgba(232, 245, 236, 0.5); }
  100% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
}
@keyframes column-flash-progress {
  0% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
  35% { box-shadow: inset 0 0 0 2px rgba(94, 106, 210, 0.5); background-color: rgba(238, 239, 252, 0.5); }
  100% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
}
@keyframes column-flash-review {
  0% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
  35% { box-shadow: inset 0 0 0 2px rgba(199, 138, 44, 0.5); background-color: rgba(250, 240, 219, 0.5); }
  100% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
}
@keyframes column-flash-neutral {
  0% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
  35% { box-shadow: inset 0 0 0 2px rgba(138, 138, 145, 0.4); background-color: rgba(247, 247, 248, 0.7); }
  100% { box-shadow: inset 0 0 0 0 transparent; background-color: transparent; }
}

[data-flashed="success"]  { animation: column-flash-success 250ms cubic-bezier(0.32, 0.72, 0, 1); }
[data-flashed="progress"] { animation: column-flash-progress 250ms cubic-bezier(0.32, 0.72, 0, 1); }
[data-flashed="review"]   { animation: column-flash-review 250ms cubic-bezier(0.32, 0.72, 0, 1); }
[data-flashed="neutral"]  { animation: column-flash-neutral 250ms cubic-bezier(0.32, 0.72, 0, 1); }

@media (prefers-reduced-motion: reduce) {
  [data-flashed]  { animation: none; }
}
```

- [ ] **Step 2: Add data-flashed prop to Column**

Replace the contents of `components/kanban/column.tsx`:

```tsx
'use client';

import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import { TaskCard } from './card';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type FlashKind = 'success' | 'progress' | 'review' | 'neutral' | null;

type Props = {
  id: string;
  title: string;
  tasks: Task[];
  dotClass: string;
  dotFilled?: boolean;
  showDayChip?: boolean;
  membersById: Map<string, TeamMember>;
  flash?: FlashKind;
};

export function Column({ id, title, tasks, dotClass, dotFilled, showDayChip, membersById, flash }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      data-flashed={flash ?? undefined}
      className={cn(
        'bg-[#fafafa] border border-border rounded-lg flex flex-col min-h-full transition-colors duration-(--duration-fast) ease-(--ease-linear)',
        isOver && 'border-[#5e6ad2] bg-[#eeeffc]/40',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <span className={cn('w-2.5 h-2.5 rounded-full border-[1.5px]', dotClass, dotFilled && 'bg-current')} />
        <span className="text-[12px] font-semibold">{title}</span>
        <span className="text-[12px] text-muted-foreground font-medium">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-auto min-h-[80px]">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              showDayChip={showDayChip}
              assignees={t.assigneeIds
                .map((id) => membersById.get(id))
                .filter((m): m is TeamMember => !!m)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS (Column now requires no breaking changes — `flash` is optional).

- [ ] **Step 4: Commit**

```bash
git add components/kanban/column.tsx app/globals.css
git commit -m "feat(motion): column status flash via data-flashed"
```

---

### Task 5.3: Wire flash callback through useMoveTask

**Files:**
- Modify: `hooks/use-move-task.ts`

- [ ] **Step 1: Replace the hook**

```ts
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Task, TaskStatus } from '@/schemas/task';

type Dispatcher = React.Dispatch<React.SetStateAction<Task[]>>;

export type FlashKind = 'success' | 'progress' | 'review' | 'neutral' | null;

function flashFor(status: TaskStatus): FlashKind {
  switch (status) {
    case 'Done': return 'success';
    case 'In Progress': return 'progress';
    case 'In Review': return 'review';
    default: return 'neutral';
  }
}

export function useMoveTask(setTasks: Dispatcher) {
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [flashedColumn, setFlashedColumn] = useState<{ id: string; kind: FlashKind } | null>(null);

  async function move(taskId: string, newStatus: TaskStatus, columnId?: string) {
    let original: Task[] = [];
    setTasks((curr) => {
      original = curr;
      return curr.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    });
    setPending((s) => new Set(s).add(taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => 'failed'));
      if (columnId) {
        setFlashedColumn({ id: columnId, kind: flashFor(newStatus) });
        setTimeout(() => setFlashedColumn(null), 280);
      }
    } catch {
      setTasks(original);
      toast.error('No se pudo mover la tarea. Intenta de nuevo.');
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  }

  return { move, pending, flashedColumn };
}
```

- [ ] **Step 2: Wire flashedColumn into BoardClassic**

In `components/kanban/board-classic.tsx`:

(a) destructure `flashedColumn` from `useMoveTask`:
```tsx
const { move, flashedColumn } = useMoveTask(setTasks);
```

(b) pass `columnId` when calling `move` (line ~109):
```tsx
void move(task.id, targetColumn.dropStatus, targetColumn.id);
```

(c) pass the `flash` prop to each `<Column>` (line ~127-136):
```tsx
{visibleColumns.map((col) => (
  <Column
    key={col.id}
    id={col.id}
    title={col.title}
    tasks={tasks.filter((t) => col.statuses.includes(t.status))}
    dotClass={col.dotClass}
    dotFilled={col.dotFilled}
    membersById={membersById}
    flash={flashedColumn?.id === col.id ? flashedColumn.kind : null}
  />
))}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Drag a card from `Por hacer` to `Hecho`.
Expected: After drop, the `Hecho` column briefly flashes green.

- [ ] **Step 5: Commit**

```bash
git add hooks/use-move-task.ts components/kanban/board-classic.tsx
git commit -m "feat(motion): kanban status flash on successful drop"
```

---

### Task 5.4: Add overlay scale to drag preview

**Files:**
- Modify: `components/kanban/card.tsx`

- [ ] **Step 1: Update overlay class**

In `card.tsx` line ~164, find:
```
isOverlay && 'shadow-lg rotate-2 cursor-grabbing',
```

Replace with:
```
isOverlay && 'shadow-xl rotate-2 scale-[1.05] cursor-grabbing',
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Pick up a kanban card and hold.
Expected: Card grows slightly while dragging.

- [ ] **Step 3: Commit**

```bash
git add components/kanban/card.tsx
git commit -m "feat(motion): kanban drag overlay scale"
```

---

## PR 6 — Search Stagger + Match Highlight

### Task 6.1: Locate the search results component

**Files:**
- Read: search components dir

- [ ] **Step 1: Find where search results are rendered**

Run:
```bash
grep -rln "search" components/search/ | head
ls components/search/
```

- [ ] **Step 2: Identify the file that renders the result list**

Read each file in `components/search/` and find the one that maps over results to render rows. Note its path (likely `search-dialog.tsx`, `search-results.tsx`, or similar). This is `<results-file>` in subsequent steps.

- [ ] **Step 3: No commit yet — informational task**

---

### Task 6.2: Create highlightMatch util

**Files:**
- Create: `lib/search/highlight.ts`
- Create: `__tests__/search/highlight.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/search/highlight.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { highlightMatch } from '@/lib/search/highlight';

describe('highlightMatch', () => {
  it('returns plain text when query is empty', () => {
    const out = highlightMatch('Onboarding mobile', '');
    expect(out).toEqual([{ text: 'Onboarding mobile', match: false }]);
  });

  it('returns plain text when query has no match', () => {
    const out = highlightMatch('Onboarding', 'xyz');
    expect(out).toEqual([{ text: 'Onboarding', match: false }]);
  });

  it('splits text into segments around a single match', () => {
    const out = highlightMatch('Onboarding mobile', 'mob');
    expect(out).toEqual([
      { text: 'Onboarding ', match: false },
      { text: 'mob', match: true },
      { text: 'ile', match: false },
    ]);
  });

  it('matches case-insensitively', () => {
    const out = highlightMatch('Onboarding', 'ONB');
    expect(out).toEqual([
      { text: 'Onb', match: true },
      { text: 'oarding', match: false },
    ]);
  });

  it('handles multiple non-overlapping matches', () => {
    const out = highlightMatch('abc abc', 'abc');
    expect(out).toEqual([
      { text: 'abc', match: true },
      { text: ' ', match: false },
      { text: 'abc', match: true },
    ]);
  });

  it('escapes regex special chars in query', () => {
    const out = highlightMatch('a.b.c', '.');
    expect(out).toEqual([
      { text: 'a', match: false },
      { text: '.', match: true },
      { text: 'b', match: false },
      { text: '.', match: true },
      { text: 'c', match: false },
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/search/highlight.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement highlight util**

Create `lib/search/highlight.ts`:

```ts
export type HighlightSegment = { text: string; match: boolean };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` into segments marking which parts match `query`
 * (case-insensitive). Empty/no-match queries return a single
 * non-matching segment.
 */
export function highlightMatch(text: string, query: string): HighlightSegment[] {
  if (!query) return [{ text, match: false }];

  const re = new RegExp(escapeRegex(query), 'gi');
  const segments: HighlightSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index), match: false });
    }
    segments.push({ text: m[0], match: true });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex += 1;
  }

  if (segments.length === 0) return [{ text, match: false }];
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/search/highlight.test.ts`
Expected: PASS, 6/6.

- [ ] **Step 5: Commit**

```bash
git add lib/search/highlight.ts __tests__/search/highlight.test.ts
git commit -m "feat(search): add highlightMatch util with tests"
```

---

### Task 6.3: Apply stagger and highlight to search results

**Files:**
- Modify: `<results-file>` from Task 6.1

- [ ] **Step 1: Add highlight import**

At the top of `<results-file>`, add:
```tsx
import { highlightMatch } from '@/lib/search/highlight';
```

- [ ] **Step 2: Add stagger via inline animationDelay**

Find the `.map(...)` that renders each result row. Add a wrapper className `animate-in fade-in slide-in-from-bottom-1 duration-(--duration-base)` and an inline `style` with `animationDelay`:

```tsx
{results.map((r, i) => (
  <ResultRow
    key={r.id}
    style={{ animationDelay: `${i * 40}ms` }}
    className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both duration-(--duration-base)"
    ...
  />
))}
```

If the row component does not currently accept `style` and `className` props, add them and spread them on the root element of the row.

- [ ] **Step 3: Apply highlight to displayed text**

Find where each row renders the result title (e.g. `{r.title}`). Replace with:

```tsx
{highlightMatch(r.title, query).map((seg, i) =>
  seg.match ? (
    <mark key={i} className="bg-amber-100 text-amber-700 font-semibold rounded-sm px-0.5">
      {seg.text}
    </mark>
  ) : (
    <span key={i}>{seg.text}</span>
  ),
)}
```

(`query` is the current search input value — adapt to whatever variable it is in scope.)

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`. Open ⌘K and type "onb".
Expected: results cascade in with 40ms delays; "onb" inside each title is highlighted in amber.

- [ ] **Step 5: Commit**

```bash
git add <results-file> # adapt path
git commit -m "feat(search): stagger results + match highlight"
```

---

## PR 7 — View Transitions + Loading Crossfade

### Task 7.1: Add view-transition-name to main content

**Files:**
- Modify: `app/(app)/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add CSS for view transitions**

Append to `app/globals.css`:

```css
@view-transition {
  navigation: auto;
}

::view-transition-old(main-content),
::view-transition-new(main-content) {
  animation-duration: var(--duration-base);
  animation-timing-function: var(--ease-linear);
}

::view-transition-old(main-content) {
  animation-name: page-out;
}

::view-transition-new(main-content) {
  animation-name: page-in;
}

@keyframes page-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes page-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-3px); }
}

/* Fallback for browsers without view-transitions */
@supports not (view-transition-name: x) {
  main { animation: page-in var(--duration-base) var(--ease-linear); }
}

@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(main-content),
  ::view-transition-new(main-content) {
    animation: none;
  }
}
```

- [ ] **Step 2: Apply view-transition-name to main**

In `app/(app)/layout.tsx`, change the `<main>` element's className:

Find:
```tsx
<main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white">
```

Replace with:
```tsx
<main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white [view-transition-name:main-content]">
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`. Navigate between `/`, `/tareas`, `/proyectos`, `/wiki`.
Expected: in Chrome, main content area fades + slides while sidebar stays static.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/layout.tsx app/globals.css
git commit -m "feat(motion): page view transitions on main content"
```

---

### Task 7.2: Add view-transition-name to skeletons

**Files:**
- Modify: `app/(app)/loading.tsx`
- Modify: `app/(app)/tareas/loading.tsx`
- Modify: `app/(app)/proyectos/loading.tsx`
- Modify: `app/(app)/wiki/loading.tsx`
- Modify: `app/(app)/reuniones/loading.tsx`

- [ ] **Step 1: For each loading.tsx, add the view-transition-name**

In each `loading.tsx`, find the outermost wrapper div (or fragment that wraps the skeleton content) and add the className `[view-transition-name:main-content]`. If the file uses a Fragment, change to a `<div>` wrapper.

For example, in `app/(app)/loading.tsx`:

Find:
```tsx
return (
  <>
    <Topbar crumbs={[{ label: 'Home' }]} />
    <div className="flex-1 overflow-auto px-10 py-10 max-w-[980px] mx-auto w-full">
```

Replace with:
```tsx
return (
  <div className="contents [view-transition-name:main-content]">
    <Topbar crumbs={[{ label: 'Home' }]} />
    <div className="flex-1 overflow-auto px-10 py-10 max-w-[980px] mx-auto w-full">
```

And the closing `</>` becomes `</div>`.

Repeat for the other 4 loading files.

- [ ] **Step 2: Verify crossfade works**

Run: `npm run dev`. Force-throttle network in DevTools (Slow 3G). Navigate to `/proyectos`.
Expected: skeleton crossfades into real content (no flash).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/loading.tsx app/\(app\)/*/loading.tsx
git commit -m "feat(motion): skeletons share view-transition-name with main"
```

---

## PR 8 — Done Celebration + Empty State

### Task 8.1: Build EmptyState component

**Files:**
- Create: `components/common/empty-state.tsx`
- Create: `__tests__/motion/empty-state.test.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add bob keyframe to globals.css**

Append to `app/globals.css`:

```css
@keyframes empty-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
.empty-bob { animation: empty-bob 2.4s ease-in-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .empty-bob { animation: none; }
}
```

- [ ] **Step 2: Write the failing test**

Create `__tests__/motion/empty-state.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/components/common/empty-state';

describe('EmptyState', () => {
  it('renders icon, title, description', () => {
    render(<EmptyState icon="📋" title="No tasks" description="Create one to start" />);
    expect(screen.getByText('📋')).toBeInTheDocument();
    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('Create one to start')).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState
        icon="📋"
        title="Empty"
        description="None"
        action={<button>Create</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('does not render description block when omitted', () => {
    const { container } = render(<EmptyState icon="📋" title="Empty" />);
    expect(container.querySelector('p')).toBeNull();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run __tests__/motion/empty-state.test.tsx`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement EmptyState**

Create `components/common/empty-state.tsx`:

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className,
      )}
    >
      <div className="empty-bob w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4ff] to-[#f4ecf8] flex items-center justify-center text-2xl mb-3">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] text-muted-foreground max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run __tests__/motion/empty-state.test.tsx`
Expected: PASS, 3/3.

- [ ] **Step 6: Commit**

```bash
git add components/common/empty-state.tsx __tests__/motion/empty-state.test.tsx app/globals.css
git commit -m "feat(motion): reusable EmptyState component with bob"
```

---

### Task 8.2: Use EmptyState in search-no-results

**Files:**
- Modify: `components/search/search-no-results.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/empty-state';

export function SearchNoResults({ term, onClose }: { term: string; onClose: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: term }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => 'failed'));
      const body = (await res.json()) as { id: string; url: string };
      toast.success('Tarea creada');
      onClose();
      router.push(body.url);
    } catch {
      toast.error('No se pudo crear la tarea. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <EmptyState
      icon="🔎"
      title="Nada por acá"
      description="No hay coincidencias en tu workspace actual."
      action={
        <button
          onClick={create}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Creando…' : `➕ Crear "${term}" como nueva tarea`}
        </button>
      }
    />
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Open ⌘K and type something with no matches.
Expected: empty state with bobbing 🔎 icon and CTA.

- [ ] **Step 3: Commit**

```bash
git add components/search/search-no-results.tsx
git commit -m "feat(search): use EmptyState in search-no-results"
```

---

### Task 8.3: Build DoneCelebration component

**Files:**
- Create: `components/motion/done-celebration.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client';

import { useMemo } from 'react';
import { m, AnimatePresence, useReducedMotion } from '@/components/motion/m';

type Props = {
  show: boolean;
};

const PARTICLES = 4;

/**
 * Renders a checkmark + confetti burst when `show` becomes true.
 * Caller controls when to flip `show` and is responsible for resetting
 * it after ~700ms (the animation duration).
 */
export function DoneCelebration({ show }: Props) {
  const reduced = useReducedMotion();
  const angles = useMemo(
    () =>
      Array.from({ length: PARTICLES }).map((_, i) => {
        const base = (i / PARTICLES) * Math.PI * 2;
        const dist = 18 + (i % 2) * 6;
        return {
          dx: Math.cos(base) * dist,
          dy: Math.sin(base) * dist,
          color: ['#3f9f5c', '#5e6ad2', '#c78a2c', '#7f3aa7'][i % 4],
        };
      }),
    [],
  );

  if (reduced) return null;

  return (
    <AnimatePresence>
      {show && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <m.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.2, 1], opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
            viewBox="0 0 24 24"
            className="w-3.5 h-3.5"
            fill="none"
            stroke="#3f9f5c"
            strokeWidth={3}
          >
            <polyline points="20 6 9 17 4 12" />
          </m.svg>
          {angles.map((a, i) => (
            <m.span
              key={i}
              initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
              animate={{ x: a.dx, y: a.dy, opacity: [0, 1, 0], scale: 1 }}
              transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.05 * i }}
              style={{ background: a.color }}
              className="absolute w-1 h-1 rounded-full"
            />
          ))}
        </span>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/motion/done-celebration.tsx
git commit -m "feat(motion): DoneCelebration confetti + checkmark"
```

---

### Task 8.4: Wire DoneCelebration into TaskStatusPill

**Files:**
- Modify: `components/kanban/task-status-pill.tsx`

- [ ] **Step 1: Replace the file**

```tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/schemas/task';
import { DoneCelebration } from '@/components/motion/done-celebration';

const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string; label: string }> = {
  Refining:     { pill: 'bg-[#f7f7f8] text-muted-foreground',  dot: 'bg-[#b0b0b6]', label: 'Refinando' },
  'Not Started':{ pill: 'bg-[#f7f7f8] text-[#57575c]',         dot: 'bg-[#57575c]', label: 'Por hacer' },
  'In Progress':{ pill: 'bg-[#eeeffc] text-[#5e6ad2]',         dot: 'bg-[#5e6ad2]', label: 'En progreso' },
  'In Review':  { pill: 'bg-[#faf0db] text-[#c78a2c]',         dot: 'bg-[#c78a2c]', label: 'En revisión' },
  Done:         { pill: 'bg-[#e8f5ec] text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]', label: 'Hecho' },
  Archived:     { pill: 'bg-[#f7f7f8] text-muted-foreground',  dot: 'bg-[#8a8a91]', label: 'Archivado' },
};

const ORDER: TaskStatus[] = ['Refining', 'Not Started', 'In Progress', 'In Review', 'Done', 'Archived'];

type Props = {
  taskId: string;
  status: TaskStatus;
};

export function TaskStatusPill({ taskId, status }: Props) {
  const router = useRouter();
  const [current, setCurrent] = useState<TaskStatus>(status);
  const [pending, startTransition] = useTransition();
  const [celebrating, setCelebrating] = useState(false);
  const prevRef = useRef<TaskStatus>(status);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== 'Done' && current === 'Done') {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 700);
      return () => clearTimeout(t);
    }
    prevRef.current = current;
  }, [current]);

  const style = STATUS_STYLE[current];

  function change(next: TaskStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error('failed');
        startTransition(() => router.refresh());
      } catch {
        setCurrent(previous);
        toast.error('No se pudo cambiar el estado.');
      }
    })();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium outline-none transition-[transform,background-color,color] duration-(--duration-fast) ease-(--ease-linear) hover:brightness-95 active:scale-[0.97] data-[celebrating=true]:scale-[1.04] data-[celebrating=true]:duration-(--duration-celebrate) data-[celebrating=true]:ease-(--ease-spring)',
          style.pill,
          pending && 'opacity-70',
        )}
        data-celebrating={celebrating}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
        {style.label}
        <ChevronDown className="w-3 h-3 opacity-60" />
        <DoneCelebration show={celebrating} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {ORDER.map((s) => {
          const st = STATUS_STYLE[s];
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => change(s)}
              className="flex items-center gap-2 text-[12px]"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
              <span className="flex-1">{st.label}</span>
              {s === current && <Check className="w-3.5 h-3.5 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`. Open a kanban card → drawer → change status to "Done".
Expected: pill bumps in scale + green color tween + checkmark + 4 confetti dots.

- [ ] **Step 3: Verify reduced-motion**

In DevTools, set `prefers-reduced-motion: reduce`. Repeat above.
Expected: just the color tween, no scale/checkmark/confetti.

- [ ] **Step 4: Commit**

```bash
git add components/kanban/task-status-pill.tsx
git commit -m "feat(motion): Done celebration on TaskStatusPill"
```

---

### Task 8.5: Use EmptyState in tareas/proyectos/wiki

**Files:**
- Modify: `app/(app)/tareas/page.tsx`
- Modify: `app/(app)/proyectos/page.tsx`
- Modify: `app/(app)/wiki/page.tsx`

- [ ] **Step 1: For each page, find the empty branch**

Run: `grep -n "No hay\|empty\|sin tareas\|sin proyectos" app/\(app\)/tareas/page.tsx app/\(app\)/proyectos/page.tsx app/\(app\)/wiki/page.tsx` to locate empty-state branches.

- [ ] **Step 2: Replace each ad-hoc empty branch with `<EmptyState>`**

Add to each page's imports:
```tsx
import { EmptyState } from '@/components/common/empty-state';
```

In `tareas/page.tsx`, replace the empty branch with:
```tsx
<EmptyState icon="📋" title="No hay tareas todavía" description="Crea la primera para empezar" />
```

In `proyectos/page.tsx`, replace the empty branch with:
```tsx
<EmptyState icon="📁" title="Sin proyectos" description="Cuando crees uno aparecerá aquí" />
```

In `wiki/page.tsx`, replace the empty branch with:
```tsx
<EmptyState icon="📚" title="Wiki vacía" description="Empieza creando tu primera página" />
```

(If a page does not currently have an empty branch — i.e. the data is always populated — skip it and note in the commit message which ones were updated.)

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/tareas/page.tsx app/\(app\)/proyectos/page.tsx app/\(app\)/wiki/page.tsx
git commit -m "feat(motion): EmptyState on tareas/proyectos/wiki pages"
```

---

## PR 9 — Tests, Tooling, Bundle Budget

### Task 9.1: Test motion tokens are defined

**Files:**
- Create: `__tests__/motion/tokens.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('motion tokens', () => {
  const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf-8');

  it.each([
    '--duration-instant',
    '--duration-fast',
    '--duration-base',
    '--duration-slow',
    '--duration-celebrate',
    '--ease-linear',
    '--ease-spring',
    '--ease-out-soft',
  ])('defines %s token', (token) => {
    expect(css).toMatch(new RegExp(`${token}\\s*:`));
  });

  it('declares reduced-motion override', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run __tests__/motion/tokens.test.ts`
Expected: PASS, 9/9.

- [ ] **Step 3: Commit**

```bash
git add __tests__/motion/tokens.test.ts
git commit -m "test(motion): assert tokens and reduced-motion override exist"
```

---

### Task 9.2: Test reduced-motion behavior on EmptyState

**Files:**
- Create: `__tests__/motion/reduced-motion.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('reduced-motion guards in CSS', () => {
  const css = readFileSync(resolve(__dirname, '../../app/globals.css'), 'utf-8');

  it('contains a reduced-motion block that disables empty-bob', () => {
    const reducedBlocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
    expect(reducedBlocks.length).toBeGreaterThan(0);
    expect(reducedBlocks.join('\n')).toMatch(/\.empty-bob\s*\{\s*animation:\s*none\s*;?\s*\}/);
  });

  it('contains a reduced-motion block that disables column-flash', () => {
    const reducedBlocks = css.split('@media (prefers-reduced-motion: reduce)').slice(1);
    expect(reducedBlocks.join('\n')).toMatch(/\[data-flashed\]\s*\{\s*animation:\s*none\s*;?\s*\}/);
  });

  it('zeroes out duration tokens under reduced-motion', () => {
    const idx = css.indexOf('@media (prefers-reduced-motion: reduce)');
    expect(idx).toBeGreaterThan(-1);
    const block = css.slice(idx, idx + 600);
    expect(block).toMatch(/--duration-base:\s*0ms/);
  });
});
```

- [ ] **Step 2: Run test**

Run: `npx vitest run __tests__/motion/reduced-motion.test.ts`
Expected: PASS, 3/3.

- [ ] **Step 3: Commit**

```bash
git add __tests__/motion/reduced-motion.test.ts
git commit -m "test(motion): reduced-motion CSS guards"
```

---

### Task 9.3: Add CI lint script for hardcoded durations

**Files:**
- Create: `scripts/check-motion-tokens.sh`
- Modify: `package.json`

- [ ] **Step 1: Create the script**

```bash
#!/usr/bin/env bash
# Rejects hardcoded `duration-Xms` Tailwind utilities and `transition-duration: Xms` outside globals.css.
# Reason: motion tokens live in app/globals.css; everything else must consume them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXIT=0

echo "Scanning for hardcoded duration values..."

if grep -rEn --include="*.tsx" --include="*.ts" --include="*.css" \
  --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=__tests__ \
  --exclude="globals.css" \
  '(\bduration-\[[0-9]+ms\]|\btransition-duration:\s*[0-9]+ms)' \
  "$ROOT" 2>/dev/null; then
  echo ""
  echo "❌ Hardcoded durations found. Use tokens instead:"
  echo "   duration-(--duration-base) | duration-(--duration-fast) | etc."
  EXIT=1
else
  echo "✓ No hardcoded durations."
fi

exit $EXIT
```

Make it executable:
```bash
chmod +x scripts/check-motion-tokens.sh
```

- [ ] **Step 2: Wire into package.json**

In `package.json`'s `scripts` block, add:
```json
"check:motion": "bash scripts/check-motion-tokens.sh"
```

- [ ] **Step 3: Run it locally — should pass**

Run: `npm run check:motion`
Expected: `✓ No hardcoded durations.` (assuming all earlier tasks used tokens; if not, fix offending lines).

- [ ] **Step 4: Commit**

```bash
git add scripts/check-motion-tokens.sh package.json
git commit -m "chore(ci): lint hardcoded motion durations"
```

---

### Task 9.4: Bundle smoke check

**Files:**
- (no file changes — verification only)

- [ ] **Step 1: Build the app**

Run:
```bash
npm run build 2>&1 | tail -30
```
Expected: Build succeeds. Note the `First Load JS` reported per route.

- [ ] **Step 2: Verify motion is tree-shaken**

Run:
```bash
find .next/static/chunks -name "*.js" -exec grep -l "framer\|motion-utils" {} \; | head -5
```
Expected: a small number of chunks; the routes that use `motion` (sidebar, drawer, status-pill) reference it but other routes do not. If you see motion code in chunks unrelated to the surfaces we wired, audit those imports.

- [ ] **Step 3: Run typecheck and tests one final time**

Run: `npm run typecheck && npm run test:run`
Expected: PASS across the board.

- [ ] **Step 4: No commit (verification step)**

---

## Self-Review

This is the writer's checklist. Run it after the plan is fully written.

**Spec coverage**

| Spec section | Covered by |
|--------------|-----------|
| 4. Motion tokens | Task 1.1 |
| 5.1 Drawer slide + stagger | Tasks 3.1, 3.3 |
| 5.2 Modal intercept (scale + fade) | Task 3.2 |
| 5.3 Kanban DnD: cursor, drop hover, FLIP, status flash | Tasks 5.1, 5.2, 5.3, 5.4 (FLIP via existing `useSortable` transition + overlay scale; explicit `motion` layout deferred — see Note) |
| 5.4 L2 Crafted on button/input/textarea/cards/pills | Tasks 2.1, 2.2, 2.3, 2.4, 2.5 |
| 5.5 Sidebar sliding indicator | Tasks 4.1, 4.2 |
| 5.6 Search stagger + match highlight | Tasks 6.1, 6.2, 6.3 |
| 5.7 Loading crossfade + page transitions | Tasks 7.1, 7.2 |
| 5.8 Done celebration | Tasks 8.3, 8.4 |
| 5.9 EmptyState reusable | Tasks 8.1, 8.2, 8.5 |
| 7. Testing | Tasks 6.2 (highlight), 8.1 (EmptyState), 9.1 (tokens), 9.2 (reduced-motion) |
| 7. Lint + bundle budget | Tasks 9.3, 9.4 |

**Note on FLIP (5.3)**: The spec called for explicit `<m.div layout="position">` on TaskCard. The plan ships **Task 5.4 (overlay scale)** + relies on `@dnd-kit`'s built-in `transform` + `transition` from `useSortable` for inter-card movement, plus the **column status flash** (Task 5.2-5.3). This is a deliberate scope reduction: layered `motion` `layout` over `useSortable`'s `transform` is fragile (both compete for the same transform property) and adds bundle cost for marginal value once cursor + flash + overlay scale + drop-hover are in place. If after seeing it landed the result feels insufficient, a follow-up task can add `<m.div layout="position">` carefully. Flagged for user awareness; spec amendment recommended.

**Placeholder scan**: searched for "TBD", "TODO", "fill in", "implement later", "similar to" — none present. Each step has actual code or an actual command.

**Type consistency**:
- `FlashKind` defined in Task 5.3 and consumed in Task 5.2 — names match.
- `flashedColumn` shape `{ id; kind: FlashKind }` consistent across hook return and Column prop usage.
- `HighlightSegment` defined in Task 6.2 and used in Task 6.3.
- `m`, `LazyMotion`, `domAnimation`, `useReducedMotion`, `AnimatePresence`, `LayoutGroup` all re-exported in Task 1.3 and consumed in 1.4 (LazyMotion/domAnimation), 3.3/4.2/8.3 (m/AnimatePresence/useReducedMotion), 4.1 (LayoutGroup).

**Gaps**: Task 6.1 is a discovery task (search-results component path is uncertain). Subagent should resolve the path during execution; the task is bounded.
