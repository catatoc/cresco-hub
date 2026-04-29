# Edit Tasks Phase 2B — Inputrules & Extended Keymap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add markdown-style inputrules and key shortcuts to the Phase 2A editor so typing `# `, `**bold**`, etc. transforms automatically and `⌘B`, `Tab`, `Alt+↑/↓` work as expected.

**Architecture:** Two pure helper modules — `lib/edit-tasks/inputrules.ts` exports an array of `InputRule`s, `lib/edit-tasks/keymap.ts` exports a key→command map. Both are wired into `TaskEditor`'s plugin array alongside the existing `baseKeymap`. A small `move-block.ts` helper holds the `Alt+↑/↓` block-mover commands.

**Tech Stack:** `prosemirror-inputrules` (new dep), `prosemirror-commands` (already), `prosemirror-schema-list` (already, for list ops), Vitest.

---

## Spec reference

`docs/superpowers/specs/2026-04-29-edit-tasks-phase-2b-design.md`.

## File map

**New:**

- `lib/edit-tasks/move-block.ts` — `moveBlockUp` / `moveBlockDown` commands.
- `lib/edit-tasks/move-block.test.ts` — covers happy + edge cases.
- `lib/edit-tasks/inputrules.ts` — markdown rules: 4 block, 1 quote-wrap, 1 code-block, 3 list, 4 marks.
- `lib/edit-tasks/inputrules.test.ts` — for each rule, build a state + apply the rule + assert resulting doc.
- `lib/edit-tasks/keymap.ts` — extended keymap.
- `lib/edit-tasks/keymap.test.ts` — covers each command.

**Modified:**

- `package.json` — add `prosemirror-inputrules`.
- `components/edit-tasks/task-editor.tsx` — extend the plugin array.

## Conventions

- Test runner: `npm run test -- <path> --run`.
- Type check: `npm run typecheck`.
- Branch: `feat/edit-tasks-ui-phase-2b`.
- All test helpers (`runCmd`, `applyInputRule`) live inside the test files since they're tiny.

---

## Task 1: Install `prosemirror-inputrules`

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Install**

```bash
npm install prosemirror-inputrules
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` → PASS.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(deps): add prosemirror-inputrules for edit-tasks Phase 2B"
```

---

## Task 2: `move-block` helpers (TDD)

**Files:**
- Create: `lib/edit-tasks/move-block.ts`
- Create: `lib/edit-tasks/move-block.test.ts`

These are PM commands that move the current top-level block up/down by one position. Edge cases: no-op when at the first/last block.

- [ ] **Step 1: Write the failing test**

```ts
// lib/edit-tasks/move-block.test.ts
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { Node } from 'prosemirror-model';
import { editTasksSchema } from './schema';
import { moveBlockUp, moveBlockDown } from './move-block';

function buildState(...paragraphs: string[]): EditorState {
  const doc = editTasksSchema.node(
    'doc',
    null,
    paragraphs.map((p) =>
      editTasksSchema.node('paragraph', null, p ? [editTasksSchema.text(p)] : []),
    ),
  );
  return EditorState.create({ doc });
}

function selectBlock(state: EditorState, blockIndex: number): EditorState {
  let pos = 1;
  for (let i = 0; i < blockIndex; i++) pos += state.doc.child(i).nodeSize;
  // place selection at start of the block
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, pos)));
}

function runCmd(cmd: Command, state: EditorState): EditorState {
  let updated: EditorState | null = null;
  cmd(state, (tr) => {
    updated = state.apply(tr);
  });
  return updated ?? state;
}

function texts(state: EditorState): string[] {
  const out: string[] = [];
  state.doc.forEach((c) => out.push(c.textContent));
  return out;
}

describe('moveBlockUp', () => {
  it('swaps current block with previous one', () => {
    const initial = selectBlock(buildState('A', 'B', 'C'), 1); // select B
    const next = runCmd(moveBlockUp, initial);
    expect(texts(next)).toEqual(['B', 'A', 'C']);
  });

  it('is a no-op when at the first block', () => {
    const initial = selectBlock(buildState('A', 'B'), 0); // select A
    let dispatched = false;
    moveBlockUp(initial, () => {
      dispatched = true;
    });
    expect(dispatched).toBe(false);
  });
});

