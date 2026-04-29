// lib/edit-tasks/slash-menu-items.ts
import type { Node, Fragment } from 'prosemirror-model';
import { editTasksSchema } from './schema';

type Insert = (
  state: import('prosemirror-state').EditorState,
  dispatch: (tr: import('prosemirror-state').Transaction) => void,
  from: number,
) => void;

export type SlashMenuItem = {
  id: string;
  label: string;
  insert: Insert;
};

/**
 * Delete the slash + query text and replace the containing block with the result of `buildBlock`.
 * Avoids the rebase complexity of running prosemirror-commands after a delete.
 */
function withSlashClearedManual(buildBlock: (paragraph: Node) => Node | Fragment): Insert {
  return (state, dispatch, from) => {
    const start = from - 1;
    const end = state.selection.from;
    const tr = state.tr.delete(start, end);
    const $pos = tr.doc.resolve(tr.mapping.map(start));
    const blockStart = $pos.before($pos.depth);
    const blockEnd = $pos.after($pos.depth);
    const para = tr.doc.nodeAt(blockStart);
    if (!para) return;
    const replacement = buildBlock(para);
    tr.replaceWith(blockStart, blockEnd, replacement);
    dispatch(tr);
  };
}

const setHeading = (level: 1 | 2 | 3): Insert =>
  withSlashClearedManual((para) => {
    return editTasksSchema.nodes.heading!.create({ level }, para.content);
  });

const setCodeBlock: Insert = withSlashClearedManual((para) =>
  editTasksSchema.nodes.code_block!.create(null, para.content),
);

const wrapBulletList: Insert = withSlashClearedManual((para) => {
  const item = editTasksSchema.nodes.bulleted_list_item!.create(null, para);
  return editTasksSchema.nodes.bulleted_list!.create(null, item);
});

const wrapNumberedList: Insert = withSlashClearedManual((para) => {
  const item = editTasksSchema.nodes.numbered_list_item!.create(null, para);
  return editTasksSchema.nodes.numbered_list!.create(null, item);
});

const wrapTaskList: Insert = withSlashClearedManual((para) => {
  const item = editTasksSchema.nodes.task_item!.create(null, para);
  return editTasksSchema.nodes.task_list!.create(null, item);
});

const wrapQuote: Insert = withSlashClearedManual((para) => {
  return editTasksSchema.nodes.quote!.create(null, para);
});

const insertDivider: Insert = (state, dispatch, from) => {
  const start = from - 1;
  const end = state.selection.from;
  const tr = state.tr.delete(start, end);
  const $pos = tr.doc.resolve(tr.mapping.map(start));
  const blockStart = $pos.before($pos.depth);
  const blockEnd = $pos.after($pos.depth);
  const divider = editTasksSchema.nodes.divider!.create();
  const nextPara = editTasksSchema.nodes.paragraph!.create();
  tr.replaceWith(blockStart, blockEnd, [divider, nextPara]);
  dispatch(tr);
};

const insertCallout: Insert = (state, dispatch, from) => {
  const start = from - 1;
  const end = state.selection.from;
  const tr = state.tr.delete(start, end);
  const $pos = tr.doc.resolve(tr.mapping.map(start));
  const blockStart = $pos.before($pos.depth);
  const blockEnd = $pos.after($pos.depth);
  const para = editTasksSchema.nodes.paragraph!.create();
  const callout = editTasksSchema.nodes.callout!.create({ emoji: '💡' }, para);
  tr.replaceWith(blockStart, blockEnd, callout);
  dispatch(tr);
};

export const slashMenuItems: SlashMenuItem[] = [
  { id: 'heading-1', label: 'Heading 1', insert: setHeading(1) },
  { id: 'heading-2', label: 'Heading 2', insert: setHeading(2) },
  { id: 'heading-3', label: 'Heading 3', insert: setHeading(3) },
  { id: 'bullet-list', label: 'Bullet list', insert: wrapBulletList },
  { id: 'numbered-list', label: 'Numbered list', insert: wrapNumberedList },
  { id: 'task-list', label: 'Task list', insert: wrapTaskList },
  { id: 'quote', label: 'Quote', insert: wrapQuote },
  { id: 'divider', label: 'Divider', insert: insertDivider },
  { id: 'code-block', label: 'Code block', insert: setCodeBlock },
  { id: 'callout', label: 'Callout', insert: insertCallout },
];
