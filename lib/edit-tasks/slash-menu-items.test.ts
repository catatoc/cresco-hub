// lib/edit-tasks/slash-menu-items.test.ts
import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import { editTasksSchema } from './schema';
import { slashMenuItems } from './slash-menu-items';

function activeStateAtSlash(slashAndQuery: string): { state: EditorState; from: number } {
  const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text(slashAndQuery)]);
  const doc = editTasksSchema.node('doc', null, [para]);
  let state = EditorState.create({ doc });
  const endPos = slashAndQuery.length + 1;
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, endPos)));
  return { state, from: 2 };
}

function applyInsert(itemId: string, slashAndQuery: string): EditorState {
  const item = slashMenuItems.find((i) => i.id === itemId);
  if (!item) throw new Error(`No item ${itemId}`);
  const { state, from } = activeStateAtSlash(slashAndQuery);
  let updated: EditorState | null = null;
  item.insert(state, (tr) => {
    updated = state.apply(tr);
  }, from);
  return updated ?? state;
}

describe('slashMenuItems', () => {
  it('exposes 10 items with stable ids and labels', () => {
    expect(slashMenuItems).toHaveLength(10);
    const ids = slashMenuItems.map((i) => i.id);
    expect(new Set(ids).size).toBe(10);
    expect(slashMenuItems.map((i) => i.label)).toEqual(
      expect.arrayContaining([
        'Heading 1',
        'Heading 2',
        'Heading 3',
        'Bullet list',
        'Numbered list',
        'Task list',
        'Quote',
        'Divider',
        'Code block',
        'Callout',
      ]),
    );
  });

  it('heading-1 replaces the paragraph with heading level 1 and clears slash text', () => {
    const next = applyInsert('heading-1', '/h');
    expect(next.doc.firstChild!.type.name).toBe('heading');
    expect(next.doc.firstChild!.attrs.level).toBe(1);
    expect(next.doc.firstChild!.textContent).toBe('');
  });

  it('bullet-list wraps in bulleted_list', () => {
    const next = applyInsert('bullet-list', '/');
    expect(next.doc.firstChild!.type.name).toBe('bulleted_list');
  });

  it('numbered-list wraps in numbered_list', () => {
    const next = applyInsert('numbered-list', '/');
    expect(next.doc.firstChild!.type.name).toBe('numbered_list');
  });

  it('task-list wraps in task_list', () => {
    const next = applyInsert('task-list', '/');
    expect(next.doc.firstChild!.type.name).toBe('task_list');
  });

  it('quote wraps in quote', () => {
    const next = applyInsert('quote', '/');
    expect(next.doc.firstChild!.type.name).toBe('quote');
  });

  it('divider replaces with divider node', () => {
    const next = applyInsert('divider', '/');
    expect(next.doc.firstChild!.type.name).toBe('divider');
  });

  it('code-block replaces with code_block', () => {
    const next = applyInsert('code-block', '/');
    expect(next.doc.firstChild!.type.name).toBe('code_block');
  });

  it('callout replaces with callout containing a paragraph', () => {
    const next = applyInsert('callout', '/');
    expect(next.doc.firstChild!.type.name).toBe('callout');
    expect(next.doc.firstChild!.firstChild!.type.name).toBe('paragraph');
  });
});
