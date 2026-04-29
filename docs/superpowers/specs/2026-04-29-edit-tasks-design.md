# Edit Tasks From the Hub — Design Spec

**Date:** 2026-04-29
**Status:** Ready for plan
**Owner:** Notion Hub
**Branch:** `feat/edit-tasks`

## Goal

Let users edit the body of a Notion task directly from the hub's task detail page. The editor is block-based, feels close to Notion's own editor, and is built on ProseMirror primitives (no TipTap/BlockNote/Plate). Saves are explicit via a "Guardar" button that pushes the new blocks to Notion.

The audience is developers, so the editor's first-class block types include code blocks with language selection and Mermaid diagrams. Inline `code` and a task-list checkbox block are both supported because they're routine in dev work.

## Out of scope

- WYSIWYG image upload, file attachments, embeds.
- Drag-handle reordering of blocks (v1 ships with keyboard reordering only — `Alt+↑/↓` move-block).
- Conflict detection or three-way merge — last-write-wins silently. (Acknowledged trade-off.)
- Editing properties (status, priority, assignees, due date) from the editor; those already have their own controls in the meta panel.
- Toggle blocks, columns, embeds, synced blocks. Read-only fallback if a task contains them — they render but cannot be edited or removed in the hub.
- Mentions, comments, page-link blocks.
- Real-time collaboration / multi-cursor.
- Mobile editing. The editor renders read-only on `< sm` screens (the existing `BlocksRenderer`) — editing is desktop-only in v1.
- Auto-save. Save is explicit (button + `⌘S`).

## Approach

### Editor stack

Direct ProseMirror, no wrapper framework:

- `prosemirror-model` — schema definition
- `prosemirror-state` — editor state + transactions
- `prosemirror-view` — DOM rendering of contenteditable
- `prosemirror-commands` — built-in commands (toggleMark, splitBlock, etc.)
- `prosemirror-keymap` — keyboard shortcut bindings
- `prosemirror-history` — undo/redo
- `prosemirror-inputrules` — markdown-style typing shortcuts (`# `, `- `, `> `, etc.)
- `prosemirror-schema-list` — list helpers (wrapInList, splitListItem)
- `prosemirror-dropcursor` and `prosemirror-gapcursor` — cursor UX

Total bundle: ~40-50 KB gzipped.

### Schema (ProseMirror nodes and marks)

**Nodes (block-level):**

- `doc` — root
- `paragraph` — default text container
- `heading` — with `attrs: { level: 1 | 2 | 3 }`
- `bulleted_list` + `bulleted_list_item` — wrapper + item
- `numbered_list` + `numbered_list_item` — wrapper + item
- `task_list` + `task_item` — `task_item` has `attrs: { checked: boolean }`
- `quote` — wrapper for paragraph children
- `divider` — atomic, no content
- `callout` — `attrs: { emoji: string }` ; content is a single paragraph
- `code_block` — `attrs: { language: string }` ; text-only content; rendered with syntax highlighting

**Marks (inline):**

- `bold`, `italic`, `strikethrough`, `code` (inline code), `link` (with `attrs: { href: string }`)

**Read-only sentinel node** — `unsupported_block` with `attrs: { kind: string, raw: object }`. The serializer-in produces this when it encounters a Notion block type the schema doesn't model (toggle, column, embed, synced block, etc.). The editor renders it grayed-out with a label *"Bloque no editable desde el hub: <kind>"* and the schema marks it `atom: true` so the user can delete it whole or move past it but can't edit its content.

**Round-trip limitation:** the stored `raw` payload is the read-shape Notion API response (with `id`, `created_time`, `parent`, `archived`, `has_children`, and read-only `rich_text` shapes). Notion's `blocks.children.append` endpoint rejects these server-only fields, so a save that contains `unsupported_block` nodes will fail at the append stage. Phase 1 deliberately does NOT implement the read→write transform — it's deferred to a later iteration. Until then, users editing tasks with toggles/columns/embeds should expect a `503 append-failed` response. The existing-children delete already ran, so they would lose their body. The recommended UX in Phase 2 is to BLOCK saves on docs that contain `unsupported_block` nodes (with a clear error toast), not silently corrupt them.

### Serializers

