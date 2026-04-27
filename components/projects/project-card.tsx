import Link from 'next/link';
import type { Project } from '@/schemas/project';
import { cn } from '@/lib/utils';
import {
  PROJECT_STATUS_STYLES,
  PROJECT_ACCENTS,
  PROJECT_ICON_BG,
} from '@/lib/projects/status';
import { Calendar, Users, FolderKanban } from 'lucide-react';

type Props = { project: Project; accentIndex: number };

export function ProjectCard({ project, accentIndex }: Props) {
  const s = project.status ? PROJECT_STATUS_STYLES[project.status] : null;
  const accent = PROJECT_ACCENTS[accentIndex % PROJECT_ACCENTS.length];
  const iconBg = PROJECT_ICON_BG[accentIndex % PROJECT_ICON_BG.length];

  const completionPct =
    typeof project.completion === 'number' ? Math.round(project.completion * 100) : null;

  return (
    <Link
      href={`/proyectos/${project.id}`}
      className="relative rounded-xl border border-border p-4 pt-4 bg-white transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-(--ease-linear) hover:-translate-y-px hover:shadow-md hover:border-[#c9cbe8] active:bg-[#fafbff] active:border-[#c9cbe8] block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', accent)} />

      <div className="flex flex-wrap items-start gap-2 sm:gap-2.5 mb-2 min-w-0">
        <div className={cn('w-7 h-7 rounded-md grid place-items-center text-[14px] shrink-0', iconBg)}>
          {project.icon ? <span>{project.icon}</span> : <FolderKanban className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.005em] truncate break-words">{project.name}</div>
        </div>
        {s && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[12px] sm:text-[11px] font-medium shrink-0',
              s.bg,
              s.text,
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            {project.status}
          </span>
        )}
      </div>

      {project.summary ? (
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2 min-h-[36px] break-words">
          {project.summary}
        </p>
      ) : (
        <div aria-hidden className="min-h-[36px] mb-3" />
      )}

      {completionPct !== null && (
        <div className="flex items-center gap-2.5 mb-3 min-w-0">
          <span className="text-[12px] sm:text-[11px] text-muted-foreground whitespace-nowrap">Avance</span>
          <div className="flex-1 h-1 bg-[#f7f7f8] rounded overflow-hidden min-w-0">
            <div
              className={cn('h-full rounded', s?.progress ?? 'bg-[#5e6ad2]')}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold min-w-[32px] text-right tabular-nums shrink-0">
            {completionPct}%
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-3 border-t border-dashed border-border text-[12px] sm:text-[11px] text-muted-foreground min-w-0">
        <span className="inline-flex items-center gap-1.5 shrink-0">
          <Users className="w-3 h-3 shrink-0" />
          {project.teamIds.length} en equipo
        </span>
        {project.endDate && (
          <span className="inline-flex items-center gap-1.5 shrink-0">
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(project.endDate).toLocaleDateString('es', { month: 'short', year: '2-digit' })}
          </span>
        )}
      </div>
    </Link>
  );
}
