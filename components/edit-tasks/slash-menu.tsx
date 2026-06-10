'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListChecks,
  Quote,
  Minus,
  Code,
  Lightbulb,
} from 'lucide-react';
import type { EditorView } from 'prosemirror-view';
import { getSlashMenuState } from '@/lib/edit-tasks/slash-menu-plugin';
import {
  slashMenuItems,
  slashMenuGroupLabels,
  type SlashMenuIcon,
  type SlashMenuItem,
} from '@/lib/edit-tasks/slash-menu-items';
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

const ICON_MAP: Record<SlashMenuIcon, React.ComponentType<{ className?: string }>> = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  bulletList: List,
  numberedList: ListOrdered,
  taskList: ListChecks,
  quote: Quote,
  divider: Minus,
  codeBlock: Code,
  callout: Lightbulb,
};

const MENU_WIDTH = 280;
const MENU_MAX_HEIGHT = 320;
const VIEWPORT_PADDING = 8;

function matchesQuery(item: SlashMenuItem, q: string): boolean {
  if (!q) return true;
  const haystack = [item.label, item.description, ...(item.keywords ?? [])]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function SlashMenu({ view, tick }: Props) {
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const slashState = useMemo(() => {
    if (!view) return { active: false as const };
    return getSlashMenuState(view.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, tick]);

  const filtered = useMemo(() => {
    if (!slashState.active) return slashMenuItems;
    const q = slashState.query.toLowerCase().trim();
    if (!q) return slashMenuItems;
    return slashMenuItems.filter((i) => matchesQuery(i, q));
  }, [slashState]);

  // Group filtered items in stable order (basic → lists → advanced).
  const grouped = useMemo(() => {
    const groups: { group: keyof typeof slashMenuGroupLabels; items: SlashMenuItem[] }[] = [];
    const order: (keyof typeof slashMenuGroupLabels)[] = ['basic', 'lists', 'advanced'];
    for (const g of order) {
      const items = filtered.filter((i) => i.group === g);
      if (items.length > 0) groups.push({ group: g, items });
    }
    return groups;
  }, [filtered]);

  // Flat list (in display order) so highlighted index → item is unambiguous.
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    setHighlighted(0);
  }, [slashState.active, flat.length]);

  // Keep highlighted item visible when navigating with arrow keys.
  useEffect(() => {
    const el = itemRefs.current[highlighted];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  useEffect(() => {
    if (!slashState.active || !view) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => (h + 1) % Math.max(1, flat.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => (h - 1 + flat.length) % Math.max(1, flat.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = flat[highlighted];
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
  }, [slashState, flat, highlighted, view]);

  // Position the menu next to the "/" using the actual DOM rect of the
  // paragraph that contains it. coordsAtPos() can return wrong values when
  // the paragraph is empty or just got created — the line's DOM rect is
  // far more reliable.
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (!slashState.active || !view) {
      setPos(null);
      return;
    }
    let lineLeft: number;
    let lineTop: number;
    let lineBottom: number;
    try {
      // Walk to the paragraph DOM node containing the slash.
      const dom = view.domAtPos(slashState.from);
      let el: HTMLElement | null = (dom.node as Node).nodeType === 1
        ? (dom.node as HTMLElement)
        : (dom.node.parentElement as HTMLElement | null);
      // Find the closest block-level container so we can anchor to its line.
      while (
        el &&
        el !== view.dom &&
        getComputedStyle(el).display === 'inline'
      ) {
        el = el.parentElement;
      }
      if (!el) throw new Error('no anchor');
      const rect = el.getBoundingClientRect();
      lineLeft = rect.left;
      lineTop = rect.top;
      lineBottom = rect.bottom;
    } catch {
      const rect = view.dom.getBoundingClientRect();
      lineLeft = rect.left + 4;
      lineTop = rect.top;
      lineBottom = rect.top + 22;
    }
    let left = lineLeft;
    let top = lineBottom + 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + MENU_WIDTH > vw - VIEWPORT_PADDING) {
      left = Math.max(VIEWPORT_PADDING, vw - MENU_WIDTH - VIEWPORT_PADDING);
    }
    if (left < VIEWPORT_PADDING) left = VIEWPORT_PADDING;
    if (top + MENU_MAX_HEIGHT > vh - VIEWPORT_PADDING) {
      // Flip above the line if there's no room below.
      top = Math.max(VIEWPORT_PADDING, lineTop - MENU_MAX_HEIGHT - 6);
    }
    setPos({ left, top });
  }, [slashState, view, tick]);

  if (!slashState.active || !view || !pos) return null;
  if (typeof document === 'undefined') return null;

  // Reset and rebuild ref array each render — flat order may change.
  itemRefs.current = [];

  let runningIndex = -1;

  return createPortal(
    <div
      ref={containerRef}
      role="listbox"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        width: MENU_WIDTH,
        maxHeight: MENU_MAX_HEIGHT,
        zIndex: 50,
      }}
      className="edit-tasks-popover overflow-y-auto rounded-lg bg-white border border-border shadow-[0_8px_24px_-4px_rgba(15,15,15,0.12),0_2px_6px_-2px_rgba(15,15,15,0.08)] p-1"
    >
      {flat.length === 0 && (
        <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
          Sin resultados
        </div>
      )}
      {grouped.map(({ group, items }) => (
        <div key={group} className="py-0.5">
          <div className="px-2 pt-2 pb-1 text-[10.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            {slashMenuGroupLabels[group]}
          </div>
          {items.map((item) => {
            runningIndex++;
            const idx = runningIndex;
            const isActive = idx === highlighted;
            const Icon = ICON_MAP[item.icon];
            return (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() =>
                  item.insert(view.state, view.dispatch.bind(view), slashState.from)
                }
                onMouseEnter={() => setHighlighted(idx)}
                className={cn(
                  'w-full flex items-start gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors',
                  isActive ? 'bg-[#eeeffc]' : 'hover:bg-[#f4f4f5]',
                )}
              >
                <span
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-md border shrink-0 mt-0.5',
                    isActive
                      ? 'bg-white border-[#d6d8f5] text-[#5e6ad2]'
                      : 'bg-white border-border text-foreground/70',
                  )}
                >
                  <Icon className="w-4 h-4" />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'block text-[13px] font-medium leading-tight',
                      isActive ? 'text-[#5e6ad2]' : 'text-foreground',
                    )}
                  >
                    {item.label}
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground leading-tight mt-0.5 truncate">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>,
    document.body,
  );
}