Two pure functions in `lib/edit-tasks/`:

```ts
notionBlocksToProseMirror(blocks: NotionBlock[]): ProseMirrorDocJSON
proseMirrorToNotionBlocks(doc: ProseMirrorDocJSON): NotionBlockInput[]
```

Both are exhaustively unit-tested. They handle:

- Round-trip for every supported node + mark type.
- Round-trip preservation of inline annotations (multiple marks on the same span).
- Pass-through of `unsupported_block` nodes back to their original `raw` shape so they survive a save.

### Save flow

1. User clicks "Guardar" (or `⌘S` / `Ctrl+S`).
2. The editor serializes its doc to Notion blocks via `proseMirrorToNotionBlocks`.
3. Client `POST`s to `PATCH /api/tasks/[id]/blocks` with the new blocks array.
4. Server (`lib/notion/tasks.ts:replaceTaskBlocks`):
   - Lists existing children of the task page.
   - Deletes them in reverse order via `notion.blocks.delete`.
   - Appends the new blocks via `notion.blocks.children.append`.
5. Server returns `{ ok: true, lastEditedTime }`.
6. Client shows a Sonner success toast and resets the editor's pristine flag.

The whole replace is two phases (delete + append) without a transaction — Notion's API doesn't expose one. If delete-half succeeds but append fails, the task body is empty and the client shows a recovery toast: *"No se pudo guardar. Tu contenido está copiado al portapapeles."* (the prompt content is dumped to clipboard at the start of the request as a safety net).

### Read/edit toggle

The detail page renders read-only by default (current behaviour, `BlocksRenderer`). A pencil button next to the task title flips into edit mode, swapping `BlocksRenderer` for `<TaskEditor blocks={blocks} taskId={taskId} />`. Inside the editor, the title bar gains the "Guardar" button + a "Cancelar" button that returns to read-only without prompting (any unsaved local edits are lost). `beforeunload` warns when leaving the page with unsaved changes.

The editor is desktop-only. On `< sm` screens the pencil button is hidden (read-only is enforced — the user is told *"Edita desde un escritorio o desde Notion"* via tooltip).

### Permissions

Same auth model as `/api/tasks/[id]/status`:

```ts
requireContext()                                   // valid auth
&& task.customerId === ctx.customerId              // task belongs to the user's customer
```

No additional role check. Anyone with hub access can edit any task in their customer.

### Inputrules (markdown shortcuts)

| Typed | Becomes |
|---|---|
| `# ` | heading 1 |
| `## ` | heading 2 |
| `### ` | heading 3 |
| `- ` or `* ` | bulleted list item |
| `1. ` | numbered list item |
| `- [ ] ` | task item (unchecked) |
| `> ` | quote |
| ` ``` ` | code block (no language) |
| ` ```js ` (or any language) | code block with that language |
| `---` (on empty line, then enter) | divider |
| `**text**` or `__text__` | bold |
| `*text*` or `_text_` | italic |
| `~~text~~` | strikethrough |
| `` `text` `` | inline code |
| `[label](url)` | link mark on `label` with `href=url` |

### Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘B` / `Ctrl+B` | toggle bold |
| `⌘I` / `Ctrl+I` | toggle italic |
| `⌘E` / `Ctrl+E` | toggle inline code |
| `⌘K` / `Ctrl+K` | open link prompt for current selection |
| `⌘Z` / `Ctrl+Z` | undo |
| `⌘⇧Z` / `Ctrl+Shift+Z` | redo |
| `⌘S` / `Ctrl+S` | save (intercepts browser default) |
| `Tab` | indent list item / inside code block: insert two spaces |
| `Shift+Tab` | outdent list item |
| `Enter` | break to next block (same type for lists; new paragraph after heading/quote) |
| `Backspace` at block start | merge with previous block / unwrap list item |
| `Alt+↑` / `Alt+↓` | move current block up / down |

### Slash menu

Triggered when the user types `/` at the start of an empty paragraph. A popover lists block insertion options filtered by the text after the `/`. Items: Heading 1/2/3, Bullet list, Numbered list, Task list, Quote, Divider, Code block, Callout. Arrow keys navigate, Enter inserts. Escape closes. The menu closes if the user types a space without matching anything.

