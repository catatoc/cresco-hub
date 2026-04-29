'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { inputRules } from 'prosemirror-inputrules';
import { Node as PMNode } from 'prosemirror-model';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { editTasksInputRules } from '@/lib/edit-tasks/inputrules';
import { editTasksKeymap } from '@/lib/edit-tasks/keymap';
import { slashMenuPlugin } from '@/lib/edit-tasks/slash-menu-plugin';
import { SlashMenu } from './slash-menu';

export type PMNodeJSON = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PMNodeJSON[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type TaskEditorHandle = {
  getDoc: () => PMNodeJSON;
  hasChanges: () => boolean;
  replaceContent: (doc: PMNodeJSON) => void;
  getView: () => EditorView | null;
};

type Props = {
  initialDoc: PMNodeJSON;
  onChange: () => void;
};

export const TaskEditor = forwardRef<TaskEditorHandle, Props>(function TaskEditor(
  { initialDoc, onChange },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialJSONRef = useRef<string>(JSON.stringify(initialDoc));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!hostRef.current) return;
    const doc = PMNode.fromJSON(editTasksSchema, initialDoc);
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(editTasksKeymap),
        inputRules({ rules: editTasksInputRules }),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
        slashMenuPlugin(),
      ],
    });
    const view = new EditorView(hostRef.current, {
      state,
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        onChange();
        setTick((t) => t + 1);
      },
    });
    viewRef.current = view;
    setTick((t) => t + 1);
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    getDoc: () => {
      if (!viewRef.current) return initialDoc;
      return viewRef.current.state.doc.toJSON() as PMNodeJSON;
    },
    hasChanges: () => {
      if (!viewRef.current) return false;
      return JSON.stringify(viewRef.current.state.doc.toJSON()) !== initialJSONRef.current;
    },
    replaceContent: (doc: PMNodeJSON) => {
      if (!viewRef.current) return;
      const next = PMNode.fromJSON(editTasksSchema, doc);
      const state = EditorState.create({
        doc: next,
        plugins: viewRef.current.state.plugins,
      });
      viewRef.current.updateState(state);
      onChange();
      setTick((t) => t + 1);
    },
    getView: () => viewRef.current,
  }));

  return (
    <>
      <div
        ref={hostRef}
        className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
      />
      <SlashMenu view={viewRef.current} tick={tick} />
    </>
  );
});
