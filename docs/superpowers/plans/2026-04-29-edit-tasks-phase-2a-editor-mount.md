# Edit Tasks Phase 2A — Minimum Viable Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mount a ProseMirror editor on the task detail page with edit/read toggle, Guardar/Cancelar buttons, `⌘S` shortcut, `beforeunload` warning, and a banner that blocks save when the doc contains an `unsupported_block`. No slash menu, no inline toolbar, no markdown shortcuts in this phase — those land in 2B/2C/2D.

**Architecture:** Three new client components under `components/edit-tasks/`: a pure `TaskEditor` that owns the ProseMirror `EditorView`, a `SaveBar` that owns the action affordances, and a `TaskEditorContainer` that orchestrates the read/edit toggle plus save flow. The container does Notion ↔ PM serialization via Phase 1's helpers and POSTs the doc to Phase 1's `PATCH /api/tasks/[id]/blocks` route.

**Tech Stack:** Next.js 15 client components, React 19, ProseMirror (model + state + view + history + commands + keymap + dropcursor + gapcursor), Sonner for toasts, Zod is already available. Tests use Vitest + Testing Library + jsdom.

---

## Spec reference

`docs/superpowers/specs/2026-04-29-edit-tasks-phase-2a-design.md`. Phase 1 spec at `docs/superpowers/specs/2026-04-29-edit-tasks-design.md` documents the broader context.

## Phase boundary — what "done" looks like

After Task 6, you can: open any task detail in the browser, click the pencil button, edit the body, press Guardar (or `⌘S`), see a success toast, and confirm the change persists in Notion after a refresh. If the task has a toggle/column block, a banner appears and Guardar is disabled.

## File map

**New files:**

- `components/edit-tasks/save-bar.tsx` — Guardar / Cancelar action bar.
- `components/edit-tasks/__tests__/save-bar.test.tsx` — render variants.
- `components/edit-tasks/task-editor.tsx` — ProseMirror EditorView mount with imperative ref API.
- `components/edit-tasks/__tests__/task-editor.test.tsx` — mount + change detection tests.
- `components/edit-tasks/task-editor-container.tsx` — read/edit orchestrator.
- `components/edit-tasks/__tests__/task-editor-container.test.tsx` — toggle, save, banner tests.

**Modified files:**

- `components/kanban/task-detail.tsx` — replace inline `BlocksRenderer` with `TaskEditorContainer`.
- `package.json` — add 6 ProseMirror runtime packages.

## Conventions

- Test runner: `npm run test -- <path> --run` (Vitest).
- Type check: `npm run typecheck`.
- Component tests live in `__tests__/` next to source (matches existing repo convention).
- Existing patterns to study: `components/kanban/task-status-pill.tsx` for sonner usage, `components/kanban/task-detail-shortcuts.tsx` for client-only effect components.
- Branch: `feat/edit-tasks-ui-phase-2` (already on it).

---

## Task 1: Install ProseMirror runtime dependencies

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install runtime deps**

```bash
npm install prosemirror-view prosemirror-history prosemirror-commands prosemirror-keymap prosemirror-dropcursor prosemirror-gapcursor
```

These are independent of the four already installed in Phase 1 (`prosemirror-model`, `prosemirror-state`, `prosemirror-schema-basic`, `prosemirror-schema-list`).

- [ ] **Step 2: Confirm typecheck still passes**

Run: `npm run typecheck`
Expected: PASS — no code change yet, just deps.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add ProseMirror runtime packages for edit-tasks editor"
```

---

## Task 2: `SaveBar` component (TDD)

**Files:**
- Create: `components/edit-tasks/save-bar.tsx`
- Create: `components/edit-tasks/__tests__/save-bar.test.tsx`

The smallest UI piece. Tests render variants and click handlers.

- [ ] **Step 1: Write the failing test**

```tsx
// components/edit-tasks/__tests__/save-bar.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveBar } from '../save-bar';

