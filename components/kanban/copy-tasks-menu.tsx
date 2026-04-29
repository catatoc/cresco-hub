'use client';

import { useState } from 'react';
import { Clipboard, Check, FileJson, FileText, Download } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { serializeTasksJson, serializeTasksMarkdown } from '@/lib/tasks/format-tasks';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  sprintLabel: string;
};

async function writeToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function sprintSlug(label: string): string {
  const m = label.match(/#(\d+)/);
  if (m) return `sprint-${m[1]}`;
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tareas';
}

function downloadJsonFile(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function CopyTasksMenu({ tasks, membersById, sprintLabel }: Props) {
  const [justCopied, setJustCopied] = useState(false);
  const count = tasks.length;
  const disabled = count === 0;

  function flashCheck() {
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1500);
  }

  async function handleCopyJson() {
    const json = serializeTasksJson(tasks, membersById);
    const ok = await writeToClipboard(json);
    if (ok) {
      flashCheck();
      toast.success(`${count} tareas copiadas como JSON`);
    } else {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  async function handleCopyMarkdown() {
    const md = serializeTasksMarkdown(tasks, membersById);
    const ok = await writeToClipboard(md);
    if (ok) {
      flashCheck();
      toast.success(`${count} tareas copiadas como Markdown`);
    } else {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  function handleDownload() {
    const json = serializeTasksJson(tasks, membersById);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `tareas-${sprintSlug(sprintLabel)}-${today}.json`;
    downloadJsonFile(json, filename);
    toast.success(`${count} tareas descargadas`);
  }

  const tooltipText = disabled ? 'No hay tareas para copiar' : 'Copiar tareas visibles';

  return (
    <TooltipProvider delay={200}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label="Copiar tareas visibles"
                disabled={disabled}
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e5e7eb] bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors',
                  disabled && 'opacity-50 cursor-not-allowed hover:text-gray-500 hover:bg-white',
                )}
              >
                {justCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Clipboard className="w-3.5 h-3.5" />
                )}
              </DropdownMenuTrigger>
            }
          />
          <TooltipContent side="bottom">{tooltipText}</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-[230px]">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[11px] font-normal text-gray-500">
              Copiar {count} tareas visibles
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyJson} className="flex items-center gap-2">
              <FileJson className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">Como JSON</span>
              <span className="ml-auto text-[11px] text-gray-400">para MCP</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyMarkdown} className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">Como Markdown</span>
              <span className="ml-auto text-[11px] text-gray-400">para Linear</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">Descargar .json</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
