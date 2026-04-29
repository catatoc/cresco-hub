# Edit Tasks Phase 2A — Minimum Viable Editor

**Date:** 2026-04-29
**Status:** Ready for plan
**Owner:** Notion Hub
**Branch:** `feat/edit-tasks-ui-phase-2`
**Parent spec:** `docs/superpowers/specs/2026-04-29-edit-tasks-design.md`

## Goal

Build the thinnest possible UI on top of Phase 1's API so that a user on the task detail page can:

1. Click a pencil button (desktop only) to enter edit mode.
2. Type, undo/redo, navigate with the keyboard (built-in ProseMirror behaviors).
3. Click "Guardar" (or press `⌘S` / `Ctrl+S`) to commit changes via the existing PATCH route.
4. Click "Cancelar" (or press `Esc` after a confirm) to abandon local edits.
5. See a banner blocking save when the task contains an `unsupported_block` (toggle, column, embed, sync) — see Phase 1 spec's Round-trip limitation.
6. Get a `beforeunload` warning when leaving with unsaved changes.

After Phase 2A ships, the editor is functional but bare — no slash menu, no inline toolbar, no markdown shortcuts. Those land in Phases 2B / 2C / 2D.

## Phase 2 decomposition (for context)

| Sub-phase | Scope | Status |
|---|---|---|
| **2A** (this spec) | Mount editor + save flow | In progress |
| 2B | Inputrules (markdown shortcuts) + extended keymap | Future |
| 2C | Slash menu plugin + popover | Future |
| 2D | Inline toolbar + callout emoji picker + code language picker + mermaid side preview | Future |

Each sub-phase ships independently and is mergeable on its own.

## Out of scope for 2A

Everything from the parent spec EXCEPT the bullet list above. Specifically:

- Slash menu trigger / popover (deferred to 2C).
- Inputrules (`# `, `**bold**`, `1. `, etc.) — deferred to 2B.
- Extended keymap (`⌘B`, `⌘I`, `⌘E`, `⌘K`, `Tab`, `Shift+Tab`, `Alt+↑/↓`) — deferred to 2B. **Only the ProseMirror baseKeymap (Enter, Backspace, arrow keys, undo/redo) is wired in 2A.**
- Inline formatting toolbar — deferred to 2D.
- Callout emoji picker / code language picker — deferred to 2D.
- Mermaid side preview — deferred to 2D.

Practical implication: in 2A the user can write paragraphs, navigate, and save. Headings, lists, code blocks, callouts can only be created if Notion already has them in the loaded doc — there's no UI yet to insert one from inside the editor. This is intentional — most edit sessions are tweaks to existing content, and 2B/2C will add the insertion paths.

## Approach

### New runtime ProseMirror dependencies

Phase 1 installed `prosemirror-model`, `prosemirror-state`, `prosemirror-schema-basic`, `prosemirror-schema-list`. Phase 2A adds:

- `prosemirror-view` — DOM rendering of the contenteditable area.
- `prosemirror-history` — undo/redo plugin.
- `prosemirror-commands` — `baseKeymap` (Enter, Backspace, arrow keys, etc.).
- `prosemirror-keymap` — to wire commands to keys.
- `prosemirror-dropcursor` — visual cursor for drop targets.
- `prosemirror-gapcursor` — cursor between block atoms (e.g. between two dividers).

Total addition: ~25 KB gzipped on top of Phase 1's ~25 KB. Final editor bundle ~50 KB.

### Component architecture

Three new files:

- `components/edit-tasks/task-editor.tsx` — pure editor mount. Headless of read/save logic. Owns the EditorView and exposes a ref-based imperative API (`getDoc`, `hasChanges`).
- `components/edit-tasks/task-editor-container.tsx` — stateful client container that owns edit-mode toggle, dirty flag, save flow, banner, beforeunload, and `⌘S`. Renders `BlocksRenderer` (read-only) when not editing and `TaskEditor` plus action bar when editing.
- `components/edit-tasks/save-bar.tsx` — extracted small component: title row "Editando" indicator + Guardar (gradient) + Cancelar (outline). Receives `dirty: boolean`, `saving: boolean`, `canSave: boolean` (false when banner is up), `onSave`, `onCancel`.

Modified file:

- `components/kanban/task-detail.tsx` — replace the inline `<BlocksRenderer blocks={blocks} />` block with `<TaskEditorContainer blocks={blocks} taskId={task.id} />`.

### `TaskEditor` (the mount itself)

Receives `initialDoc: PMNode` (already serialized from Notion blocks via `notionBlocksToProseMirror`) — NOT raw Notion blocks. The container does the conversion once. The editor only deals with PM data.

Lifecycle:

1. On mount, build `EditorState` with `editTasksSchema`, the doc, and the plugin set (`history()`, `keymap(baseKeymap)`, `dropCursor()`, `gapCursor()`).
2. Mount an `EditorView` in a `<div>` ref.
3. On every transaction, dispatch a state update and call `onChange?.()` so the container can flip its dirty flag.
4. On unmount, call `view.destroy()` to remove the contenteditable cleanup.

