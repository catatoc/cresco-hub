'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EditorView } from 'prosemirror-view';
import { getSlashMenuState } from '@/lib/edit-tasks/slash-menu-plugin';
import { slashMenuItems } from '@/lib/edit-tasks/slash-menu-items';
import { cn } from '@/lib/utils';

type Props = {
  view: EditorView | null;
  /**
   * Bumped by TaskEditor on every transaction so this component re-reads
   * the plugin's state. React's normal render cycle isn't enough on its
   * own because EditorView's state lives outside React.
   */
  tick: number;
};

export function SlashMenu({ view, tick }: Props) {
  const [highlighted, setHighlighted] = useState(0);

  const slashState = useMemo(() => {
    if (!view) return { active: false as const };
    return getSlashMenuState(view.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tick]);

  const filtered = useMemo(() => {
    if (!slashState.active) return slashMenuItems;
    const q = slashState.query.toLowerCase();
    if (!q) return slashMenuItems;
    return slashMenuItems.filter((i) => i.label.toLowerCase().includes(q));
  }, [slashState]);

  useEffect(() => {
    setHighlighted(0);
  }, [slashState.active, filtered.length]);

  useEffect(() => {
    if (!slashState.active || !view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % Math.max(1, filtered.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + filtered.length) % Math.max(1, filtered.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[highlighted];
        if (item) item.insert(view.state, view.dispatch.bind(view), slashState.from);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const start = slashState.from - 1;
        const end = view.state.selection.from;
        view.dispatch(view.state.tr.delete(start, end));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slashState, filtered, highlighted, view]);

  if (!slashState.active || !view) return null;
  const coords = view.coordsAtPos(slashState.from);

  return (
    <div
      role="listbox"
      style={{
        position: 'fixed',
        left: coords.left,
        top: coords.bottom + 4,
        zIndex: 50,
      }}
      className="edit-tasks-popover min-w-[220px] rounded-lg bg-white border border-border shadow-lg p-1"
    >
      {filtered.length === 0 && (
        <div className="px-3 py-2 text-[12px] text-muted-foreground">Sin resultados</div>
      )}
      {filtered.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => item.insert(view.state, view.dispatch.bind(view), slashState.from)}
          onMouseEnter={() => setHighlighted(i)}
          className={cn(
            'w-full text-left px-3 py-1.5 text-[12.5px] rounded-md',
            i === highlighted ? 'bg-[#eeeffc] text-[#5e6ad2]' : 'text-foreground hover:bg-[#f7f7f8]',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
