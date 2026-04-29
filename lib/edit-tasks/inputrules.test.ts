import { describe, it, expect } from 'vitest';
import { EditorState, TextSelection } from 'prosemirror-state';
import type { InputRule } from 'prosemirror-inputrules';
import { editTasksSchema } from './schema';
import { editTasksInputRules } from './inputrules';

function buildStateWithText(text: string): EditorState {
  const para = editTasksSchema.node('paragraph', null, text ? [editTasksSchema.text(text)] : []);
  const doc = editTasksSchema.node('doc', null, [para]);
  const state = EditorState.create({ doc });
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, text.length + 1)));
}

function applyMatching(rule: InputRule, state: EditorState, regex: RegExp, text: string): EditorState | null {
  const match = text.match(regex);
  if (!match) return null;
  const end = state.selection.from;
  const start = end - match[0].length;
  const tr = (rule as unknown as { handler: (s: EditorState, m: RegExpMatchArray, f: number, t: number) => null | ReturnType<EditorState['tr']['setMeta']> }).handler(state, match, start, end);
  return tr ? state.apply(tr as never) : null;
}

function findRule(sample: string): InputRule {
  const rule = editTasksInputRules.find((r) => {
    const m = (r as unknown as { match: RegExp }).match;
    return m && sample.match(m);
  });
  if (!rule) throw new Error(`No rule matches "${sample}"`);
  return rule;
}

function firstChild(state: EditorState | null) {
  if (!state) throw new Error('expected state');
  return state.doc.firstChild!;
}

describe('editTasksInputRules — block rules', () => {
  it('"# " converts paragraph to heading 1', () => {
    const state = buildStateWithText('# ');
    const rule = findRule('# ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '# ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(1);
  });

  it('"## " converts to heading 2', () => {
    const state = buildStateWithText('## ');
    const rule = findRule('## ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '## ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(2);
  });

  it('"### " converts to heading 3', () => {
    const state = buildStateWithText('### ');
    const rule = findRule('### ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '### ');
    expect(firstChild(next).type.name).toBe('heading');
    expect(firstChild(next).attrs.level).toBe(3);
  });

  it('"```" converts to code_block', () => {
    const state = buildStateWithText('```');
    const rule = findRule('```');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '```');
    expect(firstChild(next).type.name).toBe('code_block');
  });

  it('"> " wraps in quote', () => {
    const state = buildStateWithText('> ');
    const rule = findRule('> ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '> ');
    expect(firstChild(next).type.name).toBe('quote');
  });

  it('"- " wraps in bulleted_list', () => {
    const state = buildStateWithText('- ');
    const rule = findRule('- ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '- ');
    expect(firstChild(next).type.name).toBe('bulleted_list');
  });

  it('"1. " wraps in numbered_list', () => {
    const state = buildStateWithText('1. ');
    const rule = findRule('1. ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '1. ');
    expect(firstChild(next).type.name).toBe('numbered_list');
  });

  it('"- [ ] " wraps in task_list', () => {
    const state = buildStateWithText('- [ ] ');
    const rule = findRule('- [ ] ');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '- [ ] ');
    expect(firstChild(next).type.name).toBe('task_list');
  });
});

describe('editTasksInputRules — mark rules', () => {
  it('"**bold**" wraps middle text in bold mark', () => {
    const state = buildStateWithText('**bold**');
    const rule = findRule('**bold**');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '**bold**');
    expect(next).not.toBeNull();
    const para = firstChild(next);
    expect(para.textContent).toBe('bold');
    const child = para.child(0);
    expect(child.marks.some((m) => m.type.name === 'bold')).toBe(true);
  });

  it('"*italic*" applies italic mark', () => {
    const state = buildStateWithText('*italic*');
    const rule = findRule('*italic*');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '*italic*');
    const para = firstChild(next);
    expect(para.textContent).toBe('italic');
    expect(para.child(0).marks.some((m) => m.type.name === 'italic')).toBe(true);
  });

  it('"~~strike~~" applies strikethrough', () => {
    const state = buildStateWithText('~~strike~~');
    const rule = findRule('~~strike~~');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '~~strike~~');
    const para = firstChild(next);
    expect(para.textContent).toBe('strike');
    expect(para.child(0).marks.some((m) => m.type.name === 'strikethrough')).toBe(true);
  });

  it('"`code`" applies inline code mark', () => {
    const state = buildStateWithText('`code`');
    const rule = findRule('`code`');
    const next = applyMatching(rule, state, (rule as unknown as { match: RegExp }).match, '`code`');
    const para = firstChild(next);
    expect(para.textContent).toBe('code');
    expect(para.child(0).marks.some((m) => m.type.name === 'code')).toBe(true);
  });
});
