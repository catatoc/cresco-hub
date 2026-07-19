// lib/edit-tasks/slash-menu-items.ts
import type { Node, Fragment } from 'prosemirror-model';
import { editTasksSchema } from './schema';

type Insert = (
  state: import('prosemirror-state').EditorState,
  dispatch: (tr: import('prosemirror-state').Transaction) => void,
  from: number,
) => void;

export type SlashMenuIcon =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'bulletList'
  | 'numberedList'
  | 'taskList'
  | 'quote'
  | 'divider'
  | 'codeBlock'
  | 'callout';

export type SlashMenuGroup = 'basic' | 'lists' | 'advanced';

// label/description visibles viven en messages/{es,en}/editTasks.json bajo
// slashMenu.items.<id> — aquí solo quedan datos neutrales al idioma.
export type SlashMenuItem = {
  id: string;
  icon: SlashMenuIcon;
  group: SlashMenuGroup;
  keywords?: string[];
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
  {
    id: 'heading-1',
    icon: 'h1',
    group: 'basic',
    keywords: ['h1', 'titulo', 'title', 'heading'],
    insert: setHeading(1),
  },
  {
    id: 'heading-2',
    icon: 'h2',
    group: 'basic',
    keywords: ['h2', 'subtitulo', 'subtitle', 'heading'],
    insert: setHeading(2),
  },
  {
    id: 'heading-3',
    icon: 'h3',
    group: 'basic',
    keywords: ['h3', 'heading'],
    insert: setHeading(3),
  },
  {
    id: 'bullet-list',
    icon: 'bulletList',
    group: 'lists',
    keywords: ['ul', 'unordered', 'lista', 'bullet'],
    insert: wrapBulletList,
  },
  {
    id: 'numbered-list',
    icon: 'numberedList',
    group: 'lists',
    keywords: ['ol', 'ordered', 'numero', 'numbered'],
    insert: wrapNumberedList,
  },
  {
    id: 'task-list',
    icon: 'taskList',
    group: 'lists',
    keywords: ['todo', 'task', 'check', 'pendiente'],
    insert: wrapTaskList,
  },
  {
    id: 'quote',
    icon: 'quote',
    group: 'advanced',
    keywords: ['cita', 'blockquote', 'quote'],
    insert: wrapQuote,
  },
  {
    id: 'divider',
    icon: 'divider',
    group: 'advanced',
    keywords: ['hr', 'linea', 'separator', 'divider'],
    insert: insertDivider,
  },
  {
    id: 'code-block',
    icon: 'codeBlock',
    group: 'advanced',
    keywords: ['codigo', 'pre', 'code'],
    insert: setCodeBlock,
  },
  {
    id: 'callout',
    icon: 'callout',
    group: 'advanced',
    keywords: ['nota', 'note', 'info', 'callout'],
    insert: insertCallout,
  },
];

export const slashMenuGroups: SlashMenuGroup[] = ['basic', 'lists', 'advanced'];