Exposes via `useImperativeHandle` ref:

```ts
type TaskEditorHandle = {
  getDoc: () => PMNodeJSON;
  hasChanges: () => boolean;  // doc changed since mount
};
```

The component is a client component (`'use client'`) and intentionally has no styling beyond minimal `outline: none` and prose tailwind classes. Phase 2D may polish it.

### `TaskEditorContainer` (the orchestrator)

Owns the read/edit toggle and the save flow. State:

```ts
const [mode, setMode] = useState<'read' | 'edit'>('read');
const [dirty, setDirty] = useState(false);
const [saving, setSaving] = useState(false);
const editorRef = useRef<TaskEditorHandle>(null);
```

Computes once:

```ts
const initialDoc = useMemo(() => notionBlocksToProseMirror(blocks), [blocks]);
const hasUnsupported = useMemo(
  () => initialDoc.content?.some((n) => n.type === 'unsupported_block') ?? false,
  [initialDoc],
);
```

#### Read mode (default)

Renders `<BlocksRenderer blocks={blocks} />` plus a pencil button. Pencil sits next to the task title — but since the title lives in `task-detail.tsx`, the pencil renders in a small floating affordance at the top-right of the content column, anchored above the description (visible on hover of the content area on desktop, hidden on `< sm` viewports).

Click → `setMode('edit')`.

#### Edit mode

Renders:

- An "unsupported blocks" banner if `hasUnsupported` is true (see banner copy below).
- `<TaskEditor ref={editorRef} initialDoc={initialDoc} onChange={() => setDirty(true)} />`.
- A `<SaveBar />` at the top with Guardar + Cancelar.

#### Save flow

```ts
async function handleSave() {
  if (!editorRef.current) return;
  if (hasUnsupported) {
    toast.error('Este tipo de bloque no se puede guardar todavía', {
      description: 'Edita la tarea desde Notion mientras lo soportamos.',
    });
    return;
  }
  setSaving(true);
  try {
    const doc = editorRef.current.getDoc();
    const res = await fetch(`/api/tasks/${taskId}/blocks`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ doc }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const stage = body.error;
      if (stage === 'append-failed' || stage === 'delete-failed') {
        toast.error('No se pudo guardar', {
          description:
            stage === 'delete-failed'
              ? `Notion borró parte del contenido pero no terminó. ${body.remaining ?? ''} bloques quedan. Reintenta.`
              : 'No se pudo escribir los bloques nuevos. Reintenta.',
        });
      } else {
        toast.error('No se pudo guardar', { description: 'Reintenta en un momento.' });
      }
      return;
    }
    toast.success('Cambios guardados');
    setDirty(false);
    setMode('read');
    router.refresh(); // re-fetch blocks on the server side so read-mode shows fresh content
  } catch {
    toast.error('Sin conexión', { description: 'Reintenta cuando recuperes la red.' });
  } finally {
    setSaving(false);
  }
}
```

#### Cancel flow

```ts
function handleCancel() {
  if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
  setDirty(false);
  setMode('read');
}
```

#### Keyboard shortcuts

- `⌘S` / `Ctrl+S` while in edit mode and not editing inside an INPUT/TEXTAREA → calls `handleSave`. Use the same editable-target guard pattern as `task-detail-shortcuts.tsx`.
- `Esc` does NOT auto-cancel — the existing `Esc` handler in `task-detail-header.tsx` navigates back, which is the expected behavior. If the user presses Esc with unsaved changes, the existing `beforeunload`-equivalent behavior (router-level guard) doesn't intercept — accept this as a v1 limitation; warn via beforeunload at the browser level only.

#### `beforeunload` warning

```ts
useEffect(() => {
  if (mode !== 'edit' || !dirty) return;
  const onBeforeUnload = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', onBeforeUnload);
  return () => window.removeEventListener('beforeunload', onBeforeUnload);
}, [mode, dirty]);
```

#### Banner copy (when `hasUnsupported` is true)

```
Esta tarea contiene bloques de Notion que aún no soportamos editar (toggles, columnas, embeds, syncs). Por seguridad, el botón Guardar está desactivado.

Edita la tarea desde Notion para tocar el cuerpo entero, o regresa al modo lectura.
```

Render with a yellow warning chevron icon and a `bg-[#faf0db] border-[#efddb6] text-[#6b4f18]` callout-style box.

### Mobile gating

The pencil button is hidden on `< sm` (`hidden sm:inline-flex`). The user gets read-only on mobile, no friction. No tooltip needed — the absence is unobtrusive enough.

### Permissions

The PATCH route already enforces `customerId` scope. The container makes no client-side authorization decisions — the server is the gate. A user without write access would get a 403 and see "No se pudo guardar" (the route returns 403 for both unauthenticated and wrong-customer cases).

