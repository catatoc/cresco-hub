# Open with Claude Code — Design Spec

**Date:** 2026-04-29
**Status:** Approved by user, ready for plan
**Owner:** Notion Hub

## Goal

Let users start a Claude Code session for any Notion task with one click from the Hub. The session opens with the task's title, status, priority, type, project, and description prefilled as the prompt, plus a link back to the Notion page. If the project has a `Repo URL` configured, that's included so Claude knows which repo to work in.

This mirrors the affordance Linear ships in their *Deeplink to AI Coding Tools* changelog (Feb 2026), adapted to Claude Code's actual mechanics (which has no `claude://` protocol handler — see *Approach* below).

## Out of scope

- Multi-tool support (Cursor, Codex, Zed, etc.). Only Claude Code in v1.
- Global keyboard shortcut from list views (e.g. Linear's `⌘⌥.`). Only an in-detail shortcut.
- A protocol-handler installer or "detect if Claude desktop is running." Pure web flow.
- Auth gating for users without a Claude account — `claude.ai/code` itself handles login.
- Auto-fix PR loops, teleport buttons, or any session-lifecycle UI inside the Hub.

## Approach

### The mechanism (resolved finding)

**Claude Code does not register a `claude://` URL scheme.** Linear's "Open with Claude Code" entry in their picker does not deep-link into a local CLI; it opens **Claude Code on the web** (`https://claude.ai/code`), which runs the session in an Anthropic-managed VM and clones the repo from GitHub. The user can later run `claude --teleport <session-id>` to pull the session into their terminal.

The Hub's button does exactly that:

1. **Opens** `https://claude.ai/code` in a new tab.
2. **Copies** a structured prompt to the clipboard at the same time.
3. Shows a toast: *"Sesión abierta en Claude Code · prompt copiado, pégalo si no se prellenó."*

If `claude.ai/code` is later updated to accept a `?prompt=` query parameter, the implementation can switch to passing the prompt directly and skip the clipboard. The plan should include a single helper function so this swap is one-line.

### Prompt template

```
Trabaja en esta tarea de Notion:

[Title]

Estado: [In Progress] · Prioridad: [High] · Tipo: [🐛 Bug]
Proyecto: [Project name]
Repo: [Repo URL or omitted]
Notion: [Task URL]

Descripción:
[Plain text extracted from the task's Notion blocks, first 2000 chars]
```

- The plain-text extractor walks the same `blocks` array the detail page already fetches (`lib/notion/blocks.ts`) and concatenates text from `paragraph`, `heading_1..3`, `bulleted_list_item`, `numbered_list_item`, `to_do`, `quote`, and `code` block types. Other block types (image, embed, divider) are skipped.
- 2000-char cap keeps the prompt copy-paste-friendly and avoids dumping unbounded content.

## Surfaces

The icon appears in three places. All three call the same `openWithClaudeCode(task, project)` helper.

### 1. List rows

A 14×14 `Terminal` icon (`lucide-react`, `SquareTerminal` glyph) sits at the right edge of the row, after the assignee stack. Constant visibility (always rendered, not hover-only).

Affected components:

- `components/home/my-tasks.tsx` — "Tus tareas" on the home page
- `app/(app)/tareas/page.tsx` and its row component(s) — the dedicated `/tareas` view
- `components/projects/project-tasks-module.tsx` — the tasks list inside a project's detail page

Tap target on mobile: 40×40 (icon centered in a wider hit box). On desktop the visual size is 22×22 with hover background `linear-gradient(135deg, #fef3ec, #ffe8db)` and `color: #c15f3c` (Anthropic orange).

### 2. Kanban cards

Same icon in the top-right corner of each `TaskCard`. Hidden by default; appears on hover (desktop) or always visible (mobile, since hover doesn't apply). The icon must `stopPropagation` and `preventDefault` so it doesn't compete with the drag-and-drop handlers in `useSortable`.

Affected component: `components/kanban/card.tsx`.

### 3. Task detail footer

Primary CTA: a `<button>` element (not an `<a>` — the click runs `window.open` + clipboard write programmatically, so the navigation isn't a plain href) labeled *"Abrir con Claude Code"*, styled with the Anthropic gradient (`linear-gradient(135deg, #c15f3c 0%, #d97a4f 100%)`, white text, subtle shadow). Sits to the right of the existing `Abrir en Notion` button in `components/kanban/task-detail.tsx`.

Footer responsive behavior: on screens ≥ 480px the two buttons sit side-by-side (current `flex items-center justify-between gap-3`). Below 480px the *"Esc para volver"* hint hides (already does) and the buttons may need `flex-wrap` so they stack vertically rather than truncating; the plan should verify this on a narrow viewport.

Keyboard shortcut: `⌘⇧.` (Mac) / `Ctrl+Shift+.` (Win/Linux). Hint shown in the footer: *"Esc para volver · `⌘⇧.` abrir con Claude"*. Listener registered in `TaskDetail` and removed on unmount. The `Esc` listener already lives in `TaskDetailHeader` — the new shortcut goes in `TaskDetail` (the parent) since it needs the task + project + blocks in scope.

## Components & files

### New

- `lib/claude-code/build-prompt.ts` — pure function `buildPrompt(task, project, plainTextDescription) → string`. Unit-tested.
- `lib/claude-code/extract-plain-text.ts` — pure function `extractPlainText(blocks, maxChars=2000) → string`. Unit-tested.
- `lib/claude-code/open-with-claude-code.ts` — client helper:
  ```ts
  export async function openWithClaudeCode(args: {
    task: Task;
    project: Project | null;
    plainTextDescription: string;
  }): Promise<void>
  ```
  Internally: builds prompt, opens `https://claude.ai/code` via `window.open` with `noopener,noreferrer`, calls `navigator.clipboard.writeText`, then fires a Sonner toast (the codebase already uses `sonner` per `CLAUDE.md`) — success: *"Sesión abierta en Claude Code · prompt copiado"*; clipboard-fail: *"Abrí Claude Code, pero no pude copiar el prompt"*; popup-blocked: *"Tu navegador bloqueó la pestaña"*. Centralizing the URL constant here makes the future `?prompt=` swap a one-line change. The helper imports `toast` from `sonner` directly so callers don't need to thread an `onToast` prop.
- `components/common/open-with-claude-button.tsx` — reusable button with three variants:
  - `variant="row"` — 14×14 icon in a 22×22 hit-box for list rows
  - `variant="card"` — 13×13 icon, absolute-positioned for kanban
  - `variant="cta"` — labeled button with gradient for the detail footer

### Modified

- `schemas/project.ts` — add `repoUrl: z.string().url().nullable()` to `projectSchema`.
- `lib/notion/projects.ts` — `parseProject` reads `p['Repo URL']?.url ?? null`. Property name in Notion: **`Repo URL`** (URL property type).
- `components/home/my-tasks.tsx` — render the row variant, pass project lookup map (need to thread `projectsById` from page).
- `app/(app)/tareas/page.tsx` and its task list — same as above.
- `components/projects/project-tasks-module.tsx` — render the row variant; project is already known.
- `components/kanban/card.tsx` — render the card variant in the upper-right.
- `components/kanban/task-detail.tsx` — replace the existing footer's `ml-auto` block with a flex container holding both buttons; add the keyboard listener; pass `blocks` so the helper can extract plain text.

### Notion side (manual, one-time per project)

- Add a **`Repo URL`** URL property to the Projects database in Notion.
- Fill it in for every project the user wants to use this feature with. If empty, the prompt simply omits the `Repo:` line and Claude will ask which repo to use.

## Data flow

```
User clicks icon
  → openWithClaudeCode(task, project, plainTextDescription)
    → buildPrompt(...)            // pure
    → window.open("claude.ai/code", "_blank", "noopener,noreferrer")
    → navigator.clipboard.writeText(prompt)
    → toast.success / toast.error (sonner)
```

For list rows, the plain-text description is **not** prefetched (would require fetching blocks for every task in the list — too expensive). Instead, the prompt for row clicks omits the description; the user gets title + metadata only. The detail view, which already has `blocks` loaded, is the only surface that includes the full description in the prompt.

This is an intentional tradeoff: rows are a quick "send to Claude" affordance; the detail is the rich one. We document this in a comment on `openWithClaudeCode`.

## Error handling

- **Clipboard write fails** (e.g. Safari without user gesture, permissions denied): toast says *"Abrí Claude Code, pero no pude copiar el prompt. Pégalo manualmente desde la consola."* and logs the prompt to `console.info` so the user can grab it from devtools as last resort.
- **`window.open` returns null** (popup blocked): toast says *"Tu navegador bloqueó la pestaña. Habilita popups para este sitio."* and the clipboard write still happens so the user can paste the prompt elsewhere.
- **Project has no Repo URL**: silent — line is omitted from prompt. No warning UI.

## Testing

- **Unit:** `buildPrompt` (with/without project, with/without repo URL, escapes correctly), `extractPlainText` (caps at 2000 chars, walks supported block types, handles empty arrays).
- **Component:** `OpenWithClaudeButton` renders all three variants, calls the helper on click, fires the toast.
- **Integration:** the row variant inside `MyTasks` doesn't propagate the click to the parent `<Link>` (no navigation to detail when clicking the icon). The card variant doesn't trigger drag-start.

## Visual reference

Mockup files persist in `.superpowers/brainstorm/8761-1777466857/content/` (`surfaces.html`, `final.html`).

## Manual setup (one-time)

In the Notion **Projects** database:

1. Add a new property of type **URL**, named exactly `Repo URL`.
2. For each project that should support "Open with Claude Code", paste the GitHub repo URL (e.g. `https://github.com/me/notion-hub`). Leave empty for projects without a repo — the button still works, the prompt just omits the `Repo:` line.

## Implementation order

1. Schema + Notion mapping (`projectSchema`, `parseProject`).
2. Pure helpers (`buildPrompt`, `extractPlainText`) with unit tests.
3. `openWithClaudeCode` client helper.
4. `OpenWithClaudeButton` component (3 variants).
5. Wire into list surfaces (`MyTasks`, `/tareas`, project tasks module).
6. Wire into kanban card.
7. Wire into task detail footer + keyboard shortcut.
8. Manual: add `Repo URL` property in Notion + fill in for one project to test end-to-end.

The plan should treat steps 1–4 as one phase (foundations, no UI risk), and 5–7 as the surface-by-surface rollout that can be reviewed independently.
