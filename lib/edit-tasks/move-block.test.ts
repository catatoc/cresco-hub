// lib/edit-tasks/move-block.test.ts
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection, type Command } from 'prosemirror-state';
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
    const initial = selectBlock(buildState('A', 'B', 'C'), 1);
    const next = runCmd(moveBlockUp, initial);
    expect(texts(next)).toEqual(['B', 'A', 'C']);
  });

  it('is a no-op when at the first block', () => {
    const initial = selectBlock(buildState('A', 'B'), 0);
    let dispatched = false;
    moveBlockUp(initial, () => {
      dispatched = true;
    });
    expect(dispatched).toBe(false);
  });
});

describe('moveBlockDown', () => {
  it('swaps current block with next one', () => {
    const initial = selectBlock(buildState('A', 'B', 'C'), 1);
    const next = runCmd(moveBlockDown, initial);
    expect(texts(next)).toEqual(['A', 'C', 'B']);
  });

  it('is a no-op when at the last block', () => {
    const initial = selectBlock(buildState('A', 'B'), 1);
    let dispatched = false;
    moveBlockDown(initial, () => {
      dispatched = true;
    });
    expect(dispatched).toBe(false);
  });
});