## File map

**New (in `components/edit-tasks/`):**

- `task-editor.tsx` — pure mount, ~80 LOC.
- `task-editor-container.tsx` — orchestrator, ~150 LOC.
- `save-bar.tsx` — small UI component, ~50 LOC.
- `__tests__/task-editor.test.tsx` — RTL tests for mount, dispatch, change detection.
- `__tests__/task-editor-container.test.tsx` — tests for read/edit toggle, save success/failure, banner gating, dirty tracking.
- `__tests__/save-bar.test.tsx` — render variants.

**Modified:**

- `components/kanban/task-detail.tsx` — swap `<BlocksRenderer />` for `<TaskEditorContainer />` inside the content column. Keep the title row above untouched. Pass `blocks` and `task.id`.
- `package.json` — add 6 new ProseMirror packages.

## Data flow

```
[Read mode]
  TaskDetail → TaskEditorContainer (mode='read')
    └─ BlocksRenderer + pencil button (desktop)

User clicks ✏️
  ↓
[Edit mode]
  TaskEditorContainer (mode='edit', dirty=false)
    ├─ Banner (if hasUnsupported)
    ├─ SaveBar (Guardar disabled if hasUnsupported, Cancelar)
    └─ TaskEditor (ref) ← initialDoc = notionBlocksToProseMirror(blocks)

User types
  ↓ TaskEditor.onChange()
  ↓ container.dirty = true

User clicks Guardar / ⌘S
  ↓ editorRef.getDoc()
  ↓ PATCH /api/tasks/[id]/blocks { doc }
  ↓ on 200: toast success → setMode('read') → router.refresh()
  ↓ on error: toast with stage-specific message → stay in edit mode

User clicks Cancelar
  ↓ confirm() if dirty
  ↓ setMode('read')
```

## Error handling

| Scenario | UX |
|---|---|
| Network failure | toast "Sin conexión. Reintenta." Stays in edit mode. |
| 401/403 | toast "No tienes acceso para guardar". (Practically rare since the page wouldn't have loaded.) |
| 404 | toast "Esta tarea fue eliminada." |
| 503 `delete-failed` | toast "Notion borró parte del contenido pero no terminó. {N} bloques quedan. Reintenta." Body in Notion is partially gone — we can't recover here, but a retry should pick up where the prior delete left off (the next list call will return fewer blocks). |
| 503 `append-failed` | toast "No se pudo escribir los bloques nuevos. Reintenta." Body in Notion is empty after this (delete already ran). User can retry. |
| Banner blocks save | Guardar button is disabled and clicking it does nothing (defensive: handler also early-returns). |

The recovery path for `delete-failed` / `append-failed` is "retry" — the editor's local doc is preserved, so reusing it next attempt gets the user back to a good state. The Phase 1 spec's "copy to clipboard" recovery idea is **not** implemented in 2A — too costly for marginal value when the local doc is intact in the editor anyway.

## Testing

- **Unit (`save-bar.test.tsx`)**: renders Guardar disabled when `canSave={false}`, calls `onSave`/`onCancel` on click, shows "Guardando..." when `saving`.
- **Component (`task-editor.test.tsx`)**: mounts with an initial doc, types into the contenteditable, ref `hasChanges()` returns true, ref `getDoc()` reflects current state. Uses RTL + jsdom; ProseMirror works in jsdom for basic mounting. (Real cursor / selection bugs are caught by manual smoke.)
- **Integration (`task-editor-container.test.tsx`)**: starts in read mode, click pencil → edit mode, type, click Guardar → mock fetch success → returns to read mode + toast called. Same flow with mocked 503 → stays in edit mode + error toast. Banner case: doc has `unsupported_block` → Guardar disabled + click no-op.
- **Manual smoke**: `npm run dev`, open a real task, edit a paragraph, save, reload, confirm Notion has the change. Edit a task that contains a callout (supported) — save round-trips. Edit a task with a toggle (unsupported) — banner shows, Guardar blocks.

## Implementation order (for the planner)

1. Install ProseMirror runtime deps.
2. `SaveBar` component + tests (smallest, most isolated).
3. `TaskEditor` component + tests (the mount). Use the existing schema and `notionBlocksToProseMirror` from Phase 1.
4. `TaskEditorContainer` component + tests (orchestrator).
5. Wire into `task-detail.tsx`. Manual smoke.
6. Final gates: typecheck + suite + build.

6 tasks, all mergeable atomically. Phase 2B starts the moment 2A is in.

## Open question for the planner (none blocking)

Should the pencil button be a small icon button at the top-right of the content column, or a labeled "✏️ Editar" button in the existing footer alongside "Abrir en Notion" and the OpenWithClaudeMenu? **Recommendation:** small icon at the top-right of the content column — keeps the footer focused on cross-task affordances (Notion, Claude) while the pencil is a per-content-column action. The plan should pick one and stick with it.
