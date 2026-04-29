// lib/edit-tasks/schema.test.ts
import { describe, it, expect } from 'vitest';
import { Node } from 'prosemirror-model';
import { editTasksSchema } from './schema';

describe('editTasksSchema', () => {
  it('exposes the expected node types', () => {
    const types = Object.keys(editTasksSchema.nodes);
    expect(types).toEqual(
      expect.arrayContaining([
        'doc',
        'paragraph',
        'heading',
        'bulleted_list',
        'bulleted_list_item',
        'numbered_list',
        'numbered_list_item',
        'task_list',
        'task_item',
        'quote',
        'divider',
        'callout',
        'code_block',
        'unsupported_block',
        'text',
      ]),
    );
  });

  it('exposes the expected marks', () => {
    const marks = Object.keys(editTasksSchema.marks);
    expect(marks).toEqual(
      expect.arrayContaining(['bold', 'italic', 'strikethrough', 'code', 'link']),
    );
  });

  it('builds a valid empty document', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph'),
    ]);
    expect(doc.type.name).toBe('doc');
    expect(doc.firstChild?.type.name).toBe('paragraph');
  });

  it('builds a heading with level attribute', () => {
    const heading = editTasksSchema.node('heading', { level: 2 }, [
      editTasksSchema.text('Title'),
    ]);
    expect(heading.attrs.level).toBe(2);
    expect(heading.textContent).toBe('Title');
  });

  it('builds a callout with emoji attribute', () => {
    const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text('Note')]);
    const callout = editTasksSchema.node('callout', { emoji: '💡' }, [para]);
    expect(callout.attrs.emoji).toBe('💡');
  });

  it('builds a task_item with checked attribute', () => {
    const para = editTasksSchema.node('paragraph', null, [editTasksSchema.text('Do it')]);
    const item = editTasksSchema.node('task_item', { checked: true }, [para]);
    expect(item.attrs.checked).toBe(true);
  });

  it('builds a code_block with language attribute and text content', () => {
    const code = editTasksSchema.node(
      'code_block',
      { language: 'typescript' },
      [editTasksSchema.text('const x = 1;')],
    );
    expect(code.attrs.language).toBe('typescript');
    expect(code.textContent).toBe('const x = 1;');
  });

  it('serializes to JSON and back via Node.fromJSON', () => {
    const doc = editTasksSchema.node('doc', null, [
      editTasksSchema.node('paragraph', null, [editTasksSchema.text('Hello')]),
    ]);
    const json = doc.toJSON();
    const back = Node.fromJSON(editTasksSchema, json);
    expect(back.eq(doc)).toBe(true);
  });

  it('supports nested marks on the same span', () => {
    const bold = editTasksSchema.marks.bold!.create();
    const italic = editTasksSchema.marks.italic!.create();
    const text = editTasksSchema.text('Hi', [bold, italic]);
    expect(text.marks.length).toBe(2);
  });

  it('treats divider as an atom block', () => {
    expect(editTasksSchema.nodes.divider!.spec.atom).toBe(true);
  });

  it('treats unsupported_block as an atom block', () => {
    expect(editTasksSchema.nodes.unsupported_block!.spec.atom).toBe(true);
  });
});
