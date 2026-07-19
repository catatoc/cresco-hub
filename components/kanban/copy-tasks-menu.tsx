'use client';

import { useState } from 'react';
import { Clipboard, Check, FileJson, FileText, Download, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

async function fetchTaskContent(taskId: string): Promise<string> {
  const res = await fetch(`/api/tasks/${taskId}/blocks`, { method: 'GET' });
  if (!res.ok) throw new Error(`fetch-content-failed:${res.status}`);
  const data = (await res.json()) as { content: string };
  return data.content;
}

async function fetchAllContents(tasks: Task[]): Promise<Map<string, string>> {
  const entries = await Promise.all(
    tasks.map(async (t) => [t.id, await fetchTaskContent(t.id)] as const),
  );
  return new Map(entries);
}

export function CopyTasksMenu({ tasks, membersById, sprintLabel }: Props) {
  const t = useTranslations('kanban.copy');
  const [justCopied, setJustCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const count = tasks.length;
  const triggerDisabled = count === 0 || loading;

  function flashCheck() {
    setJustCopied(true);
    window.setTimeout(() => setJustCopied(false), 1500);
  }

  async function handleCopyJson() {
    const json = serializeTasksJson(tasks, membersById);
    const ok = await writeToClipboard(json);
    if (ok) {
      flashCheck();
      toast.success(t('copiedJson', { count }));
    } else {
      toast.error(t('copyFailed'));
    }
  }

  async function handleCopyMarkdown() {
    const md = serializeTasksMarkdown(tasks, membersById);
    const ok = await writeToClipboard(md);
    if (ok) {
      flashCheck();
      toast.success(t('copiedMarkdown', { count }));
    } else {
      toast.error(t('copyFailed'));
    }
  }

  function handleDownload() {
    const json = serializeTasksJson(tasks, membersById);
    const today = new Date().toISOString().slice(0, 10);
    const filename = `tareas-${sprintSlug(sprintLabel)}-${today}.json`;
    downloadJsonFile(json, filename);
    toast.success(t('downloaded', { count }));
  }

  async function handleCopyWithContent(format: 'json' | 'markdown') {
    setLoading(true);
    const loadingToast = toast.loading(t('loadingContent', { count }));
    try {
      const contentMap = await fetchAllContents(tasks);
      const text = format === 'json'
        ? serializeTasksJson(tasks, membersById, contentMap)
        : serializeTasksMarkdown(tasks, membersById, contentMap);
      const ok = await writeToClipboard(text);
      toast.dismiss(loadingToast);
      if (ok) {
        flashCheck();
        const label = format === 'json' ? 'JSON' : 'Markdown';
        toast.success(t('copiedWithContent', { count, format: label }));
      } else {
        toast.error(t('copyFailed'));
      }
    } catch {
      toast.dismiss(loadingToast);
      toast.error(t('loadContentFailed'));
    } finally {
      setLoading(false);
    }
  }

  const tooltipText = count === 0
    ? t('empty')
    : loading
    ? t('loading')
    : t('trigger');

  return (
    <TooltipProvider delay={200}>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger
            render={
              <DropdownMenuTrigger
                aria-label={t('trigger')}
                disabled={triggerDisabled}
                className={cn(
                  'inline-flex items-center justify-center w-7 h-7 rounded-md border border-[#e5e7eb] bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors',
                  triggerDisabled && 'opacity-50 cursor-not-allowed hover:text-gray-500 hover:bg-white',
                )}
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : justCopied ? (
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
              {t('menuLabel', { count })}
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={handleCopyJson} className="flex items-center gap-2">
              <FileJson className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">{t('asJson')}</span>
              <span className="ml-auto text-[11px] text-gray-400">{t('asJsonHint')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyMarkdown} className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">{t('asMarkdown')}</span>
              <span className="ml-auto text-[11px] text-gray-400">{t('asMarkdownHint')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-normal text-gray-500">
              {t('withContentLabel')}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => handleCopyWithContent('json')}
              className="flex items-center gap-2"
            >
              <FileJson className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">{t('withContentJson')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleCopyWithContent('markdown')}
              className="flex items-center gap-2"
            >
              <FileText className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">{t('withContentMarkdown')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDownload} className="flex items-center gap-2">
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span className="font-medium">{t('download')}</span>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
