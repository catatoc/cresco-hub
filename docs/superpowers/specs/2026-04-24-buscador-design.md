# El Buscador — Global Command Palette (⌘K)

**Status:** Design approved, pending implementation plan
**Date:** 2026-04-24
**Owner:** Dani

## Summary

Build a global command palette for `notion-hub` activated from the existing sidebar **"Buscar"** item or `⌘K`. The palette lets the user search across Tasks, Meetings, Wiki, Projects and Team Members within the currently active Customer, and execute the "Nueva tarea" action. The shell, shadcn `cmdk` primitives, Notion queries and auth scope are already in place; this feature wires them together and adds a thin API layer.

## Goals

- One entry point (sidebar item + `⌘K`) that feels instant (< 200ms perceived).
- Navigate to any entity in < 3 keystrokes.
- Zero-typing value: when opened empty, the palette surfaces today's meeting, due tasks, the active sprint, and recently opened items.
- Create a task from a failed search ("nothing found → create it").
- Customer-scoped. No cross-workspace leakage.

## Non-Goals

- Full-text search inside page/meeting bodies. Only title/name matching (Notion `title contains` filter). A later phase may index content.
- Multi-customer search. User searches only their active customer. Switching happens outside the palette.
- Creating meetings, wiki pages, or any other entity from the palette. Only "Nueva tarea" is in scope for MVP.
- Persisting recents to Notion/Supabase. LocalStorage is the MVP store.

## UX Decisions

| # | Decision |
|---|---|
| 1 | **Shape:** command palette (Linear/Raycast-style) — navigation + actions in one modal. |
| 2 | **Entry:** only the existing sidebar "Buscar" item + global `⌘K`. No topbar bar. |
| 3 | **Empty state:** Sugerencias contextuales → Recientes → Acciones (in that order, each with a `CommandGroup` header). |
| 4 | **With query:** results grouped by type (`CommandGroup`) with type-filter pills above the list showing counts. |
| 5 | **Keyboard:** `⌘K` open · `Esc` close · `↑↓` navigate · `Enter` open · `⌘Enter` open in new tab · `Tab` / `Shift+Tab` cycle filter pills. Type-filter prefixes in the input: `#` tasks · `@` people · `!` wiki. (No `>` action prefix in MVP — only one action exists.) |
| 6 | **No-result state:** converts to a CTA "Crear '<query>' como nueva tarea". No dead ends. |

See mockups in `.superpowers/brainstorm/2035-1777052493/content/mockups-palette.html` (4 states: empty, with query, filter active, no results).

## Visual Design

- Follows existing design tokens in `app/globals.css`: primary `hsl(231 54% 60%)`, border `0.05 opacity`, radius scale, Inter.
- Dialog: `rounded-xl`, shadow `0 20px 60px #1e1e2226`, white on `#f7f7f8` backdrop.
- Match highlight: soft cream `#fff3b0` (not electric yellow).
- Status chips: 8px circle dot (in_progress blue, todo gray, done green, blocked orange) — already used in Kanban, reuse mapping.
- Emoji for entity type (aligns with existing task type glyphs 🗓️📖✅🏥🐛); lucide for UI chrome (Search, CornerDownLeft).
- Footer keyboard hints change per state: empty (4 hints), filter active (shows "Shift+Tab quitar filtro"), no results (shows "Enter crear tarea").

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Sidebar item "Buscar ⌘K"  → opens CommandDialog    │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  <SearchPalette />  (client)                        │
│   - useSearch(query, filter)  [debounced 180ms]     │
│   - useSearchSuggestions()    [when query === ""]   │
│   - useSearchRecents()        [localStorage]        │
│   - actions registry          [static]              │
└─────────────────────────────────────────────────────┘
                        │ GET /api/search?q=…&t=…
                        ▼
┌─────────────────────────────────────────────────────┐
│  /api/search  (Next Route Handler)                  │
│   1. getContext() → customerId, projectIds          │
│   2. Promise.allSettled over enabled entity types   │
│   3. rank(term, items)                              │
│   4. Return { groups: [...], tookMs }               │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
              lib/notion/{tasks,projects,meetings,wiki}.ts
                        │
                        ▼
              Notion SDK (dataSources.query)
