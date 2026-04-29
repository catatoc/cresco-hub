import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { editTasksSchema } from './schema';
import { slashMenuPlugin, getSlashMenuState } from './slash-menu-plugin';

function buildState(paragraphText: string): EditorState {
  const para = editTasksSchema.node(
    'paragraph',
    null,
    paragraphText ? [editTasksSchema.text(paragraphText)] : [],
  );
  const doc = editTasksSchema.node('doc', null, [para]);
  return EditorState.create({ doc, plugins: [slashMenuPlugin()] });
}

describe('slashMenuPlugin', () => {
  it('starts inactive on a doc with no slash', () => {
    const state = buildState('hello');
    expect(getSlashMenuState(state).active).toBe(false);
  });

  it('activates when paragraph starts with "/"', () => {
    const state = buildState('/');
    const placed = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 2)));
    const s = getSlashMenuState(placed);
    if (!s.active) throw new Error('expected active');
    expect(s.query).toBe('');
  });

  it('captures the query after "/"', () => {
    const state = buildState('/hea');
    const placed = state.apply(state.tr.setSelection(TextSelection.create(state.doc, 5)));
    const s = getSlashMenuState(placed);
    if (!s.active) throw new Error('expected active');
    expect(s.query).toBe('hea');
  });

  it('deactivates when paragraph no longer starts with "/"', () => {
    const initial = buildState('hello');
    expect(getSlashMenuState(initial).active).toBe(false);
  });

  it('deactivates when the cursor moves to a paragraph without leading "/"', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('/foo')]),
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('bar')]),
    ]);
    let state = EditorState.create({ doc, plugins: [slashMenuPlugin()] });
    const secondStart = 1 + state.doc.firstChild!.nodeSize + 1;
    state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, secondStart)));
    expect(getSlashMenuState(state).active).toBe(false);
  });
});
