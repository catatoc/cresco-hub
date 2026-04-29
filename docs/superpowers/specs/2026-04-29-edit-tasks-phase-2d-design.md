# Edit Tasks Phase 2D — Inline Toolbar & Link

**Date:** 2026-04-29
**Status:** Ready for plan
**Branch:** `feat/edit-tasks-ui-phase-2d`
**Parent spec:** `docs/superpowers/specs/2026-04-29-edit-tasks-design.md`

## Goal

Floating inline toolbar when text is selected (Bold / Italic / Strike / Inline code / Link), plus `⌘K` to open a prompt for adding a link to the selection. After 2D, the editor's text-styling story is complete.

## Out of scope (deferred to a future small Phase 2E)

- Callout emoji picker — lives in a future cycle. v1 uses the default 💡.
- Code block language picker — lives in a future cycle. v1 uses `plain text`.
- Mermaid side preview — read-mode `BlocksRenderer` already renders mermaid; no editor preview needed yet.

## Approach

### Inline toolbar

A React popover that appears when the editor's selection is non-empty AND not collapsed inside a code block. Anchors to `view.coordsAtPos(state.selection.from)` minus a small offset. Re-reads selection state via the existing `tick` bumper from Phase 2C.

Five buttons:

| Button | Command |
|---|---|
| **B** | toggleMark(bold) |
| *I* | toggleMark(italic) |
| ~~S~~ | toggleMark(strikethrough) |
| `<>` | toggleMark(code) |
| 🔗 | open link prompt |

Active marks are visually indicated (filled background). Clicking re-toggles.

### Link prompt

A small inline `<input>` overlay that opens via the toolbar's link button OR the `⌘K` keyboard shortcut. The user types or pastes a URL, presses Enter to apply, Esc to cancel. The link mark gets added to the current selection. If the current selection already has a link mark, the input pre-fills with the existing URL.

For URL validation: accept any non-empty string; if it doesn't start with `http://`, `https://`, or `mailto:`, prepend `https://`. (Same lenient policy as most editors.)

### Wiring into TaskEditor

Both components live in `components/edit-tasks/inline-toolbar.tsx` and `components/edit-tasks/link-prompt.tsx`. They're rendered as siblings of the contenteditable host (alongside `<SlashMenu>`). Both subscribe to the `view + tick` pair from the existing TaskEditor handle.

Add a `Mod-k` binding to the existing `editTasksKeymap` that opens the link prompt. The prompt's open state lives in TaskEditor (so it can be triggered via keymap and via toolbar click).

## File map

**New:**

- `components/edit-tasks/inline-toolbar.tsx` — floating mark toolbar.
- `components/edit-tasks/__tests__/inline-toolbar.test.tsx` — render + click tests with mocked view.
- `components/edit-tasks/link-prompt.tsx` — URL input overlay.
- `components/edit-tasks/__tests__/link-prompt.test.tsx` — submit/cancel/prefill tests.
- `lib/edit-tasks/normalize-url.ts` — `normalizeUrl(input: string): string` — pure helper.
- `lib/edit-tasks/normalize-url.test.ts` — covers the prefix policy.

**Modified:**

- `components/edit-tasks/task-editor.tsx` — render the two new components, add link-prompt-open state, wire up `Mod-k`.
- `lib/edit-tasks/keymap.ts` — add `Mod-k: openLinkPrompt` (the actual command will be a no-op at the keymap level; the keymap fires a custom event the TaskEditor listens for, OR the keymap is augmented at the TaskEditor level via a closure).

For simplicity: TaskEditor will register a separate `keymap({'Mod-k': () => { setLinkPromptOpen(true); return true; }})` plugin INSIDE its `useEffect`, instead of putting it in the static `editTasksKeymap`. This keeps `editTasksKeymap` pure and `lib/edit-tasks/keymap.ts` un-modified.

## Implementation phases (for the planner)

1. `normalizeUrl` helper + tests.
2. `<LinkPrompt>` component + tests.
3. `<InlineToolbar>` component + tests.
4. Wire both into `TaskEditor`. Add `Mod-k` keymap binding inside the EditorView setup.
5. Final gates.