describe('SaveBar', () => {
  it('renders Guardar and Cancelar buttons', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
  });

  it('disables Guardar when canSave is false', () => {
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('disables Guardar when not dirty', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('shows "Guardando..." label when saving', () => {
    render(
      <SaveBar
        dirty={true}
        saving={true}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: /guardando/i })).toBeInTheDocument();
  });

  it('calls onSave when Guardar clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={true}
        onSave={onSave}
        onCancel={() => {}}
      />,
    );
    await user.click(screen.getByRole('button', { name: /guardar/i }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Cancelar clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <SaveBar
        dirty={true}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={onCancel}
      />,
    );
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders an "Editando" indicator', () => {
    render(
      <SaveBar
        dirty={false}
        saving={false}
        canSave={true}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- components/edit-tasks/__tests__/save-bar.test.tsx --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// components/edit-tasks/save-bar.tsx
'use client';

import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  dirty: boolean;
  saving: boolean;
  /**
   * False when the doc contains unsupported blocks that would crash
   * the Notion append endpoint. Disables Guardar even if dirty.
   */
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveBar({ dirty, saving, canSave, onSave, onCancel }: Props) {
  const guardarDisabled = !dirty || !canSave || saving;

  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#5e6ad2]">
        <Pencil className="w-3 h-3" aria-hidden />
        Editando
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={cn(
            'px-3 py-1.5 rounded-md text-[12px] font-medium',
            'border border-border bg-white text-[#2c2c2e]',
            'hover:bg-[#f7f7f8] active:bg-[#f0f0f1]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={guardarDisabled}
          className={cn(
            'px-3 py-1.5 rounded-md text-[12px] font-medium text-white',
            'bg-[linear-gradient(135deg,#5e6ad2_0%,#8ba1d9_100%)] shadow-[0_1px_2px_rgba(94,106,210,.25)]',
            'hover:brightness-105 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]',
            'disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- components/edit-tasks/__tests__/save-bar.test.tsx --run`
Expected: PASS — all 7 tests green.

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/save-bar.tsx components/edit-tasks/__tests__/save-bar.test.tsx
git commit -m "feat(edit-tasks): add SaveBar component"
```

---

## Task 3: `TaskEditor` component (TDD)

**Files:**
- Create: `components/edit-tasks/task-editor.tsx`
- Create: `components/edit-tasks/__tests__/task-editor.test.tsx`

The pure mount. Owns `EditorView`, exposes ref API, calls `onChange` on every transaction.

- [ ] **Step 1: Write the failing test**

```tsx
// components/edit-tasks/__tests__/task-editor.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { createRef } from 'react';
import { render, act } from '@testing-library/react';
import { TaskEditor, type TaskEditorHandle } from '../task-editor';

const initialDoc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
  ],
};

describe('TaskEditor', () => {
  it('renders a contenteditable element', () => {
    const { container } = render(<TaskEditor initialDoc={initialDoc} onChange={() => {}} />);
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable).not.toBeNull();
  });

  it('renders the initial doc text into the contenteditable', () => {
    const { container } = render(<TaskEditor initialDoc={initialDoc} onChange={() => {}} />);
    const editable = container.querySelector('[contenteditable="true"]');
    expect(editable?.textContent).toContain('Hello');
  });

  it('exposes getDoc returning the current doc JSON', () => {
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={() => {}} />);
    expect(ref.current).not.toBeNull();
    const doc = ref.current!.getDoc();
    expect(doc.type).toBe('doc');
    expect(doc.content?.[0]?.type).toBe('paragraph');
  });

  it('hasChanges returns false right after mount', () => {
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={() => {}} />);
    expect(ref.current!.hasChanges()).toBe(false);
  });

  it('calls onChange when a transaction is dispatched and hasChanges flips true', () => {
    const onChange = vi.fn();
    const ref = createRef<TaskEditorHandle>();
    render(<TaskEditor ref={ref} initialDoc={initialDoc} onChange={onChange} />);

    // Dispatch a no-op selection transaction (purely to prove onChange fires
    // and the changed-doc detector flips). We cheat slightly: use the imperative
    // API to inject a paragraph.
    act(() => {
      ref.current!.replaceContent({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'Modified' }] },
        ],
      });
    });

    expect(onChange).toHaveBeenCalled();
    expect(ref.current!.hasChanges()).toBe(true);
    expect(ref.current!.getDoc().content?.[0]?.content?.[0]?.text).toBe('Modified');
  });

  it('cleans up the EditorView on unmount', () => {
    const { unmount, container } = render(
      <TaskEditor initialDoc={initialDoc} onChange={() => {}} />,
    );
    expect(container.querySelector('[contenteditable="true"]')).not.toBeNull();
    unmount();
    expect(container.querySelector('[contenteditable="true"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- components/edit-tasks/__tests__/task-editor.test.tsx --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// components/edit-tasks/task-editor.tsx
'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { Node as PMNode } from 'prosemirror-model';
import { editTasksSchema } from '@/lib/edit-tasks/schema';

export type PMNodeJSON = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNodeJSON[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type TaskEditorHandle = {
  getDoc: () => PMNodeJSON;
  hasChanges: () => boolean;
  /**
   * Replace the editor's doc with a new JSON. Used in tests and by the
   * container after a successful save (to reset the pristine baseline).
   */
  replaceContent: (doc: PMNodeJSON) => void;
};

type Props = {
  initialDoc: PMNodeJSON;
  onChange: () => void;
};

export const TaskEditor = forwardRef<TaskEditorHandle, Props>(function TaskEditor(
  { initialDoc, onChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialJSONRef = useRef<string>(JSON.stringify(initialDoc));

  useEffect(() => {
    if (!hostRef.current) return;
    const doc = PMNode.fromJSON(editTasksSchema, initialDoc);
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
      ],
    });
    const view = new EditorView(hostRef.current, {
      state,
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        onChange();
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // initialDoc is captured at mount time; further updates use replaceContent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getDoc: () => {
      if (!viewRef.current) return initialDoc;
      return viewRef.current.state.doc.toJSON() as PMNodeJSON;
    },
    hasChanges: () => {
      if (!viewRef.current) return false;
      return JSON.stringify(viewRef.current.state.doc.toJSON()) !== initialJSONRef.current;
    },
    replaceContent: (doc: PMNodeJSON) => {
      if (!viewRef.current) return;
      const next = PMNode.fromJSON(editTasksSchema, doc);
      const state = EditorState.create({
        doc: next,
        plugins: viewRef.current.state.plugins,
      });
      viewRef.current.updateState(state);
      initialJSONRef.current = JSON.stringify(doc);
      onChange();
    },
  }));

  return (
    <div
      ref={hostRef}
      className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
    />
  );
});
```

NOTE: jsdom doesn't fully implement contenteditable behavior. The `dispatchTransaction` path is exercised through the `replaceContent` ref method in the test. Real keystroke testing requires a real browser (manual smoke).

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- components/edit-tasks/__tests__/task-editor.test.tsx --run`
Expected: PASS — all 6 tests green.

If a test about `[contenteditable="true"]` fails because jsdom renders something different, inspect with `screen.debug()` and adjust the selector to match what `EditorView` renders in jsdom (typically the host div gets a `ProseMirror` class and the inner contenteditable attribute). If needed, change the assertion to look for `.ProseMirror` instead. Don't weaken the doc-content assertion.

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/task-editor.tsx components/edit-tasks/__tests__/task-editor.test.tsx
git commit -m "feat(edit-tasks): add TaskEditor ProseMirror mount"
```

---

## Task 4: `TaskEditorContainer` orchestrator (TDD)

**Files:**
- Create: `components/edit-tasks/task-editor-container.tsx`
- Create: `components/edit-tasks/__tests__/task-editor-container.test.tsx`

The orchestrator. Owns read/edit toggle, dirty flag, save/cancel flow, banner, ⌘S, beforeunload.

- [ ] **Step 1: Write the failing test**

```tsx
// components/edit-tasks/__tests__/task-editor-container.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskEditorContainer } from '../task-editor-container';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

const mkPara = (text: string) => ({
  type: 'paragraph',
  paragraph: {
    rich_text: [
      {
        plain_text: text,
        annotations: { bold: false, italic: false, strikethrough: false, underline: false, code: false },
        href: null,
      },
    ],
  },
});

const mkUnsupported = () => ({
  type: 'toggle',
  id: 'tog-1',
  toggle: { rich_text: [{ plain_text: 'hidden' }] },
});

beforeEach(() => {
  refresh.mockReset();
  successToast.mockReset();
  errorToast.mockReset();
  globalThis.fetch = vi.fn();
});

function fetchOk(body: unknown) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

function fetchFail(status: number, body: unknown) {
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => body,
  });
}

describe('TaskEditorContainer', () => {
  it('renders BlocksRenderer in read mode by default', () => {
    render(<TaskEditorContainer blocks={[mkPara('Hello world')]} taskId="t1" />);
    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
  });

  it('renders a pencil button (desktop only) in read mode', () => {
    render(<TaskEditorContainer blocks={[mkPara('Hello')]} taskId="t1" />);
    const pencil = screen.getByRole('button', { name: /editar/i });
    expect(pencil).toBeInTheDocument();
    expect(pencil.className).toMatch(/hidden sm:/);
  });

  it('switches to edit mode when pencil is clicked', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hello')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('shows banner and disables Guardar when doc has an unsupported block', async () => {
    const user = userEvent.setup();
    render(
      <TaskEditorContainer blocks={[mkPara('Hello'), mkUnsupported()]} taskId="t1" />,
    );
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByText(/no soportamos editar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('cancel returns to read mode without prompting when nothing is dirty', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(screen.queryByText(/editando/i)).not.toBeInTheDocument();
  });

  it('Guardar is disabled in edit mode until the editor reports a change', async () => {
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));
    expect(screen.getByRole('button', { name: /guardar/i })).toBeDisabled();
  });

  it('toasts an error and stays in edit mode on 503 append-failed', async () => {
    // We can't easily simulate dirty without poking the editor. We instead
    // trigger save via the testing hook documented in Step 3 of the impl.
    fetchFail(503, { error: 'append-failed' });
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));

    // Use the hidden test affordance — see implementation step 3 for the rationale.
    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="force-save"]');
    expect(trigger).not.toBeNull();
    await user.click(trigger!);

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(screen.getByText(/editando/i)).toBeInTheDocument();
  });

  it('toasts success and exits edit mode on save 200 (via test affordance)', async () => {
    fetchOk({ ok: true, lastEditedTime: '2026-04-29T12:00:00.000Z' });
    const user = userEvent.setup();
    render(<TaskEditorContainer blocks={[mkPara('Hi')]} taskId="t1" />);
    await user.click(screen.getByRole('button', { name: /editar/i }));

    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="force-save"]');
    await user.click(trigger!);

    await waitFor(() => expect(successToast).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalled();
    expect(screen.queryByText(/editando/i)).not.toBeInTheDocument();
  });
});
```

NOTE on the test affordance: jsdom can't realistically generate ProseMirror keystrokes, so the impl exposes a hidden `[data-testid="force-save"]` button in NODE_ENV=test only. This unlocks integration testing of the save path without faking ProseMirror internals.

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- components/edit-tasks/__tests__/task-editor-container.test.tsx --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// components/edit-tasks/task-editor-container.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { notionBlocksToProseMirror } from '@/lib/edit-tasks/serialize-from-notion';
import { TaskEditor, type TaskEditorHandle } from './task-editor';
import { SaveBar } from './save-bar';

type Props = {
  blocks: unknown[];
  taskId: string;
};

const BANNER_TEXT =
  'Esta tarea contiene bloques que aún no soportamos editar (toggles, columnas, embeds, syncs). Por seguridad, Guardar está desactivado. Edita la tarea desde Notion para tocarla, o regresa al modo lectura.';

export function TaskEditorContainer({ blocks, taskId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<TaskEditorHandle>(null);

  const initialDoc = useMemo(() => notionBlocksToProseMirror(blocks), [blocks]);
  const hasUnsupported = useMemo(
    () => initialDoc.content?.some((n) => n.type === 'unsupported_block') ?? false,
    [initialDoc],
  );

  // beforeunload guard while editing with dirty changes
  useEffect(() => {
    if (mode !== 'edit' || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [mode, dirty]);

  // ⌘S / Ctrl+S to save while in edit mode
  useEffect(() => {
    if (mode !== 'edit') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Allow save shortcut from inside the contenteditable (which has tag DIV);
      // skip only for INPUT/TEXTAREA outside the editor.
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // handleSave is stable for the closure; relies on ref + state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dirty, hasUnsupported, saving]);

  async function handleSave() {
    if (!editorRef.current && !isTestEnv()) return;
    if (hasUnsupported) {
      toast.error('Este tipo de bloque no se puede guardar todavía', {
        description: 'Edita la tarea desde Notion mientras lo soportamos.',
      });
      return;
    }
    setSaving(true);
    try {
      const doc = editorRef.current ? editorRef.current.getDoc() : initialDoc;
      const res = await fetch(`/api/tasks/${taskId}/blocks`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ doc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string; remaining?: number }));
        const stage = body.error;
        if (stage === 'delete-failed') {
          toast.error('No se pudo guardar', {
            description: `Notion borró parte del contenido pero no terminó. ${body.remaining ?? ''} bloques quedan. Reintenta.`,
          });
        } else if (stage === 'append-failed') {
          toast.error('No se pudo guardar', {
            description: 'No se pudo escribir los bloques nuevos. Reintenta.',
          });
        } else if (res.status === 401 || res.status === 403) {
          toast.error('No tienes acceso para guardar');
        } else if (res.status === 404) {
          toast.error('Esta tarea fue eliminada');
        } else {
          toast.error('No se pudo guardar', { description: 'Reintenta en un momento.' });
        }
        return;
      }
      toast.success('Cambios guardados');
      setDirty(false);
      setMode('read');
      router.refresh();
    } catch {
      toast.error('Sin conexión', { description: 'Reintenta cuando recuperes la red.' });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    setDirty(false);
    setMode('read');
  }

  const canSave = !hasUnsupported;

  if (mode === 'read') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMode('edit')}
          aria-label="Editar tarea"
          className="hidden sm:inline-flex absolute right-0 top-0 items-center gap-1 px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-[#5e6ad2] hover:bg-[#eeeffc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          Editar
        </button>
        {blocks.length > 0 ? (
          <BlocksRenderer blocks={blocks as never[]} />
        ) : (
          <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <SaveBar
        dirty={dirty}
        saving={saving}
        canSave={canSave}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      {hasUnsupported && (
        <div className="my-3 flex items-start gap-2 p-3 rounded-md bg-[#faf0db] border border-[#efddb6] text-[12px] text-[#6b4f18]">
          <AlertTriangle className="w-4 h-4 mt-[1px] shrink-0" aria-hidden />
          <p className="leading-relaxed">{BANNER_TEXT}</p>
        </div>
      )}
      <TaskEditor
        ref={editorRef}
        initialDoc={initialDoc}
        onChange={() => setDirty(true)}
      />
      {isTestEnv() && (
        <button
          type="button"
          data-testid="force-save"
          onClick={handleSave}
          style={{ position: 'absolute', left: -9999 }}
          aria-hidden
        />
      )}
    </div>
  );
}

function isTestEnv(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}
```

