import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import type { Task, TaskStatus } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import type { Project } from '@/schemas/project';
import { AssigneeStack } from '@/components/kanban/card';
import { cn } from '@/lib/utils';

const STATUS_CLS: Record<TaskStatus, string> = {
  Refining: 'bg-[#f7f7f8] text-muted-foreground',
  'Not Started': 'bg-[#f7f7f8] text-[#57575c]',
  'In Progress': 'bg-[#eeeffc] text-[#5e6ad2]',
  Testing: 'bg-[#fef9e7] text-[#b58a1f]',
  'In Review': 'bg-[#faf0db] text-[#c78a2c]',
  Done: 'bg-[#e8f5ec] text-[#3f9f5c]',
  Archived: 'bg-[#f7f7f8] text-muted-foreground',
};

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  projectsById: Map<string, Project>;
};

export function UpcomingTaskList({ tasks, membersById, projectsById }: Props) {
  const t = useTranslations('upcoming');
  const locale = useLocale();

  const fmt = (iso: string | null): string | null =>
    iso ? format(parseISO(iso), t('taskList.dateFormat'), { locale: dateLocale(locale) }) : null;

  if (tasks.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
        {t('taskList.empty')}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg bg-white overflow-hidden">
      {tasks.map((task, i) => {
        const assignees = task.assigneeIds
          .map((id) => membersById.get(id))
          .filter((m): m is TeamMember => !!m);
        const project = task.projectId ? projectsById.get(task.projectId) : null;
        const planned = fmt(task.plannedDate);
        const due = fmt(task.dueDate);
        const range = planned && due ? `${planned} → ${due}` : (planned ?? due);

        return (
          <div
            key={task.id}
            className={cn(
              'relative p-3 sm:p-4 hover:bg-[#f7f7f8] transition-colors',
              i < tasks.length - 1 && 'border-b border-border',
            )}
          >
            <Link href={`/tareas/${task.id}`} className="absolute inset-0" aria-label={task.title} />
            <div className="relative flex items-start justify-between gap-3 pointer-events-none">
              <div className="min-w-0">
                <div className="text-[13px] font-medium mb-1.5">{task.title}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                  <span className={cn('px-1.5 py-0.5 rounded font-medium', STATUS_CLS[task.status])}>
                    {t(`status.${task.status}`)}
                  </span>
                  {task.type && (
                    <span className="px-1.5 py-0.5 rounded bg-[#f7f7f8] text-[#57575c]">
                      {task.type}
                    </span>
                  )}
                  {task.priority && (
                    <span className="text-muted-foreground">
                      {t('taskList.priority', { label: t(`priority.${task.priority}`) })}
                    </span>
                  )}
                  {project && (
                    <span className="text-muted-foreground truncate">· {project.name}</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {range && <span className="text-[11px] text-muted-foreground">{range}</span>}
                <AssigneeStack assignees={assignees} size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
