# Edit Tasks Phase 2D — Inline Toolbar & Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add a floating inline toolbar (Bold / Italic / Strike / Code / Link) that appears on text selection, plus a `⌘K`-triggered URL prompt for adding link marks. After 2D the editor's text-styling story is complete.

**Architecture:** Two new client components (`InlineToolbar`, `LinkPrompt`) consume the same `view + tick` bridge from Phase 2C. A small pure URL normalizer keeps the link policy testable. `Mod-k` is wired via a closure-based keymap inside `TaskEditor`'s `useEffect` so `lib/edit-tasks/keymap.ts` stays pure.

**Tech Stack:** Same as 2C; no new deps.

---

## Spec reference

`docs/superpowers/specs/2026-04-29-edit-tasks-phase-2d-design.md`.

## File map

**New:**
- `lib/edit-tasks/normalize-url.ts` + `.test.ts` — pure URL prefix policy.
- `components/edit-tasks/link-prompt.tsx` + `__tests__/link-prompt.test.tsx`.
- `components/edit-tasks/inline-toolbar.tsx` + `__tests__/inline-toolbar.test.tsx`.

**Modified:**
- `components/edit-tasks/task-editor.tsx` — render both components, manage link prompt state, register `Mod-k` keymap.

---

## Task 1: `normalizeUrl` helper (TDD)

**Files:**
- Create: `lib/edit-tasks/normalize-url.ts`
- Create: `lib/edit-tasks/normalize-url.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/edit-tasks/normalize-url.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeUrl } from './normalize-url';

describe('normalizeUrl', () => {
  it('returns empty string for empty input', () => {
    expect(normalizeUrl('')).toBe('');
    expect(normalizeUrl('   ')).toBe('');
  });

  it('preserves http:// urls', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('preserves https:// urls', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('preserves mailto: urls', () => {
    expect(normalizeUrl('mailto:a@b.com')).toBe('mailto:a@b.com');
  });

  it('prepends https:// when no scheme is present', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('www.example.com/path')).toBe('https://www.example.com/path');
  });

  it('trims whitespace', () => {
    expect(normalizeUrl('  example.com  ')).toBe('https://example.com');
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/normalize-url.test.ts --run` → FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/edit-tasks/normalize-url.ts

const SCHEMES = ['http://', 'https://', 'mailto:'];

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (trimmed.length === 0) return '';
  if (SCHEMES.some((s) => trimmed.toLowerCase().startsWith(s))) return trimmed;
  return `https://${trimmed}`;
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/normalize-url.test.ts --run` → PASS (6/6).

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/normalize-url.ts lib/edit-tasks/normalize-url.test.ts
git commit -m "feat(edit-tasks): add normalizeUrl helper for link prompt"
```

---

## Task 2: `<LinkPrompt>` component (TDD)

**Files:**
- Create: `components/edit-tasks/link-prompt.tsx`
- Create: `components/edit-tasks/__tests__/link-prompt.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/edit-tasks/__tests__/link-prompt.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LinkPrompt } from '../link-prompt';

describe('LinkPrompt', () => {
  it('renders an input prefilled with initialUrl', () => {
    render(<LinkPrompt initialUrl="https://x.com" onSubmit={() => {}} onCancel={() => {}} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('https://x.com');
  });

  it('calls onSubmit with normalized URL on Enter', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={onSubmit} onCancel={() => {}} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'example.com');
    await user.keyboard('{Enter}');
    expect(onSubmit).toHaveBeenCalledWith('https://example.com');
  });

  it('calls onCancel on Escape', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={() => {}} onCancel={onCancel} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalled();
  });

  it('submitting an empty input cancels rather than submits', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onCancel = vi.fn();
    render(<LinkPrompt initialUrl="" onSubmit={onSubmit} onCancel={onCancel} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('autofocuses on mount', () => {
    render(<LinkPrompt initialUrl="" onSubmit={() => {}} onCancel={() => {}} />);
    const input = screen.getByRole('textbox');
    expect(document.activeElement).toBe(input);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- components/edit-tasks/__tests__/link-prompt.test.tsx --run` → FAIL.

- [ ] **Step 3: Write the implementation**

```tsx
// components/edit-tasks/link-prompt.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { normalizeUrl } from '@/lib/edit-tasks/normalize-url';

type Props = {
  initialUrl: string;
  onSubmit: (url: string) => void;
  onCancel: () => void;
};

export function LinkPrompt({ initialUrl, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState(initialUrl);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const normalized = normalizeUrl(value);
      if (normalized.length === 0) onCancel();
      else onSubmit(normalized);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white border border-border shadow-md">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder="https://…"
        className="text-[12.5px] px-1 py-0.5 outline-none min-w-[260px] bg-transparent"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- components/edit-tasks/__tests__/link-prompt.test.tsx --run` → PASS (5/5).

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/link-prompt.tsx components/edit-tasks/__tests__/link-prompt.test.tsx
git commit -m "feat(edit-tasks): add LinkPrompt component"
```

---

## Task 3: `<InlineToolbar>` component (TDD)

**Files:**
- Create: `components/edit-tasks/inline-toolbar.tsx`
- Create: `components/edit-tasks/__tests__/inline-toolbar.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/edit-tasks/__tests__/inline-toolbar.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InlineToolbar } from '../inline-toolbar';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { EditorState, TextSelection } from 'prosemirror-state';

