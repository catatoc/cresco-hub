import { Calendar, CalendarClock, CheckCircle2, Tag } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { cn } from '@/lib/utils';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { TeamMember } from '@/schemas/team-member';

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

function formatRelative(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return 'Hoy';
  if (isTomorrow(d)) return 'Mañana';
  if (isYesterday(d)) return 'Ayer';
  const distance = formatDistanceToNowStrict(d, { locale: es, addSuffix: true });
  const exact = format(d, "d 'de' MMM", { locale: es });
  return `${exact} · ${distance}`;
}

type Props = {
  task: Task;
  project: Project | null;
  assignees: TeamMember[];
};

export function TaskDetailMetaPanel({ task, project, assignees }: Props) {
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  return (
    <aside className="border-l border-border bg-[#fafafa] p-5 overflow-y-auto">
      <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground mb-3">
        Propiedades
      </div>

      <div className="flex flex-col gap-3.5 text-[12px]">
        <Field label="Estado">
          <TaskStatusPill taskId={task.id} status={task.status} />
        </Field>

        {task.priority && (
          <Field label="Prioridad">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f7f7f8] text-[11px] font-medium text-[#57575c]">
              <PriorityBars priority={task.priority} />
              {PRIORITY_LABEL[task.priority] ?? task.priority}
            </span>
          </Field>
        )}

        {progressPct !== null && (
          <Field label="Progreso">
            <span className="inline-flex items-center gap-2 text-[11px] text-foreground">
              <span className="relative w-20 h-1.5 rounded-full bg-[#eeeff1] overflow-hidden">
                <span
                  className="absolute inset-y-0 left-0 bg-[#5e6ad2]"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
              {progressPct}%
            </span>
          </Field>
        )}

        <Field label="Vencimiento" icon={<Calendar className="w-3 h-3" />}>
          <span className={cn(!task.dueDate && 'text-muted-foreground')}>
            {task.dueDate ? formatRelative(task.dueDate) : '—'}
          </span>
        </Field>

        <Field label="Planeado" icon={<CalendarClock className="w-3 h-3" />}>
          <span className={cn(!task.plannedDate && 'text-muted-foreground')}>
            {task.plannedDate ? formatRelative(task.plannedDate) : '—'}
          </span>
        </Field>

        {task.completedAt && (
          <Field label="Completado" icon={<CheckCircle2 className="w-3 h-3" />}>
            <span>{formatRelative(task.completedAt)}</span>
          </Field>
        )}

        <Field label="Asignados">
          {assignees.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              {assignees.map((member) => (
                <span key={member.id} className="inline-flex items-center gap-2">
                  <AssigneeAvatar member={member} size={18} />
                  <span className="text-[11.5px] font-medium">{member.name}</span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">Sin asignar</span>
          )}
        </Field>

        {task.tags.length > 0 && (
          <Field label="Tags" icon={<Tag className="w-3 h-3" />}>
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
          </Field>
        )}

        {project && (
          <Field label="Proyecto">
            <Link
              href={`/proyectos?project=${project.id}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#5e6ad2] hover:underline"
            >
              {project.icon && <span>{project.icon}</span>}
              {project.name}
            </Link>
          </Field>
        )}
      </div>
    </aside>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
        {icon}
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}
