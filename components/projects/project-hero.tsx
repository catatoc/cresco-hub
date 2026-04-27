import { FolderKanban, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Project, ProjectPriority } from '@/schemas/project';
import {
  PROJECT_STATUS_STYLES,
  PROJECT_ACCENTS,
  PROJECT_ICON_BG,
} from '@/lib/projects/status';
import { NewTaskButton } from './new-task-button';

const PRIORITY_STYLES: Record<ProjectPriority, { bg: string; text: string; dot: string }> = {
  Low:    { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  Medium: { bg: 'bg-[#faf0db]',  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]' },
  High:   { bg: 'bg-[#fceaea]',  text: 'text-[#d24949]',         dot: 'bg-[#d24949]' },
};

type Props = { project: Project; accentIndex: number };

export function ProjectHero({ project, accentIndex }: Props) {
  const status = project.status ? PROJECT_STATUS_STYLES[project.status] : null;
  const priority = project.priority ? PRIORITY_STYLES[project.priority] : null;
  const accent = PROJECT_ACCENTS[accentIndex % PROJECT_ACCENTS.length];
  const iconBg = PROJECT_ICON_BG[accentIndex % PROJECT_ICON_BG.length];

  return (
    <div className="relative bg-white border border-border rounded-xl overflow-hidden mb-4">
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', accent)} />
      <div className="px-5 sm:px-6 pt-5 pb-4">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className={cn('w-12 h-12 rounded-lg grid place-items-center text-[24px] shrink-0', iconBg)}>
            {project.icon ?? <FolderKanban className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] truncate min-w-0">
                {project.name}
              </h1>
              {status && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0',
                    status.bg,
                    status.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', status.dot)} />
                  {project.status}
                </span>
              )}
              {priority && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0',
                    priority.bg,
                    priority.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
                  {project.priority}
                </span>
              )}
            </div>
            {project.summary && (
              <p className="text-[13px] text-foreground/80 leading-relaxed max-w-[68ch]">
                {project.summary}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NewTaskButton />
            <a
              href={project.url}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir en Notion"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-black/[0.04] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
