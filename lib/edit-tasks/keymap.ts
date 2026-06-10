// lib/edit-tasks/keymap.ts
import { toggleMark, chainCommands } from 'prosemirror-commands';
import { sinkListItem, liftListItem, splitListItem } from 'prosemirror-schema-list';
import type { Command } from 'prosemirror-state';
import type { NodeType } from 'prosemirror-model';
import { editTasksSchema } from './schema';
import { moveBlockUp, moveBlockDown } from './move-block';

const bulletItem = editTasksSchema.nodes.bulleted_list_item!;
const numberItem = editTasksSchema.nodes.numbered_list_item!;
const taskItem = editTasksSchema.nodes.task_item!;

const sinkBullet = sinkListItem(bulletItem);
const sinkNumber = sinkListItem(numberItem);
const sinkTask = sinkListItem(taskItem);
const liftBullet = liftListItem(bulletItem);
const liftNumber = liftListItem(numberItem);
const liftTask = liftListItem(taskItem);

const splitBullet = splitListItem(bulletItem);
const splitNumber = splitListItem(numberItem);
const splitTask = splitListItem(taskItem);

/**
 * If the cursor sits in an empty list item, lift it out of the list (exit
 * the list). Notion-style behavior: a second Enter on an empty bullet
 * exits the list rather than creating another empty bullet.
 */
function liftEmptyListItemFor(itemType: NodeType): Command {
  const lift = liftListItem(itemType);
  return (state, dispatch) => {
    const { $from } = state.selection;
    const node = $from.node(-1);
    if (!node || node.type !== itemType) return false;
    const item = $from.parent;
    if (item.content.size > 0) return false;
    return lift(state, dispatch);
  };
}

export const editTasksKeymap: Record<string, Command> = {
  'Mod-b': toggleMark(editTasksSchema.marks.bold!),
  'Mod-i': toggleMark(editTasksSchema.marks.italic!),
  'Mod-e': toggleMark(editTasksSchema.marks.code!),
  Enter: chainCommands(
    liftEmptyListItemFor(bulletItem),
    liftEmptyListItemFor(numberItem),
    liftEmptyListItemFor(taskItem),
    splitBullet,
    splitNumber,
    splitTask,
  ),
  Tab: chainCommands(sinkBullet, sinkNumber, sinkTask),
  'Shift-Tab': chainCommands(liftBullet, liftNumber, liftTask),
  'Alt-ArrowUp': moveBlockUp,
  'Alt-ArrowDown': moveBlockDown,
};
