// lib/edit-tasks/keymap.ts
import { toggleMark, chainCommands } from 'prosemirror-commands';
import { sinkListItem, liftListItem } from 'prosemirror-schema-list';
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