function buildView(text: string, selectFromTo?: [number, number]) {
  const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text(text)]);
  const doc = editTasksSchema.node('doc', null, [para]);
  let state = EditorState.create({ doc });
  if (selectFromTo) {
    const [from, to] = selectFromTo;
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, from, to)));
  }
  const dispatch = vi.fn((tr) => {
    state = state.apply(tr);
  });
  return {
    state,
    get selection() {
      return state.selection;
    },
    dispatch,
    coordsAtPos: () => ({ left: 100, top: 50, bottom: 70, right: 110 }),
    focus: vi.fn(),
  };
}

const onLinkRequest = vi.fn();

beforeEach(() => onLinkRequest.mockReset());

describe('InlineToolbar', () => {
  it('returns null when selection is empty', () => {
    const view = buildView('Hello') as never;
    const { container } = render(
      <InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />,
    );
    expect(container.querySelector('[role="toolbar"]')).toBeNull();
  });

  it('renders 5 buttons when there is a non-empty selection', () => {
    const view = buildView('Hello', [1, 6]) as never; // select 'Hello'
    render(<InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />);
    expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /strike/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^code$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument();
  });

  it('clicking the link button calls onLinkRequest', async () => {
    const user = userEvent.setup();
    const view = buildView('Hello', [1, 6]) as never;
    render(<InlineToolbar view={view} tick={1} onLinkRequest={onLinkRequest} />);
    await user.click(screen.getByRole('button', { name: /link/i }));
    expect(onLinkRequest).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- components/edit-tasks/__tests__/inline-toolbar.test.tsx --run` → FAIL.

- [ ] **Step 3: Write the implementation**

```tsx
// components/edit-tasks/inline-toolbar.tsx
'use client';

import { useMemo } from 'react';
import type { EditorView } from 'prosemirror-view';
import { toggleMark } from 'prosemirror-commands';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon } from 'lucide-react';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { cn } from '@/lib/utils';

type Props = {
  view: EditorView | null;
  tick: number;
  onLinkRequest: () => void;
};

export function InlineToolbar({ view, tick, onLinkRequest }: Props) {
  const selectionInfo = useMemo(() => {
    if (!view) return null;
    const { from, to, empty } = view.state.selection;
    if (empty) return null;
    // Skip when the selection sits inside a code block (no marks allowed)
    const $from = view.state.doc.resolve(from);
    if ($from.parent.type.name === 'code_block') return null;
    return { from, to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tick]);

  if (!selectionInfo || !view) return null;

  function run(name: 'bold' | 'italic' | 'strikethrough' | 'code') {
    if (!view) return;
    const mark = editTasksSchema.marks[name]!;
    toggleMark(mark)(view.state, view.dispatch.bind(view));
    view.focus();
  }

  function isActive(name: 'bold' | 'italic' | 'strikethrough' | 'code'): boolean {
    if (!view) return false;
    const mark = editTasksSchema.marks[name]!;
    const { from, to } = view.state.selection;
    return view.state.doc.rangeHasMark(from, to, mark);
  }

  const coords = view.coordsAtPos(selectionInfo.from);

  return (
    <div
      role="toolbar"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top - 36,
        zIndex: 50,
      }}
      className="inline-flex items-center gap-0.5 p-1 rounded-md bg-white border border-border shadow-md"
    >
      <ToolbarButton label="Bold" onClick={() => run('bold')} active={isActive('bold')}>
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => run('italic')} active={isActive('italic')}>
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strike"
        onClick={() => run('strikethrough')}
        active={isActive('strikethrough')}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Code" onClick={() => run('code')} active={isActive('code')}>
        <Code className="w-3.5 h-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-0.5" />
      <ToolbarButton label="Link" onClick={onLinkRequest} active={false}>
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-grid place-items-center w-7 h-7 rounded',
        active
          ? 'bg-[#eeeffc] text-[#5e6ad2]'
          : 'text-foreground hover:bg-[#f7f7f8]',
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- components/edit-tasks/__tests__/inline-toolbar.test.tsx --run` → PASS (3/3).

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/inline-toolbar.tsx components/edit-tasks/__tests__/inline-toolbar.test.tsx
git commit -m "feat(edit-tasks): add InlineToolbar component"
```

---

## Task 4: Wire toolbar + link prompt into `TaskEditor`

**File:** `components/edit-tasks/task-editor.tsx`

The TaskEditor needs:
1. State for `linkPromptOpen: boolean` and `selectionForLink: { from, to } | null`.
2. A `Mod-k` keymap registered inside `useEffect` (closure capturing `setLinkPromptOpen`).
3. Render `<InlineToolbar>` and `<LinkPrompt>` next to the host div.
4. When LinkPrompt submits, apply the link mark to the captured selection.

- [ ] **Step 1: Update the file**

Replace the entire file contents with this version:

```tsx
'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { inputRules } from 'prosemirror-inputrules';
import { Node as PMNode } from 'prosemirror-model';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { editTasksInputRules } from '@/lib/edit-tasks/inputrules';
import { editTasksKeymap } from '@/lib/edit-tasks/keymap';
import { slashMenuPlugin } from '@/lib/edit-tasks/slash-menu-plugin';
import { SlashMenu } from './slash-menu';
import { InlineToolbar } from './inline-toolbar';
import { LinkPrompt } from './link-prompt';

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
  replaceContent: (doc: PMNodeJSON) => void;
  getView: () => EditorView | null;
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
  const [tick, setTick] = useState(0);
  const [linkPromptOpen, setLinkPromptOpen] = useState(false);
  // Captured at the moment the user invokes the link prompt; used to apply
  // the mark even if focus shifts to the prompt input.
  const linkSelectionRef = useRef<{ from: number; to: number } | null>(null);

  function openLinkPrompt() {
    if (!viewRef.current) return;
    const { from, to, empty } = viewRef.current.state.selection;
    if (empty) return;
    linkSelectionRef.current = { from, to };
    setLinkPromptOpen(true);
  }

  function applyLink(url: string) {
    const view = viewRef.current;
    const sel = linkSelectionRef.current;
    if (!view || !sel) {
      setLinkPromptOpen(false);
      return;
    }
    const linkMark = editTasksSchema.marks.link!.create({ href: url });
    view.dispatch(view.state.tr.addMark(sel.from, sel.to, linkMark));
    setLinkPromptOpen(false);
    view.focus();
  }

  function cancelLink() {
    setLinkPromptOpen(false);
    viewRef.current?.focus();
  }

  function currentLinkUrl(): string {
    const view = viewRef.current;
    const sel = linkSelectionRef.current;
    if (!view || !sel) return '';
    const linkType = editTasksSchema.marks.link!;
    const $from = view.state.doc.resolve(sel.from);
    const existing = linkType.isInSet($from.marks());
    return (existing?.attrs.href as string) ?? '';
  }

  useEffect(() => {
    if (!hostRef.current) return;
    const doc = PMNode.fromJSON(editTasksSchema, initialDoc);
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap({
          'Mod-k': () => {
            openLinkPrompt();
            return true;
          },
        }),
        keymap(editTasksKeymap),
        inputRules({ rules: editTasksInputRules }),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        slashMenuPlugin(),
      ],
    });
    const view = new EditorView(hostRef.current, {
      state,
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        onChange();
        setTick((t) => t + 1);
      },
    });
    viewRef.current = view;
    setTick((t) => t + 1);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
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
      onChange();
      setTick((t) => t + 1);
    },
    getView: () => viewRef.current,
  }));

  return (
    <>
      <div
        ref={hostRef}
        className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
      />
      <SlashMenu view={viewRef.current} tick={tick} />
      {!linkPromptOpen && (
        <InlineToolbar
          view={viewRef.current}
          tick={tick}
          onLinkRequest={openLinkPrompt}
        />
      )}
      {linkPromptOpen && viewRef.current && (
        <div
          style={{
            position: 'fixed',
            left: viewRef.current.coordsAtPos(linkSelectionRef.current?.from ?? 0).left,
            top: viewRef.current.coordsAtPos(linkSelectionRef.current?.from ?? 0).top - 44,
            zIndex: 50,
          }}
        >
          <LinkPrompt initialUrl={currentLinkUrl()} onSubmit={applyLink} onCancel={cancelLink} />
        </div>
      )}
    </>
  );
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → PASS.

- [ ] **Step 3: Run editor tests**

Run: `npm run test -- components/edit-tasks --run` → PASS.

- [ ] **Step 4: Run full suite**

Run: `npm run test -- --run` → PASS.

- [ ] **Step 5: Commit**

```bash
git add components/edit-tasks/task-editor.tsx
git commit -m "feat(edit-tasks): wire InlineToolbar and LinkPrompt into TaskEditor"
```

---

## Task 5: Final gates

- [ ] `npm run typecheck` → PASS
- [ ] `npm run test -- --run` → PASS
- [ ] `npm run build` → PASS

## Done.

Phase 2D complete. The editor now has a full Notion-like block + inline editing experience.