The menu is a separate React component overlaying the editor; it reads its anchor position from a ProseMirror plugin that emits a decoration when the cursor sits at a slash trigger.

### Inline formatting toolbar

Floating popover that appears when the user has a non-empty selection inside text. Shows: B / I / S / `<>` (inline code) / 🔗 (link). Click toggles the corresponding mark via `prosemirror-commands.toggleMark`. The toolbar is itself a React component positioned via the selection's bounding rect.

### Code block UX

- Editable `<pre><code>` with `text-only` content allowed.
- A small language picker pill in the top-right corner of the block (popover with the languages listed earlier; "plain text" default). Clicking it changes the `language` attribute via a transaction.
- Mermaid is just `language: "mermaid"`. When the language is mermaid, the block gains a "Preview" link that opens a side preview using the existing `Mermaid` component from `components/wiki/mermaid.tsx`. Source-only by default.
- No syntax highlighting *inside the editor*. Read-only rendering uses the existing `BlocksRenderer` which can apply Prism / highlight.js later — but that's out of scope for this spec.

### Callout UX

- Container block with an emoji on the left. The emoji is clickable and opens a small popover with: 💡 ⚠️ 🚨 ✅ 📝 📌 🔥 ❤️ ⭐ 🚀 (10 hard-coded options). Clicking an emoji updates the `emoji` attribute.
- Content is a single paragraph (no nested lists / headings inside callouts in v1).

## Components & files

### New files

- `lib/edit-tasks/schema.ts` — ProseMirror schema definition.
- `lib/edit-tasks/serialize-from-notion.ts` — `notionBlocksToProseMirror`.
- `lib/edit-tasks/serialize-from-notion.test.ts` — exhaustive round-trip and unsupported-block tests.
- `lib/edit-tasks/serialize-to-notion.ts` — `proseMirrorToNotionBlocks`.
- `lib/edit-tasks/serialize-to-notion.test.ts` — exhaustive tests including mark combinations.
- `lib/edit-tasks/inputrules.ts` — markdown-style input rules.
- `lib/edit-tasks/keymap.ts` — keyboard shortcuts.
- `lib/edit-tasks/slash-menu-plugin.ts` — ProseMirror plugin that detects `/` triggers and emits decorations.
- `lib/notion/tasks-blocks.ts` — `replaceTaskBlocks(taskId, newBlocks)` server-side helper. Deletes children, appends new ones.
- `lib/notion/tasks-blocks.test.ts` — unit test with a mocked Notion client covering happy path and partial-failure path.
- `app/api/tasks/[id]/blocks/route.ts` — `PATCH` handler. Auth + customer scope + body parse + delegate to `replaceTaskBlocks`.
- `app/api/tasks/[id]/blocks/__tests__/route.test.ts` — handler tests (auth, scope, body validation, success).
- `components/edit-tasks/task-editor.tsx` — main React component. Mounts ProseMirror in a `<div>`, owns `EditorView`, exposes a ref-API for the parent (get-doc, has-changes).
- `components/edit-tasks/task-editor-toolbar.tsx` — header bar inside edit mode (shows "Editando", Guardar / Cancelar buttons, save state).
- `components/edit-tasks/slash-menu.tsx` — popover UI for the slash menu.
- `components/edit-tasks/inline-toolbar.tsx` — popover UI for the formatting toolbar.
- `components/edit-tasks/callout-emoji-picker.tsx` — popover with 10 fixed emojis.
- `components/edit-tasks/code-language-picker.tsx` — popover with 12 languages including mermaid.
- `components/edit-tasks/__tests__/task-editor.test.tsx` — integration tests of the full editor (mount, type, format, save).

### Modified files

- `components/kanban/task-detail.tsx` — adds a pencil button next to the title (desktop only). When in edit mode, swaps `BlocksRenderer` for `TaskEditor`. Wires `beforeunload` while editing.
- `package.json` — add ProseMirror deps.

## Data flow

