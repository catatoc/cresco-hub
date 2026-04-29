'use client';

import { useMemo } from 'react';
import type { EditorView } from 'prosemirror-view';
import { toggleMark } from 'prosemirror-commands';
import { Bold, Italic, Strikethrough, Code, Link as LinkIcon } from 'lucide-react';
import { editTasksSchema } from '@/lib/edit-tasks/schema';
import { cn } from '@/lib/utils';

type Props = {
  view: EditorView | null;
  tick: number;
  onLinkRequest: () => void;
};

export function InlineToolbar({ view, tick, onLinkRequest }: Props) {
  const selectionInfo = useMemo(() => {
    if (!view) return null;
    const { from, to, empty } = view.state.selection;
    if (empty) return null;
    const $from = view.state.doc.resolve(from);
    if ($from.parent.type.name === 'code_block') return null;
    return { from, to };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tick]);

  if (!selectionInfo || !view) return null;

  function run(name: 'bold' | 'italic' | 'strikethrough' | 'code') {
    if (!view) return;
    const mark = editTasksSchema.marks[name]!;
    toggleMark(mark)(view.state, view.dispatch.bind(view));
    view.focus();
  }

  function isActive(name: 'bold' | 'italic' | 'strikethrough' | 'code'): boolean {
    if (!view) return false;
    const mark = editTasksSchema.marks[name]!;
    const { from, to } = view.state.selection;
    return view.state.doc.rangeHasMark(from, to, mark);
  }

  const coords = view.coordsAtPos(selectionInfo.from);

  return (
    <div
      role="toolbar"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.top - 36,
        zIndex: 50,
      }}
      className="edit-tasks-popover inline-flex items-center gap-0.5 p-1 rounded-md bg-white border border-border shadow-md"
    >
      <ToolbarButton label="Bold" onClick={() => run('bold')} active={isActive('bold')}>
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Italic" onClick={() => run('italic')} active={isActive('italic')}>
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="Strike"
        onClick={() => run('strikethrough')}
        active={isActive('strikethrough')}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Code" onClick={() => run('code')} active={isActive('code')}>
        <Code className="w-3.5 h-3.5" />
      </ToolbarButton>
      <span className="w-px h-4 bg-border mx-0.5" />
      <ToolbarButton label="Link" onClick={onLinkRequest} active={false}>
        <LinkIcon className="w-3.5 h-3.5" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'inline-grid place-items-center w-7 h-7 rounded',
        active
          ? 'bg-[#eeeffc] text-[#5e6ad2]'
          : 'text-foreground hover:bg-[#f7f7f8]',
      )}
    >
      {children}
    </button>
  );
}
