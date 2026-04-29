// components/common/open-with-claude-button.tsx
'use client';

import { SquareTerminal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { openWithClaudeCode } from '@/lib/claude-code/open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

export type OpenWithClaudeVariant = 'row' | 'card' | 'cta';

type Props = {
  variant: OpenWithClaudeVariant;
  task: Task;
  project: Project | null;
  /**
   * Plain-text description. Pass an empty string from list/kanban
   * surfaces — they don't have Notion blocks loaded. The detail
   * surface should pass the extracted text.
   */
  description: string;
  className?: string;
};

const ARIA_LABEL = 'Abrir con Claude Code';

export function OpenWithClaudeButton({ variant, task, project, description, className }: Props) {
  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    void openWithClaudeCode({ task, project, description });
  }

  if (variant === 'cta') {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label={ARIA_LABEL}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] sm:min-h-0 rounded-md',
          'text-[12px] font-medium text-white',
          'bg-[linear-gradient(135deg,#c15f3c_0%,#d97a4f_100%)] shadow-[0_1px_2px_rgba(193,95,60,.25)]',
          'transition-[transform,filter] duration-(--duration-fast) ease-(--ease-linear)',
          'hover:brightness-105 active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c15f3c]',
          className,
        )}
      >
        <SquareTerminal className="w-3.5 h-3.5" aria-hidden />
        Abrir con Claude Code
      </button>
    );
  }

  // row + card share the icon-only style; sizing differs slightly.
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ARIA_LABEL}
      className={cn(
        'inline-grid place-items-center rounded-md text-muted-foreground shrink-0',
        'transition-[background-color,color,border-color] duration-(--duration-fast) ease-(--ease-linear)',
        'border border-transparent',
        'hover:text-[#c15f3c] hover:border-[#f5d4bb] hover:bg-[linear-gradient(135deg,#fef3ec_0%,#ffe8db_100%)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c15f3c]',
        variant === 'row' && 'w-9 h-9 sm:w-[26px] sm:h-[26px]',
        variant === 'card' && 'w-[22px] h-[22px]',
        className,
      )}
    >
      <SquareTerminal
        className={cn(variant === 'row' ? 'w-[14px] h-[14px]' : 'w-[13px] h-[13px]')}
        aria-hidden
      />
    </button>
  );
}
