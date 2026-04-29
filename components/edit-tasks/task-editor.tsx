'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { Node as PMNode } from 'prosemirror-model';
import { editTasksSchema } from '@/lib/edit-tasks/schema';

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
  /**
   * Replace the editor's doc with a new JSON. Used in tests and by the
   * container after a successful save (to reset the pristine baseline).
   */
  replaceContent: (doc: PMNodeJSON) => void;
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

  useEffect(() => {
    if (!hostRef.current) return;
    const doc = PMNode.fromJSON(editTasksSchema, initialDoc);
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
        keymap(baseKeymap),
        dropCursor(),
        gapCursor(),
      ],
    });
    const view = new EditorView(hostRef.current, {
      state,
      dispatchTransaction(tr) {
        const next = view.state.apply(tr);
        view.updateState(next);
        onChange();
      },
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // initialDoc is captured at mount time; further updates use replaceContent.
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
    },
  }));

  return (
    <div
      ref={hostRef}
      className="prose prose-sm max-w-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]"
    />
  );
});
