# Edit Tasks Phase 2B — Inputrules & Extended Keymap

**Date:** 2026-04-29
**Status:** Ready for plan
**Branch:** `feat/edit-tasks-ui-phase-2b`
**Parent spec:** `docs/superpowers/specs/2026-04-29-edit-tasks-design.md`

## Goal

Make the editor ergonomic for keyboard users by adding markdown-style input rules and key shortcuts. After 2B ships, you can type `# ` to make a heading, `**bold**` to bold, `⌘B` to toggle bold on a selection, `Tab` to indent a list item, and `Alt+↑/↓` to move a block.

## Scope

**Inputrules (typing → transform):**

| Typed | Becomes |
|---|---|
| `# ` (start of paragraph) | heading 1 |
| `## ` | heading 2 |
| `### ` | heading 3 |
| `- ` or `* ` | bulleted list item |
| `1. ` | numbered list item |
| `- [ ] ` | task item (unchecked) |
| `> ` | quote |
| ` ``` ` | code block (plain text language) |
| `**text**` | bold |
| `*text*` | italic |
| `~~text~~` | strikethrough |
| `` `text` `` | inline code |

**Keymap:**

| Key | Action |
|---|---|
| `⌘B` / `Ctrl+B` | toggle bold |
| `⌘I` / `Ctrl+I` | toggle italic |
| `⌘E` / `Ctrl+E` | toggle inline code |
| `Tab` (inside a list item) | sink to nested list item |
| `Shift+Tab` (inside a list item) | lift list item |
| `Alt+↑` | move current block up |
| `Alt+↓` | move current block down |

## Out of scope (deferred)

- `[label](url)` link inputrule — requires URL validation; ships in Phase 2D with the link UI.
- `⌘K` link prompt — same reason.
- `---` divider inputrule — minor; skip until requested.
- ` ```js ` (code block with language) inputrule — Phase 2D adds the language picker UI; wait until then.

## Approach

### Inputrules

Use `prosemirror-inputrules`'s `wrappingInputRule`, `textblockTypeInputRule`, and a custom `markInputRule` helper for marks. The schema's existing `bulleted_list`, `numbered_list`, `task_list`, `heading`, `quote`, `code_block` types support these helpers directly.

The `markInputRule` for `**bold**` etc. is a known ProseMirror recipe: regex matches the closing delimiter, transaction replaces the matched range with text + mark. We implement it once and parametrize over the regex + mark name.

### Keymap

For mark toggles (⌘B/I/E), use `prosemirror-commands`'s `toggleMark`. For Tab/Shift+Tab inside lists, use `prosemirror-schema-list`'s `sinkListItem` / `liftListItem` against the three list-item node types. For block move (Alt+↑/↓), implement a small custom command that finds the parent block, deletes it, and re-inserts at the adjacent slot.

### Wiring

Both plugins are exported as functions that accept the schema (already imported indirectly) and return a Plugin. Update `components/edit-tasks/task-editor.tsx` to include them in the plugin array — replacing the single `keymap(baseKeymap)` with `[inputRules({rules: ...}), keymap(extendedKeymap), keymap(baseKeymap)]`.

Order matters: extended keymap first (so its bindings override baseKeymap), then baseKeymap as fallback for Enter/Backspace/etc.

## File map

**New:**

- `lib/edit-tasks/inputrules.ts` — exports `editTasksInputRules: readonly InputRule[]`.
- `lib/edit-tasks/inputrules.test.ts` — unit tests for each rule's regex + transform.
- `lib/edit-tasks/keymap.ts` — exports `editTasksKeymap: { [key: string]: Command }`.
- `lib/edit-tasks/keymap.test.ts` — unit tests for each command.
- `lib/edit-tasks/move-block.ts` — small helper for `moveBlockUp`/`moveBlockDown` commands. Pure command-style functions returning a transaction-applying boolean.
- `lib/edit-tasks/move-block.test.ts` — covers up/down at edges (no-op if first/last block).

**Modified:**

- `package.json` — add `prosemirror-inputrules`.
- `components/edit-tasks/task-editor.tsx` — wire `inputRules` and `editTasksKeymap` into the plugin array.

## Testing

ProseMirror inputrules and commands work entirely on the data layer — no DOM needed. Unit tests build an `EditorState`, dispatch a synthetic transaction (or simulate the matched-text range), and assert the resulting state's doc shape. Helper:

```ts
function applyInputRule(rule: InputRule, state: EditorState, text: string, from: number) {
  const to = from + text.length;
  const tr = rule.handler(state, /* match */ ...regex_match, from, to);
  return tr ? state.apply(tr) : null;
}
```

The actual `prosemirror-inputrules` library exposes `inputRules({ rules })` which auto-handles trigger detection. We test the rules' produced transforms rather than the trigger detection (which is library-tested).

For commands, the pattern is:

```ts
function runCmd(cmd: Command, state: EditorState): EditorState {
  let updated: EditorState | null = null;
  cmd(state, (tr) => { updated = state.apply(tr); });
  return updated ?? state;
}
```

## Implementation phases (for the planner)

1. Install `prosemirror-inputrules`.
2. `move-block.ts` + tests (smallest, isolated).
3. `inputrules.ts` + tests (each rule = one or two test cases).
4. `keymap.ts` + tests.
5. Wire into `TaskEditor`.
6. Final gates (typecheck + suite + build) + manual smoke note.

The wiring step is the riskiest — it means existing TaskEditor tests still need to pass with the expanded plugin set. Confirm `task-editor.test.tsx` stays green after Step 5.
