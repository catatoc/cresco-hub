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
    const matchedStart = start;
    const innerStart = matchedStart + match[0].indexOf(inner);
    const innerEnd = innerStart + inner.length;
    // 1. delete the trailing delimiter (after inner)
    tr.delete(innerEnd, end);
    // 2. delete the leading delimiter (before inner)
    tr.delete(matchedStart, innerStart);
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
const strike = markInputRule(
  /~~([^~]+)~~$/,
  editTasksSchema.marks.strikethrough!,
);
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
