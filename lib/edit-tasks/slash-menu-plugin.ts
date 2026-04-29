// lib/edit-tasks/slash-menu-plugin.ts
import { Plugin, PluginKey, type EditorState } from 'prosemirror-state';

export type SlashMenuState =
  | { active: false }
  | { active: true; from: number; query: string };

export const slashMenuPluginKey = new PluginKey<SlashMenuState>('slash-menu');

export function getSlashMenuState(state: EditorState): SlashMenuState {
  return slashMenuPluginKey.getState(state) ?? { active: false };
}

function computeState(state: EditorState): SlashMenuState {
  const { $from } = state.selection;
  const parent = $from.parent;
  if (parent.type.name !== 'paragraph') return { active: false };
  const text = parent.textContent;
  if (!text.startsWith('/')) return { active: false };
  const paragraphStart = $from.before($from.depth) + 1;
  return {
    active: true,
    from: paragraphStart + 1,
    query: text.slice(1),
  };
}

export function slashMenuPlugin(): Plugin<SlashMenuState> {
  return new Plugin<SlashMenuState>({
    key: slashMenuPluginKey,
    state: {
      init(_, state) {
        return computeState(state);
      },
      apply(_tr, _prev, _oldState, newState) {
        return computeState(newState);
      },
    },
  });
}
