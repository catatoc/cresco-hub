import { Calendar, CalendarClock, CheckCircle2, Tag } from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { AssigneeAvatar } from '@/components/kanban/card';
import { TaskStatusPill } from '@/components/kanban/task-status-pill';
import { dateLocale } from '@/lib/i18n/date-locale';
import { cn } from '@/lib/utils';
import { PRIORITY_KEY, TAG_MAP, PriorityBars } from './task-detail-shared';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { TeamMember } from '@/schemas/team-member';

type Props = {
  task: Task;
  project: Project | null;
  assignees: TeamMember[];
};

export function TaskDetailMetaPanel({ task, project, assignees }: Props) {
  const t = useTranslations('kanban.taskDetail');
  const tPriority = useTranslations('kanban.priority');
  const locale = useLocale();
  const progressPct =
    typeof task.progress === 'number' ? Math.round(task.progress * 100) : null;

  function formatRelative(iso: string): string {
    const d = parseISO(iso);
    if (isToday(d)) return t('today');
    if (isTomorrow(d)) return t('tomorrow');
    if (isYesterday(d)) return t('yesterday');
    const distance = formatDistanceToNowStrict(d, { locale: dateLocale(locale), addSuffix: true });
    const exact = format(d, t('relativeDateFormat'), { locale: dateLocale(locale) });
    return `${exact} · ${distance}`;
  }

  return (
    <aside className="border-l border-border bg-[#fafafa] p-5 overflow-y-auto">
      <div className="text-[10px] font-bold uppercase tracking-[0.04em] text-muted-foreground mb-3">
        {t('properties')}
      </div>

      <div className="flex flex-col gap-3.5 text-[12px]">
        <Field label={t('status')}>
          <TaskStatusPill taskId={task.id} status={task.status} />
        </Field>

        {task.priority && (
          <Field label={t('priority')}>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#f7f7f8] text-[11px] font-medium text-[#57575c]">
              <PriorityBars priority={task.priority} />
              {(() => {
                const key = PRIORITY_KEY[task.priority];
                return key ? tPriority(key) : task.priority;
              })()}
            </span>
          </Field>
        )}

        {progressPct !== null && (
          <Field label={t('progress')}>
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

        <Field label={t('dueDate')} icon={<Calendar className="w-3 h-3" />}>
          <span className={cn(!task.dueDate && 'text-muted-foreground')}>
            {task.dueDate ? formatRelative(task.dueDate) : '—'}
          </span>
        </Field>

        <Field label={t('plannedDate')} icon={<CalendarClock className="w-3 h-3" />}>
          <span className={cn(!task.plannedDate && 'text-muted-foreground')}>
            {task.plannedDate ? formatRelative(task.plannedDate) : '—'}
          </span>
        </Field>

        {task.completedAt && (
          <Field label={t('completedAt')} icon={<CheckCircle2 className="w-3 h-3" />}>
            <span>{formatRelative(task.completedAt)}</span>
          </Field>
        )}

        <Field label={t('assignees')}>
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
            <span className="text-muted-foreground">{t('unassigned')}</span>
          )}
        </Field>

        {task.tags.length > 0 && (
          <Field label={t('tags')} icon={<Tag className="w-3 h-3" />}>
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
          <Field label={t('project')}>
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
