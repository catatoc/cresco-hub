# Edit Tasks Phase 2C — Slash Menu

**Date:** 2026-04-29
**Status:** Ready for plan
**Branch:** `feat/edit-tasks-ui-phase-2c`
**Parent spec:** `docs/superpowers/specs/2026-04-29-edit-tasks-design.md`

## Goal

Type `/` at the start of an empty paragraph → a popover appears with block-insertion options. Arrow keys navigate, type to filter, Enter / click inserts. Esc closes. After 2C, the editor matches Notion's quick-insert UX for the supported block types.

## Scope

**Items in the menu (9):**

| # | Label | Result |
|---|---|---|
| 1 | Heading 1 | replace paragraph with `heading level=1` |
| 2 | Heading 2 | `heading level=2` |
| 3 | Heading 3 | `heading level=3` |
| 4 | Bullet list | wrap in `bulleted_list > bulleted_list_item` |
| 5 | Numbered list | wrap in `numbered_list > numbered_list_item` |
| 6 | Task list | wrap in `task_list > task_item` |
| 7 | Quote | wrap in `quote` |
| 8 | Divider | replace with `divider` (and add an empty paragraph after) |
| 9 | Code block | replace with `code_block` (plain text language) |
| 10 | Callout | replace with `callout` containing the current paragraph |

**Filter:** when the user types after `/` (e.g. `/head`), the menu narrows to items whose label substring-matches case-insensitively. Empty filter shows all.

**Trigger:** `/` typed at the start of an empty paragraph (no text yet). Once active, the menu stays open until: Esc, click outside, selection moves out of the trigger paragraph, or insert.

## Out of scope (deferred)

- Inline-typing trigger anywhere in a paragraph (Notion's full behavior). Phase 2C v1 only triggers when the paragraph is empty.
- Plugin-level mouse hover preview — the menu is keyboard-first.
- Custom plugin animations / transitions.
- Hint chips ("Headings", "Lists" group labels). Items are flat in v1.

## Approach

### Plugin

`lib/edit-tasks/slash-menu-plugin.ts` exports a single `slashMenuPlugin: Plugin`. The plugin owns:

- **State:** `{ active: boolean; from: number; query: string }`. `from` is the position of the `/` character. Updated via `apply` whenever the doc changes.
- **Activation rule:** in `apply`, after each transaction, look at the parent paragraph of the cursor. If the paragraph's first character is `/` and the cursor is somewhere after it, set `active=true`, capture `from = paragraph.start + 1` (position right after the `/`), and `query = textContent.slice(1)`. Otherwise `active=false`.
- **Deactivation triggers:** selection moves to a different paragraph, the paragraph no longer starts with `/`, or the user dispatched the special "close" meta action.
- **Pure data layer.** No DOM access, no React.

### React popover

`components/edit-tasks/slash-menu.tsx` is a React component that reads the plugin's state through a custom hook (`useSlashMenuState(view)`) and renders an absolutely-positioned `<div>` near the cursor.

The hook subscribes to the EditorView's transaction stream (via a small adapter we add to `TaskEditor`) and re-renders on every state change. For positioning, it calls `view.coordsAtPos(state.from)` and translates to viewport-relative coordinates.

The popover uses the existing `DropdownMenu` building blocks where it makes sense, but the floating positioning is custom (anchored to cursor, not a trigger element). We use a simple `position: fixed` with the coords.

**Keyboard model:** the popover registers a global `keydown` listener on `window` while open. When active:
- `ArrowDown` / `ArrowUp` — move highlight (preventDefault).
- `Enter` — insert highlighted item (preventDefault).
- `Escape` — close (dispatches a meta transaction setting `active=false`).
- Other keys — pass through to the editor (which updates the query naturally as the user types).

**Insertion logic:** each item exports a function `(state, dispatch, from) => boolean` that:
1. Deletes the slash + query (range `from-1` to current selection.from).
2. Replaces the now-empty paragraph with the target block (or wraps it if the schema requires).

### TaskEditor wiring

`TaskEditor` mounts the plugin alongside the existing plugin set and renders `<SlashMenu view={viewRef.current} />` as a sibling of the contenteditable host. The view ref is exposed through a small additional ref method `getView()` so the popover can access `coordsAtPos` and `dispatch`.

## File map

**New:**

- `lib/edit-tasks/slash-menu-plugin.ts` — plugin with state + apply.
- `lib/edit-tasks/slash-menu-plugin.test.ts` — state-tracking unit tests.
- `lib/edit-tasks/slash-menu-items.ts` — the 10 items as `{ id, label, icon, insert(state, dispatch, from) }` objects. Pure data.
- `lib/edit-tasks/slash-menu-items.test.ts` — each item's `insert` produces the right doc.
- `components/edit-tasks/slash-menu.tsx` — React popover.
- `components/edit-tasks/__tests__/slash-menu.test.tsx` — render + arrow nav + insert tests with a mocked `view`.
- `components/edit-tasks/use-slash-menu-state.ts` — small hook bridging plugin state → React.

**Modified:**

- `components/edit-tasks/task-editor.tsx` — add the plugin, expose `getView()` on the ref, render `<SlashMenu>` next to the contenteditable host.

## Testing

The plugin and item tests are pure data — no DOM, no React. The popover test mounts the React component with a mocked view (provides `state`, `dispatch`, `coordsAtPos`) and asserts on rendered items + click handlers.

End-to-end keystroke testing is out of scope for unit tests (jsdom can't reliably simulate ProseMirror keystrokes). Manual smoke is the gate for "does this feel right".

## Implementation phases (for the planner)

1. `slashMenuPlugin` + tests (state tracking).
2. `slashMenuItems` + tests (each insert).
3. `useSlashMenuState` hook (small adapter — tested implicitly via the popover test).
4. `<SlashMenu />` component + tests.
5. Wire into `TaskEditor` (plugin + ref-API extension + render). Manual smoke noted.
6. Final gates.