```

## Components to Build

| Piece | New? | Path |
|---|---|---|
| `SearchProvider` (context + `⌘K` hotkey, exposes `open/close`) | new | `components/search/search-provider.tsx` |
| `<SearchPalette />` (the `CommandDialog` body) | new | `components/search/search-palette.tsx` |
| `<SearchGroup />` / `<SearchItem />` (thin wrappers over cmdk primitives with our visual conventions) | new | `components/search/` |
| `<SearchFilterPills />` (Tab-navigable pills) | new | `components/search/search-filter-pills.tsx` |
| `<SearchEmptyCreateCta />` (no-result CTA) | new | `components/search/search-empty-create-cta.tsx` |
| `useSearch(query, filter)` — TanStack Query | new | `hooks/use-search.ts` |
| `useSearchSuggestions()` — TanStack Query, 5 min stale | new | `hooks/use-search-suggestions.ts` |
| `useSearchRecents()` — `localStorage`, key `search:recents:{customerId}` | new | `hooks/use-search-recents.ts` |
| `useGlobalHotkey('mod+k')` | new | `hooks/use-global-hotkey.ts` |
| `GET /api/search` | new | `app/api/search/route.ts` |
| `GET /api/search/suggestions` | new | `app/api/search/suggestions/route.ts` |
| `parsePrefix(q)` — maps `#`,`@`,`!` → type | new | `lib/search/parse-prefix.ts` |
| `rank(term, items)` — scoring function | new | `lib/search/rank.ts` |
| `queryAll(customerId, term, types)` — orchestrates entity queries | new | `lib/search/query-all.ts` |
| `queryMembersByName` | new (small) | `lib/notion/members.ts` (extend) |
| `queryTasksByTitle` / `queryMeetingsByTitle` / `queryWikiByTitle` / `queryProjectsByTitle` | new (small) | extend existing `lib/notion/*.ts` with `title contains` variant |
| `ui/command.tsx` | **exists** | `components/ui/command.tsx` |
| Sidebar wiring | **exists** | `components/shell/sidebar.tsx` — attach handler to existing item |
| `getContext()` | **exists** | `lib/auth/context.ts` |

## Data Contracts

### `GET /api/search?q=<string>&t=<type>`

`t` ∈ `all | tasks | meetings | wiki | projects | people` (default `all`).

Response:

```ts
type SearchResponse = {
  query: string;
  filter: 'all' | 'tasks' | 'meetings' | 'wiki' | 'projects' | 'people';
  tookMs: number;
  groups: Array<{
    type: 'tasks' | 'meetings' | 'wiki' | 'projects' | 'people';
    count: number;          // total matches, even if list is truncated
    items: SearchItem[];    // capped to 8
  }>;
  partialFailures?: Array<{ type: string; reason: string }>;
};

type SearchItem = {
  id: string;              // Notion page id
  type: 'task' | 'meeting' | 'wiki' | 'project' | 'person';
  title: string;
  url: string;             // internal route, e.g. /tareas/<id>
  meta: {
    status?: 'todo' | 'in_progress' | 'done' | 'blocked' | 'cancelled' | 'archived';
    date?: string;         // ISO — dueDate | meeting date | lastEdited
    projectName?: string;
    priority?: 'P1' | 'P2' | 'P3';
    emoji?: string;
    avatarUrl?: string;    // people only
  };
  score: number;           // for client sorting if needed
};
```

### `GET /api/search/suggestions`

Cache `revalidate: 300`.

```ts
type SuggestionsResponse = {
  today?: { type: 'meeting'; id: string; title: string; time: string };
  dueToday?: { count: number; firstThree: SearchItem[] };
  activeSprint?: { id: string; name: string; daysLeft: number };
};
```

### LocalStorage recents

Key: `search:recents:{customerId}`. Max 8 items. Shape: `Array<{ id, type, title, url, openedAt }>` (no `meta` — lookup is cheap if the user clicks).

## Search Algorithm