```
[Read mode]
  task-detail.tsx
    └─ BlocksRenderer (read-only) ← blocks fetched server-side

User clicks ✏️
  ↓
[Edit mode]
  task-detail.tsx
    └─ TaskEditor
         ├─ EditorView (ProseMirror)
         │    ├─ inputrules plugin
         │    ├─ keymap plugin
         │    ├─ slash-menu plugin → emits decoration → SlashMenu component
         │    ├─ history plugin
         │    └─ schema (custom)
         └─ Toolbar (Guardar | Cancelar)

User clicks Guardar (or ⌘S)
  ↓
proseMirrorToNotionBlocks(doc) → NotionBlockInput[]
  ↓
PATCH /api/tasks/[id]/blocks { blocks: [...] }
  ↓
[Server]
  authz → replaceTaskBlocks(taskId, newBlocks):
    1. notion.blocks.children.list(taskId)
    2. for each child (reverse): notion.blocks.delete(child.id)
    3. notion.blocks.children.append(taskId, newBlocks)
    4. notion.pages.retrieve(taskId) → return last_edited_time
  ↓
{ ok: true, lastEditedTime }
  ↓
[Client]
  toast.success("Guardado") · reset pristine flag · stay in edit mode
```

## Error handling

- **Body validation fails** → `400` with Zod error details. Client shows toast *"Cambios inválidos"* and stays in edit mode.
- **Auth fail** → `401`/`403` per existing pattern. Client redirects to login or shows access toast.
- **Notion delete fails mid-replace** → server returns `500` with `{ stage: 'delete', remaining: N }`. Client shows recovery toast: *"Se borraron N bloques pero no se pudieron escribir los nuevos. El contenido está copiado al portapapeles."* and writes the markdown serialization of the prosemirror doc to the clipboard.
- **Notion append fails after successful delete** → same recovery toast. Same clipboard copy.
- **Network failure on the client** → toast *"Sin conexión. Reintenta."* — editor stays open with the local doc intact.
- **Notion rate limit (429)** → server retries once with 1s backoff. If still failing, returns `503` and client toast says *"Notion está saturado. Reintenta en un momento."*

## Testing

- **Unit:** schema validity, serializers in both directions (with mark combinations, nested lists, unsupported blocks), inputrules trigger correctly, keymap shortcuts dispatch the right commands.
- **Component:** `TaskEditor` mounts and unmounts cleanly; toolbar opens / closes with selection; slash menu filters and inserts. RTL `userEvent.type()` drives the editor.
- **API:** PATCH route auth path, scope check, body validation, success path with mocked Notion client, failure paths.
- **Integration smoke:** in dev, edit a real Notion task; confirm round-trip preserves all supported blocks; confirm an `unsupported_block` (e.g. a Notion toggle) survives a save unchanged.

## Known limitations to communicate to users

A small banner at the top of edit mode (collapsible):

> *Algunos bloques de Notion (toggles, columnas, embeds, syncs) no se pueden editar desde el hub. Aparecen en gris. **Por ahora no se pueden guardar tareas que contengan estos bloques** — abre la tarea en Notion para editarla. Próximamente soportaremos guardarlas sin tocarlos.*

Banner shows only when the loaded doc contains at least one `unsupported_block`.

## Implementation phases

The plan should split into two phases:

**Phase 1 — Headless foundation (no UI):**
1. Install ProseMirror deps.
2. Schema definition + tests.
3. Serializers (both directions) + exhaustive tests.
4. Server-side `replaceTaskBlocks` + tests.
5. PATCH route + tests.

**Phase 2 — UI:**
6. `TaskEditor` mounted with the schema, no plugins yet beyond history. Confirm typing and save round-trips work.
7. Inputrules + keymap.
8. Slash menu plugin + UI.
9. Inline toolbar.
10. Callout emoji picker + code language picker.
11. Edit/read toggle in `task-detail.tsx` + Guardar/Cancelar + `beforeunload` + `⌘S`.
12. Banner for unsupported blocks.
13. Mobile gating (read-only `< sm`).
14. End-to-end manual smoke + adjust.

## Open questions for the planner (none blocking)

- Should `BlocksRenderer` be reused for read-only rendering of `unsupported_block` content inside the editor, or should the editor render its own grayed-out placeholder? (Recommendation: placeholder only — keep the editor's render path independent.)
- Whether to ship Prism syntax highlighting for code blocks in v1 or defer. (Recommendation: defer — the editor doesn't need highlighting; the read-only `BlocksRenderer` can adopt it later.)