describe('moveBlockDown', () => {
  it('swaps current block with next one', () => {
    const initial = selectBlock(buildState('A', 'B', 'C'), 1); // select B
    const next = runCmd(moveBlockDown, initial);
    expect(texts(next)).toEqual(['A', 'C', 'B']);
  });

  it('is a no-op when at the last block', () => {
    const initial = selectBlock(buildState('A', 'B'), 1); // select B (last)
    let dispatched = false;
    moveBlockDown(initial, () => {
      dispatched = true;
    });
    expect(dispatched).toBe(false);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/move-block.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/edit-tasks/move-block.ts
import type { Command } from 'prosemirror-state';
import { Node } from 'prosemirror-model';

function moveBlock(direction: -1 | 1): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    // Only act on top-level block selections. depth==1 means we're at a top-level block.
    // Walk up to depth 1 to find the index in doc.
    if ($from.depth < 1) return false;
    const docDepth = 0;
    const indexAtDoc = $from.index(docDepth);
    const totalBlocks = state.doc.childCount;
    const target = indexAtDoc + direction;
    if (target < 0 || target >= totalBlocks) return false;

    if (!dispatch) return true;

    const tr = state.tr;
    const blockA = state.doc.child(indexAtDoc);
    const blockB = state.doc.child(target);
    // Compute positions of both blocks in the doc
    let posA = 0;
    for (let i = 0; i < indexAtDoc; i++) posA += state.doc.child(i).nodeSize;
    let posB = 0;
    for (let i = 0; i < target; i++) posB += state.doc.child(i).nodeSize;

    // Replace the larger position first to keep coordinates stable
    if (direction === -1) {
      // Moving up: indexAtDoc > target. Replace at indexAtDoc, then at target.
      tr.replaceWith(posA, posA + blockA.nodeSize, blockB);
      tr.replaceWith(posB, posB + blockB.nodeSize, blockA);
    } else {
      // Moving down: indexAtDoc < target. Replace at target first.
      tr.replaceWith(posB, posB + blockB.nodeSize, blockA);
      tr.replaceWith(posA, posA + blockA.nodeSize, blockB);
    }
    dispatch(tr);
    return true;
  };
}

export const moveBlockUp: Command = moveBlock(-1);
export const moveBlockDown: Command = moveBlock(1);
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/move-block.test.ts --run`
Expected: PASS — 4/4 tests green.

If a test fails because the swap math is off (e.g. positions shift after the first replace), look at the test failure carefully and adjust. The "replace larger position first" pattern is the standard fix.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/move-block.ts lib/edit-tasks/move-block.test.ts
git commit -m "feat(edit-tasks): add moveBlockUp/moveBlockDown commands"
```

---

## Task 3: `inputrules` (TDD)

**Files:**
- Create: `lib/edit-tasks/inputrules.ts`
- Create: `lib/edit-tasks/inputrules.test.ts`

The rules array. Block-type rules use `textblockTypeInputRule` (heading, code), wrap rules use `wrappingInputRule` (quote, lists). Mark rules use a custom `markInputRule` helper.

- [ ] **Step 1: Write the failing test**

```ts
// lib/edit-tasks/inputrules.test.ts
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import type { InputRule } from 'prosemirror-inputrules';
import { editTasksSchema } from './schema';
import { editTasksInputRules } from './inputrules';

// Build a state containing one paragraph with the given typed text already in it.
// Selection sits at end. We then synthetically invoke each input rule with a match
// representing the trigger that produced the text.
function buildStateWithText(text: string): EditorState {
  const para = editTasksSchema.node('paragraph', null, text ? [editTasksSchema.text(text)] : []);
  const doc = editTasksSchema.node('doc', null, [para]);
  const state = EditorState.create({ doc });
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, text.length + 1)));
}

function applyMatching(rule: InputRule, state: EditorState, regex: RegExp, text: string): EditorState | null {
  const match = text.match(regex);
  if (!match) return null;
  const end = state.selection.from;
  const start = end - match[0].length;
  // The library's InputRule.handler signature: (state, match, from, to) => Transaction | null
  const tr = (rule as unknown as { handler: (s: EditorState, m: RegExpMatchArray, f: number, t: number) => null | ReturnType<EditorState['tr']['setMeta']> }).handler(state, match, start, end);
  return tr ? state.apply(tr as never) : null;
}

function findRule(test: RegExp, sample: string): InputRule {
  const rule = editTasksInputRules.find((r) => {
    // Each InputRule has a `match` field (the regex). We expose this for testing.
    const m = (r as unknown as { match: RegExp }).match;
    return m && sample.match(m);
  });
  if (!rule) throw new Error(`No rule matches "${sample}"`);
  return rule;
}

function firstChild(state: EditorState | null) {
  if (!state) throw new Error('expected state');
  return state.doc.firstChild!;
}

describe('editTasksInputRules — block rules', () => {
  it('"# " converts paragraph to heading 1', () => {
    const state = buildStateWithText('# ');
    const rule = findRule(/^#\s$/, '# ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '# ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(1);
  });

  it('"## " converts to heading 2', () => {
    const state = buildStateWithText('## ');
    const rule = findRule(/^##\s$/, '## ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '## ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(2);
  });

  it('"### " converts to heading 3', () => {
    const state = buildStateWithText('### ');
    const rule = findRule(/^###\s$/, '### ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '### ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(3);
  });

  it('"```" converts to code_block', () => {
    const state = buildStateWithText('```');
    const rule = findRule(/^```$/, '```');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '```');
    expect(firstChild(next).type.name).toBe('code_block');
  });

  it('"> " wraps in quote', () => {
    const state = buildStateWithText('> ');
    const rule = findRule(/^>\s$/, '> ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '> ');
    expect(firstChild(next).type.name).toBe('quote');
  });

  it('"- " wraps in bulleted_list', () => {
    const state = buildStateWithText('- ');
    const rule = findRule(/^[-*]\s$/, '- ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '- ');
    expect(firstChild(next).type.name).toBe('bulleted_list');
  });

  it('"1. " wraps in numbered_list', () => {
    const state = buildStateWithText('1. ');
    const rule = findRule(/^\d+\.\s$/, '1. ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '1. ');
    expect(firstChild(next).type.name).toBe('numbered_list');
  });

  it('"- [ ] " wraps in task_list', () => {
    const state = buildStateWithText('- [ ] ');
    const rule = findRule(/^-\s\[\s\]\s$/, '- [ ] ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '- [ ] ');
    expect(firstChild(next).type.name).toBe('task_list');
  });
});

describe('editTasksInputRules — mark rules', () => {
  it('"**bold**" wraps middle text in bold mark', () => {
    const state = buildStateWithText('**bold**');
    const rule = findRule(/\*\*([^*]+)\*\*$/, '**bold**');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '**bold**');
    expect(next).not.toBeNull();
    const para = firstChild(next);
    // Should now contain a single text node "bold" with a bold mark
    expect(para.textContent).toBe('bold');
    const child = para.child(0);
    expect(child.marks.some((m) => m.type.name === 'bold')).toBe(true);
  });

  it('"*italic*" applies italic mark', () => {
    const state = buildStateWithText('*italic*');
    const rule = findRule(/(?:^|[^*])\*([^*]+)\*$/, '*italic*');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '*italic*');
    const para = firstChild(next);
    expect(para.textContent).toBe('italic');
    expect(para.child(0).marks.some((m) => m.type.name === 'italic')).toBe(true);
  });

  it('"~~strike~~" applies strikethrough', () => {
    const state = buildStateWithText('~~strike~~');
    const rule = findRule(/~~([^~]+)~~$/, '~~strike~~');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '~~strike~~');
    const para = firstChild(next);
    expect(para.textContent).toBe('strike');
    expect(para.child(0).marks.some((m) => m.type.name === 'strikethrough')).toBe(true);
  });

  it('"`code`" applies inline code mark', () => {
    const state = buildStateWithText('`code`');
    const rule = findRule(/`([^`]+)`$/, '`code`');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '`code`');
    const para = firstChild(next);
    expect(para.textContent).toBe('code');
    expect(para.child(0).marks.some((m) => m.type.name === 'code')).toBe(true);
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/inputrules.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/edit-tasks/inputrules.ts
import {
  InputRule,
  textblockTypeInputRule,
  wrappingInputRule,
} from 'prosemirror-inputrules';
import type { MarkType } from 'prosemirror-model';
import { editTasksSchema } from './schema';

/**
 * Mark input rule. Matches a regex that captures the inner text in group 1
 * surrounded by delimiters that are part of group 0. Replaces the whole
 * matched range with the captured inner text plus the given mark.
 *
 * Adapted from the canonical ProseMirror recipe.
 */
function markInputRule(regexp: RegExp, markType: MarkType): InputRule {
  return new InputRule(regexp, (state, match, start, end) => {
    const inner = match[1];
    if (!inner) return null;
    const tr = state.tr;
    // Compute where the inner text begins inside the matched region
    const matchedStart = start;
    const innerStart = matchedStart + match[0].indexOf(inner);
    const innerEnd = innerStart + inner.length;
    // 1. delete the trailing delimiter (after inner)
    tr.delete(innerEnd, end);
    // 2. delete the leading delimiter (before inner)
    tr.delete(matchedStart, innerStart);
    // After both deletes, the inner now starts at matchedStart and ends at
    // matchedStart + inner.length.
    const newInnerStart = matchedStart;
    const newInnerEnd = newInnerStart + inner.length;
    tr.addMark(newInnerStart, newInnerEnd, markType.create());
    tr.removeStoredMark(markType);
    return tr;
  });
}

const heading1 = textblockTypeInputRule(
  /^#\s$/,
  editTasksSchema.nodes.heading!,
  () => ({ level: 1 }),
);
const heading2 = textblockTypeInputRule(
  /^##\s$/,
  editTasksSchema.nodes.heading!,
  () => ({ level: 2 }),
);
const heading3 = textblockTypeInputRule(
  /^###\s$/,
  editTasksSchema.nodes.heading!,
  () => ({ level: 3 }),
);
const codeBlock = textblockTypeInputRule(
  /^```$/,
  editTasksSchema.nodes.code_block!,
);
const quote = wrappingInputRule(/^>\s$/, editTasksSchema.nodes.quote!);
const bulletList = wrappingInputRule(
  /^[-*]\s$/,
  editTasksSchema.nodes.bulleted_list!,
);
const numberedList = wrappingInputRule(
  /^\d+\.\s$/,
  editTasksSchema.nodes.numbered_list!,
);
const taskList = wrappingInputRule(
  /^-\s\[\s\]\s$/,
  editTasksSchema.nodes.task_list!,
);

const bold = markInputRule(/\*\*([^*]+)\*\*$/, editTasksSchema.marks.bold!);
const italic = markInputRule(
  /(?:^|[^*])\*([^*]+)\*$/,
  editTasksSchema.marks.italic!,
);
const strike = markInputRule(/~~([^~]+)~~$/, editTasksSchema.marks.strikethrough!);
const inlineCode = markInputRule(/`([^`]+)`$/, editTasksSchema.marks.code!);

export const editTasksInputRules: InputRule[] = [
  heading1,
  heading2,
  heading3,
  codeBlock,
  quote,
  bulletList,
  numberedList,
  taskList,
  bold,
  italic,
  strike,
  inlineCode,
];
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/inputrules.test.ts --run`
Expected: PASS — 12/12 tests green.

If a test fails because the `wrappingInputRule` produces a different doc shape than expected (e.g. the schema's `bulleted_list > bulleted_list_item > paragraph` chain doesn't auto-fill), the assertion may need adjustment. The test only checks the OUTERMOST type (`firstChild(next).type.name === 'bulleted_list'`) — that should hold because `wrappingInputRule` wraps the current paragraph in the requested type and PM auto-fills the required intermediate child (`bulleted_list_item`) per the schema. If PM rejects the wrap because the schema requires an intermediate node that PM can't auto-create, fall back to a custom InputRule for that one rule (file an issue inline as a comment).

If the mark rules fail because of stored-mark / cursor-position quirks, inspect the test's expected `para.textContent` versus actual. The most common issue is a leading/trailing space being preserved due to off-by-one in the delete calls. Adjust until tests pass without weakening assertions.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/inputrules.ts lib/edit-tasks/inputrules.test.ts
git commit -m "feat(edit-tasks): add markdown-style inputrules"
```

---

## Task 4: `keymap` (TDD)

**Files:**
- Create: `lib/edit-tasks/keymap.ts`
- Create: `lib/edit-tasks/keymap.test.ts`

Wires mark toggles, list indent/outdent, and block move into a key→command map.

- [ ] **Step 1: Write the failing test**

```ts
// lib/edit-tasks/keymap.test.ts
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection, type Command } from 'prosemirror-state';
import { editTasksSchema } from './schema';
import { editTasksKeymap } from './keymap';

function stateWith(text: string): EditorState {
  const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text(text)]);
  const doc = editTasksSchema.node('doc', null, [para]);
  return EditorState.create({ doc });
}

function selectAll(state: EditorState): EditorState {
  return state.apply(
    state.tr.setSelection(TextSelection.create(state.doc, 1, state.doc.content.size - 1)),
  );
}

function runCmd(cmd: Command, state: EditorState): EditorState {
  let updated: EditorState | null = null;
  cmd(state, (tr) => {
    updated = state.apply(tr);
  });
  return updated ?? state;
}

describe('editTasksKeymap', () => {
  it('Mod-b toggles bold on the selection', () => {
    const initial = selectAll(stateWith('Hello'));
    const cmd = editTasksKeymap['Mod-b'];
    expect(cmd).toBeDefined();
    const next = runCmd(cmd!, initial);
    const para = next.doc.firstChild!;
    expect(para.textContent).toBe('Hello');
    expect(para.child(0).marks.some((m) => m.type.name === 'bold')).toBe(true);
  });

  it('Mod-i toggles italic', () => {
    const initial = selectAll(stateWith('Hi'));
    const next = runCmd(editTasksKeymap['Mod-i']!, initial);
    expect(next.doc.firstChild!.child(0).marks.some((m) => m.type.name === 'italic')).toBe(true);
  });

  it('Mod-e toggles inline code', () => {
    const initial = selectAll(stateWith('Hi'));
    const next = runCmd(editTasksKeymap['Mod-e']!, initial);
    expect(next.doc.firstChild!.child(0).marks.some((m) => m.type.name === 'code')).toBe(true);
  });

  it('Alt-ArrowUp moves the current top-level block up', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('A')]),
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('B')]),
    ]);
    let state = EditorState.create({ doc });
    // Move cursor into the second paragraph
    const posInB = 1 + state.doc.firstChild!.nodeSize + 1;
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, posInB)));
    const next = runCmd(editTasksKeymap['Alt-ArrowUp']!, state);
    const texts: string[] = [];
    next.doc.forEach((c) => texts.push(c.textContent));
    expect(texts).toEqual(['B', 'A']);
  });

  it('Alt-ArrowDown moves the current top-level block down', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('A')]),
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('B')]),
    ]);
    let state = EditorState.create({ doc });
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 1)));
    const next = runCmd(editTasksKeymap['Alt-ArrowDown']!, state);
    const texts: string[] = [];
    next.doc.forEach((c) => texts.push(c.textContent));
    expect(texts).toEqual(['B', 'A']);
  });

  it('binds Tab and Shift-Tab', () => {
    expect(editTasksKeymap['Tab']).toBeDefined();
    expect(editTasksKeymap['Shift-Tab']).toBeDefined();
  });
});
```

- [ ] **Step 2: Run — confirm RED**

Run: `npm run test -- lib/edit-tasks/keymap.test.ts --run`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/edit-tasks/keymap.ts
import { toggleMark } from 'prosemirror-commands';
import { sinkListItem, liftListItem } from 'prosemirror-schema-list';
import { chainCommands } from 'prosemirror-commands';
import type { Command } from 'prosemirror-state';
import { editTasksSchema } from './schema';
import { moveBlockUp, moveBlockDown } from './move-block';

const sinkBullet = sinkListItem(editTasksSchema.nodes.bulleted_list_item!);
const sinkNumber = sinkListItem(editTasksSchema.nodes.numbered_list_item!);
const sinkTask = sinkListItem(editTasksSchema.nodes.task_item!);
const liftBullet = liftListItem(editTasksSchema.nodes.bulleted_list_item!);
const liftNumber = liftListItem(editTasksSchema.nodes.numbered_list_item!);
const liftTask = liftListItem(editTasksSchema.nodes.task_item!);

export const editTasksKeymap: Record<string, Command> = {
  'Mod-b': toggleMark(editTasksSchema.marks.bold!),
  'Mod-i': toggleMark(editTasksSchema.marks.italic!),
  'Mod-e': toggleMark(editTasksSchema.marks.code!),
  Tab: chainCommands(sinkBullet, sinkNumber, sinkTask),
  'Shift-Tab': chainCommands(liftBullet, liftNumber, liftTask),
  'Alt-ArrowUp': moveBlockUp,
  'Alt-ArrowDown': moveBlockDown,
};
```

- [ ] **Step 4: Run — confirm GREEN**

Run: `npm run test -- lib/edit-tasks/keymap.test.ts --run`
Expected: PASS — 6/6 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/edit-tasks/keymap.ts lib/edit-tasks/keymap.test.ts
git commit -m "feat(edit-tasks): add extended keymap (marks, list indent, block move)"
```

---

## Task 5: Wire `inputrules` and `keymap` into `TaskEditor`

**File:** `components/edit-tasks/task-editor.tsx`

- [ ] **Step 1: Read the current file and locate the plugin array**

The `EditorState.create` call has a `plugins` array. Currently it includes `history()`, `keymap({Mod-z, Mod-y, Mod-Shift-z})`, `keymap(baseKeymap)`, `dropCursor()`, `gapCursor()`. We add `inputRules` and `keymap(editTasksKeymap)` BEFORE the existing baseKeymap (so Mod-b etc. take precedence over any baseKeymap fallback).

- [ ] **Step 2: Update imports**

At the top of `components/edit-tasks/task-editor.tsx`, add:

```tsx
import { inputRules } from 'prosemirror-inputrules';
import { editTasksInputRules } from '@/lib/edit-tasks/inputrules';
import { editTasksKeymap } from '@/lib/edit-tasks/keymap';
```

- [ ] **Step 3: Update the plugin array**

Find the existing `plugins:` array in `EditorState.create` and change it from:

```tsx
plugins: [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
],
```

to:

```tsx
plugins: [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap(editTasksKeymap),
  inputRules({ rules: editTasksInputRules }),
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
],
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck` → PASS.

- [ ] **Step 5: Run the existing TaskEditor tests**

Run: `npm run test -- components/edit-tasks/__tests__/task-editor.test.tsx --run`
Expected: PASS — the existing 6 tests still pass with the expanded plugin set.

- [ ] **Step 6: Run the full suite**

Run: `npm run test -- --run`
Expected: PASS — every test green.

- [ ] **Step 7: Commit**

```bash
git add components/edit-tasks/task-editor.tsx
git commit -m "feat(edit-tasks): wire inputrules and extended keymap into TaskEditor"
```

---

## Task 6: Final gates

- [ ] **Step 1**: `npm run typecheck` → PASS
- [ ] **Step 2**: `npm run test -- --run` → PASS
- [ ] **Step 3**: `npm run build` → PASS

If any gate fails, fix before reporting Phase 2B complete.

---

## Done.

After Task 6, the editor accepts markdown input rules and key shortcuts. Phase 2C (slash menu) is the next plan.
