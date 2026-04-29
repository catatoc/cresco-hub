'use client';

import { ChevronDown, SquareTerminal, Clipboard, ExternalLink, TerminalSquare } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { buildPrompt } from '@/lib/claude-code/build-prompt';
import { buildCliCommand } from '@/lib/claude-code/build-cli-command';
import { openWithClaudeCode } from '@/lib/claude-code/open-with-claude-code';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';

export type OpenWithClaudeVariant = 'row' | 'card' | 'cta';

type Props = {
  task: Task;
  project: Project | null;
  description: string;
  variant?: OpenWithClaudeVariant;
  className?: string;
};

const TRIGGER_LABEL = 'Open in Claude Code';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // eslint-disable-next-line no-console
    console.info('[open-with-claude-menu] clipboard fallback:\n', text);
    return false;
  }
}

export function OpenWithClaudeMenu({
  task,
  project,
  description,
  variant = 'cta',
  className,
}: Props) {
  async function handleCopyPrompt() {
    const prompt = buildPrompt({ task, project, description });
    const ok = await copyToClipboard(prompt);
    if (ok) {
      toast.success('Prompt copiado al portapapeles', {
        description: 'Pégalo en Claude Code, ChatGPT, Cursor, o tu terminal.',
      });
    } else {
      toast.error('No se pudo copiar el prompt', {
        description: 'Hay un fallback en la consola del navegador.',
      });
    }
  }

  function handleOpenInClaude() {
    void openWithClaudeCode({ task, project, description });
  }

  async function handleCopyCli() {
    const prompt = buildPrompt({ task, project, description });
    const cmd = buildCliCommand({ prompt, repoPath: null });
    const ok = await copyToClipboard(cmd);
    if (ok) {
      toast.success('Comando copiado al portapapeles', {
        description: 'Pégalo en tu terminal local. Si tienes el repo, agrega `cd <ruta> && ` delante.',
      });
    } else {
      toast.error('No se pudo copiar el comando', {
        description: 'Hay un fallback en la consola del navegador.',
      });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={TRIGGER_LABEL}
        className={cn(
          // base — focus ring + transitions shared by all variants
          'transition-[transform,filter,background-color,color,border-color] duration-(--duration-fast) ease-(--ease-linear)',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c15f3c]',
          // CTA gradient pill
          variant === 'cta' && [
            'inline-flex items-center gap-1 px-2.5 py-2 min-h-[40px] sm:min-h-0 rounded-md',
            'text-[12px] font-medium text-white',
            'bg-[linear-gradient(135deg,#c15f3c_0%,#d97a4f_100%)] shadow-[0_1px_2px_rgba(193,95,60,.25)]',
            'hover:brightness-105 active:scale-[0.98]',
          ],
          // Row + card share the icon-only style
          (variant === 'row' || variant === 'card') && [
            'inline-grid place-items-center rounded-md text-muted-foreground shrink-0',
            'border border-transparent',
            'hover:text-[#c15f3c] hover:border-[#f5d4bb] hover:bg-[linear-gradient(135deg,#fef3ec_0%,#ffe8db_100%)]',
          ],
          variant === 'row' && 'w-9 h-9 sm:w-[26px] sm:h-[26px]',
          variant === 'card' && 'w-[22px] h-[22px]',
          className,
        )}
      >
        <SquareTerminal
          className={cn(
            variant === 'cta' && 'w-3.5 h-3.5',
            variant === 'row' && 'w-[14px] h-[14px]',
            variant === 'card' && 'w-[13px] h-[13px]',
          )}
          aria-hidden
        />
        {variant === 'cta' && <ChevronDown className="w-3 h-3 opacity-90" aria-hidden />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <DropdownMenuItem onClick={handleCopyPrompt} className="flex items-center gap-2 text-[12.5px]">
          <Clipboard className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <span className="flex-1">Copy as prompt</span>
          <kbd className="font-mono text-[10px] bg-[#eef0f2] rounded px-1 py-[1px] text-muted-foreground">⌘⌥P</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenInClaude} className="flex items-center gap-2 text-[12.5px]">
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <span className="flex-1">Open in Claude Code</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyCli} className="flex items-center gap-2 text-[12.5px]">
          <TerminalSquare className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
          <span className="flex-1">Copy CLI command</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