1. Parse prefix on the server using `parsePrefix(q)` → `{ type, term }`.
2. Decide `effectiveType = parsed.type ?? queryParamType ?? 'all'`.
3. If `term.length < 2` and no suggestions requested → return empty groups fast (don't hit Notion).
4. Fan out with `Promise.allSettled`:
   - `tasks`: Notion filter `{ property: 'Customer', relation: { contains: customerId } }` AND `{ property: 'Name', title: { contains: term } }`, `page_size: 8`.
   - Same shape for `projects`, `meetings`, `wiki`.
   - `people`: `rich_text contains` over member name/email, customer-scoped.
5. `rank(term, items)`:
   - `exact (lowercased title == term)` → +100
   - `startsWith` → +50
   - `contains` → +20
   - fuzzy (single-char diff) → +5
   - recency boost: `meta.date` within 7 days → +10
   - frequency boost: id present in localStorage recents → +15 (hydrated client-side only; server returns base score)
6. Cap each group at 8 items server-side. Client can expand via filter pill.
7. Wrap Notion calls with `p-limit(3)` to stay under rate limits.

## Performance

| Concern | Strategy |
|---|---|
| Typing latency | Debounce 180ms client-side. |
| Query reuse | TanStack Query key `['search', customerId, q, filter]`, `staleTime: 30s`, `placeholderData: keepPreviousData`. |
| Suggestions refresh | Route handler `revalidate: 300` (5 min). |
| Cancellation | `AbortController` on every `fetch`. |
| Lazy mount | `<SearchPalette />` mounts only when `open === true`. Provider stays cheap. |
| Recents | LocalStorage read — zero network. |

## States

- **Loading:** 4 skeleton rows in a single `CommandGroup` labelled "Buscando…". No large spinner.
- **Partial failure:** render the successful groups + a subtle footer chip "Algunos resultados no cargaron · reintentar" that re-runs the query. Do not block the UI.
- **Empty query:** Sugerencias → Recientes → Acciones. If `customerId` is missing, show "Inicia sesión para buscar" with a link to `/login`.
- **No results (`query.length >= 2`):** friendly "🔎 Nada por acá" + primary CTA `Crear "<query>" como nueva tarea`. Enter on that CTA posts to an existing task-create endpoint (or opens a minimal form) — the exact create flow is specified in the implementation plan.
- **Offline / 5xx:** toast + render `useSearchRecents()` only.

## Accessibility

- `CommandDialog` already provides `role="dialog"`, focus trap and Esc-to-close via cmdk.
- Filter pills: `role="tablist"`, each pill `role="tab"` with `aria-selected`. `Tab` moves focus across pills and back to input.
- Each `CommandItem` uses `aria-label` combining title + type + meta so screen readers announce "Kickoff Mogos, reunión, hoy 10:30".
- Match highlight is visual-only; the aria-label uses the plain title.
- Respect `prefers-reduced-motion` for the dialog open transition.

## Instrumentation

- Server log per `/api/search` call: `{ customerId, qLen, filter, tookMs, counts, partialFailures }` — no `q` raw (PII-adjacent).
- Client event `search_no_results` when `query.length >= 3` and all groups empty — feeds future content/indexing decisions.
- Client event `search_recent_click` vs `search_result_click` vs `search_action_click` — measures where value actually comes from.

## Error Handling

- Notion SDK errors caught at `lib/search/query-all.ts`; each entity type fails in isolation (allSettled).
- Auth failure (no `customerId`) → 401 → client renders login prompt.
- Network failure in client → TanStack `error` state → render recents-only fallback.
- Malformed query (e.g. lone `#` with no term) → treat as empty, show full empty-state content (suggestions, recents, actions).

## Out-of-Scope for This Spec

- Server-side fuzzy/typo tolerance beyond the simple single-char rule above. If needed later, add a client-side `fuse.js` pass on the already-fetched items.
- Indexing page body content. Ticketed for a follow-up once usage data justifies it.
- Dark mode styling polish — tokens already handle it; if anything looks off, fix during implementation.
- Mobile behaviour — the palette should still open and be usable, but keyboard-heavy flows (Tab pills, ⌘Enter) are desktop-first.

## Open Questions

None — scope and UX are frozen. Implementation details (e.g. exact shape of the "Nueva tarea" quick-create call) will be resolved in the implementation plan.

## References

- Existing cmdk components: `components/ui/command.tsx`
- Auth context: `lib/auth/context.ts`
- Entity queries: `lib/notion/{tasks,projects,meetings,wiki,sprints}.ts`
- Design tokens: `app/globals.css:54-83`
- Mockups: `.superpowers/brainstorm/2035-1777052493/content/mockups-palette.html` (4 states)
