'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink, Calendar, CalendarClock, CheckCircle2, Tag } from 'lucide-react';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { Sprint } from '@/schemas/sprint';
import type { TeamMember } from '@/schemas/team-member';
import { m } from '@/components/motion/m';

const PRIORITY_COLOR: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#5e6ad2',
  Low: '#8a8a91',
};

const PRIORITY_LABEL: Record<string, string> = {
  High: 'Alta',
  Medium: 'Media',
  Low: 'Baja',
};

function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority] ?? '#8a8a91';
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Low' ? 10 : 6}
        width="4"
        height={priority === 'Low' ? 12 : 16}
        opacity={priority === 'Low' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'High' ? 6 : 2}
        width="4"
        height={priority === 'High' ? 16 : 20}
        opacity={priority === 'High' ? 1 : 0.3}
      />
    </svg>
  );
}

const TAG_MAP: Record<string, string> = {
  Mobile: 'bg-[#eef4ff] text-[#3a5fcc]',
  Website: 'bg-[#f0f4e6] text-[#556c1d]',
  Improvement: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Marketing: 'bg-[#fceaea] text-[#a92f2f]',
  Research: 'bg-[#eeeffc] text-[#5e6ad2]',
  Branding: 'bg-[#faf0db] text-[#c78a2c]',
  Metrics: 'bg-[#e8f5ec] text-[#3f9f5c]',
  Meeting: 'bg-[#f7f7f8] text-[#57575c]',
  Email: 'bg-[#f7f7f8] text-[#57575c]',
  'Video production': 'bg-[#f4ecf8] text-[#7f3aa7]',
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  const distance = formatDistanceToNowStrict(d, { locale: es, addSuffix: true });
  const exact = format(d, "d 'de' MMM", { locale: es });
  return `${exact} · ${distance}`;
}

type CloseMode = 'back' | 'push';

type Props = {
  task: Task;
  blocks: any[];
  project?: Project | null;
  sprint?: Sprint | null;
  assignees?: TeamMember[];
  closeMode?: CloseMode;
};

export function TaskDrawer({
  task,
  blocks,
  project = null,
  sprint = null,
  assignees = [],
  closeMode = 'back',
}: Props) {
  const router = useRouter();

  function handleClose() {
    if (closeMode === 'push') {
      router.push('/tareas');
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/tareas');
    }
  }

  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <Sheet
      defaultOpen
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full sm:max-w-[560px] overflow-y-auto p-0 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border bg-white/95 backdrop-blur sticky top-0 z-10">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground mb-3">
            {project && (
              <>
                <Link
                  href={`/proyectos?project=${project.id}`}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {project.icon && <span className="text-[12px]">{project.icon}</span>}
                  <span className="font-medium">{project.name}</span>
                </Link>
                {sprint && <span className="text-border">·</span>}
              </>
            )}
            {sprint && <span>{sprint.name}</span>}
            {task.type && (
              <>
                {(project || sprint) && <span className="text-border">·</span>}
                <span>{task.type}</span>
              </>
            )}
          </div>

          <m.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: 0.12, ease: [0.32, 0.72, 0, 1] }}
          >
            <SheetTitle className="text-[22px] tracking-[-0.01em] leading-[1.25] font-semibold mb-3">
              {task.title}
            </SheetTitle>
          </m.div>

          <m.div
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18, delay: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center gap-2 flex-wrap"
          >
            <TaskStatusPill taskId={task.id} status={task.status} />
            {task.priority && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f7f7f8] text-[11px] font-medium text-[#57575c]">
                <PriorityBars priority={task.priority} />
                {PRIORITY_LABEL[task.priority] ?? task.priority}
              </span>
            )}
            {progressPct !== null && (
              <span className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="relative w-16 h-1.5 rounded-full bg-[#eeeff1] overflow-hidden">
                  <span
                    className="absolute inset-y-0 left-0 bg-[#5e6ad2]"
                    style={{ width: `${progressPct}%` }}
                  />
                </span>
                {progressPct}%
              </span>
            )}
          </m.div>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-6">
          {/* Meta grid */}
          <div className="grid grid-cols-[120px_1fr] gap-y-3 gap-x-4 text-[12.5px]">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Vencimiento
            </span>
            <span className={cn(!task.dueDate && 'text-muted-foreground')}>
              {task.dueDate ? formatRelative(task.dueDate) : '—'}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5" /> Planeado
            </span>
            <span className={cn(!task.plannedDate && 'text-muted-foreground')}>
              {task.plannedDate ? formatRelative(task.plannedDate) : '—'}
            </span>

            {task.completedAt && (
              <>
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                </span>
                <span>{formatRelative(task.completedAt)}</span>
              </>
            )}

            <span className="text-muted-foreground">Asignados</span>
            <span>
              {assignees.length > 0 ? (
                <span className="flex flex-wrap items-center gap-1.5">
                  {assignees.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1.5 bg-[#f7f7f8] rounded-full pl-0.5 pr-2 py-0.5"
                    >
                      <AssigneeAvatar member={m} size={18} />
                      <span className="text-[11px] font-medium">{m.name}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">Sin asignar</span>
              )}
            </span>

            <span className="text-muted-foreground flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Tags
            </span>
            <span>
              {task.tags.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {task.tags.map((t) => (
                    <span
                      key={t}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[11px] font-medium',
                        TAG_MAP[t] ?? 'bg-[#f7f7f8] text-[#57575c]',
                      )}
                    >
                      {t}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </span>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.04em] mb-2">
              Descripción
            </h3>
            {blocks.length > 0 ? (
              <div className="text-[13.5px]">
                <BlocksRenderer blocks={blocks} />
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-[#fafafa] flex items-center justify-between sticky bottom-0">
          <span className="text-[11px] text-muted-foreground">
            Esc para cerrar
          </span>
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Abrir en Notion <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
