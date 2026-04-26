import type { Project } from '@/schemas/project';
import { cn } from '@/lib/utils';
import { Calendar, Users, FolderKanban } from 'lucide-react';

// Full 6-status map aligned with Notion Project Status enum.
const STATUS: Record<string, { bg: string; text: string; dot: string; progress: string }> = {
  Backlog:       { bg: 'bg-white border border-border', text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]', progress: 'bg-[#a0a0a8]' },
  Planning:      { bg: 'bg-[#eeeffc]', text: 'text-[#5e6ad2]',                          dot: 'bg-[#5e6ad2]', progress: 'bg-[#5e6ad2]' },
  'In Progress': { bg: 'bg-[#eff6ff]', text: 'text-[#3a5fcc]',                          dot: 'bg-[#3a5fcc]', progress: 'bg-[#3a5fcc]' },
  Paused:        { bg: 'bg-[#faf0db]', text: 'text-[#c78a2c]',                          dot: 'bg-[#c78a2c]', progress: 'bg-[#c78a2c]' },
  Done:          { bg: 'bg-[#e8f5ec]', text: 'text-[#3f9f5c]',                          dot: 'bg-[#3f9f5c]', progress: 'bg-[#3f9f5c]' },
  Canceled:      { bg: 'bg-[#fceaea]', text: 'text-[#d24949]',                          dot: 'bg-[#d24949]', progress: 'bg-[#d24949]' },
};

const ACCENTS = [
  'from-[#5e6ad2] to-[#7c5fd0]',
  'from-[#c78a2c] to-[#d24949]',
  'from-[#3f9f5c] to-[#6da88e]',
  'from-[#8ba1d9] to-[#a07ac9]',
];

const ICON_BG = [
  'bg-[#eeeffc] text-[#5e6ad2]',
  'bg-[#faf0db] text-[#c78a2c]',
  'bg-[#e8f5ec] text-[#3f9f5c]',
  'bg-[#f4ecf8] text-[#7f3aa7]',
];

type Props = { project: Project; accentIndex: number };

export function ProjectCard({ project, accentIndex }: Props) {
  const s = project.status ? STATUS[project.status] : null;
  const accent = ACCENTS[accentIndex % ACCENTS.length];
  const iconBg = ICON_BG[accentIndex % ICON_BG.length];

  const completionPct =
    typeof project.completion === 'number' ? Math.round(project.completion * 100) : null;

  return (
    <a
      href={project.url}
      target="_blank"
      rel="noreferrer"
      className="relative rounded-xl border border-border p-4 pt-4 bg-white transition-[transform,box-shadow,border-color] duration-(--duration-base) ease-(--ease-linear) hover:-translate-y-px hover:shadow-md hover:border-[#c9cbe8] block overflow-hidden"
    >
      <div className={cn('absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r', accent)} />

      <div className="flex items-start gap-2.5 mb-2">
        <div className={cn('w-7 h-7 rounded-md grid place-items-center text-[14px] shrink-0', iconBg)}>
          {project.icon ? <span>{project.icon}</span> : <FolderKanban className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold tracking-[-0.005em] truncate">{project.name}</div>
        </div>
        {s && (
          <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium shrink-0', s.bg, s.text)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
            {project.status}
          </span>
        )}
      </div>

      {project.summary && (
        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2 min-h-[36px]">
          {project.summary}
        </p>
      )}

      {completionPct !== null && (
        <div className="flex items-center gap-2.5 mb-3">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">Avance</span>
          <div className="flex-1 h-1 bg-[#f7f7f8] rounded overflow-hidden">
            <div
              className={cn('h-full rounded', s?.progress ?? 'bg-[#5e6ad2]')}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-[12px] font-semibold min-w-[32px] text-right">{completionPct}%</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-dashed border-border text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Users className="w-3 h-3" />
          {project.teamIds.length} en equipo
        </span>
        {project.endDate && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {new Date(project.endDate).toLocaleDateString('es', { month: 'short', year: '2-digit' })}
          </span>
        )}
      </div>
    </a>
  );
}