The `data-testid="force-save"` button is gated by `NODE_ENV === 'test'` (Vitest sets this) and is invisible. It exists solely to test the save path without faking ProseMirror keystroke generation in jsdom. Real users on production builds never see it.

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- components/edit-tasks/__tests__/task-editor-container.test.tsx --run`
Expected: PASS — all 8 tests green.

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/task-editor-container.tsx components/edit-tasks/__tests__/task-editor-container.test.tsx
git commit -m "feat(edit-tasks): add TaskEditorContainer with save flow + banner gating"
```

---

## Task 5: Wire `TaskEditorContainer` into `task-detail.tsx`

**Files:**
- Modify: `components/kanban/task-detail.tsx`

- [ ] **Step 1: Update the imports**

At the top of `components/kanban/task-detail.tsx`, replace:

```tsx
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
```

with:

```tsx
import { TaskEditorContainer } from '@/components/edit-tasks/task-editor-container';
```

- [ ] **Step 2: Replace the content column body**

In the `<PageEnter delay={120}>` block, replace:

```tsx
{blocks.length > 0 ? (
  <div className="text-[14px]">
    <BlocksRenderer blocks={blocks} />
  </div>
) : (
  <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
)}
```

with:

```tsx
<div className="text-[14px]">
  <TaskEditorContainer blocks={blocks} taskId={task.id} />
</div>
```

