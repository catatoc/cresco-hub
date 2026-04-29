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