The container now owns both the read-mode rendering AND the empty-state fallback ("Sin descripción.") — simpler upstream.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Run the full test suite to confirm no regressions**

Run: `npm run test -- --run`
Expected: PASS — every test green, including the existing `task-detail-header.test.tsx`.

- [ ] **Step 5: Manual smoke check**

Run: `npm run dev`. Open `http://localhost:4000`, navigate to any task detail page. Verify:

1. The body renders with the existing read-mode look.
2. A small "Editar" pencil button appears at the top-right of the content column.
3. Clicking it switches to edit mode with a contenteditable area, the SaveBar at the top, and an "Editando" indicator.
4. Typing dirties the doc — Guardar lights up.
5. Pressing `⌘S` (or clicking Guardar) issues a PATCH request, shows a success toast, and returns to read mode with refreshed content.
6. Pressing Cancelar with unsaved changes opens a `confirm` dialog; with no changes it returns silently.
7. Reloading the page with unsaved changes triggers the browser's "Leave site?" prompt.
8. On a task with a Notion toggle / column / embed: a yellow banner appears, Guardar is disabled, clicking it does nothing.
9. On a `< sm` viewport (Chrome DevTools mobile): the pencil button is hidden.

If any check fails, return to the relevant component file and fix before committing.

- [ ] **Step 6: Commit**

```bash
git add components/kanban/task-detail.tsx
git commit -m "feat(detail): wire TaskEditorContainer into task detail content column"
```

---

## Task 6: Final gates

**Files:** none

- [ ] **Step 1: Full suite + typecheck + build**

Run: `npm run typecheck` → PASS
Run: `npm run test -- --run` → PASS
Run: `npm run build` → PASS

- [ ] **Step 2: If anything fails, fix and re-run. Green is the deliverable.**

---

## Done.

After Task 6, the editor ships. A user with a desktop browser can edit any task body, save through Phase 1's API, and confirm changes persist in Notion. Tasks with unsupported blocks are blocked at the Guardar button per the Phase 1 constraint.

Phase 2B (inputrules + extended keymap) is the next plan.
