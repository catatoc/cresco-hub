import Link from 'next/link';
import { format, isToday, isPast } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';
import { dateLocale } from '@/lib/i18n/date-locale';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import { cn } from '@/lib/utils';
import { AssigneeStack } from '@/components/kanban/card';
import { OpenWithClaudeMenu } from '@/components/common/open-with-claude-menu';

const PRIORITY_FILL: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#8a8a91',
  Low: '#8a8a91',
};

function PriorityIcon({ priority }: { priority: Task['priority'] }) {
  if (!priority) return <span className="w-2.5" />;
  const color = PRIORITY_FILL[priority];
  return (
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect x="10" y="6" width="4" height="16" opacity={priority === 'Low' ? 0.3 : 1} />
      <rect x="18" y="2" width="4" height="20" opacity={priority === 'High' ? 1 : 0.3} />
    </svg>
  );
}

function DueCell({ dueDate }: { dueDate: string | null }) {
  const t = useTranslations('home.myTasks');
  const locale = useLocale();
  if (!dueDate) return <span className="text-[11px] text-muted-foreground">—</span>;
  const d = new Date(dueDate);
  const fmt = format(d, t('dueFormat'), { locale: dateLocale(locale) });
  if (isToday(d)) return <span className="text-[11px] font-medium text-[#5e6ad2]">{t('today')}</span>;
  if (isPast(d)) return <span className="text-[11px] font-medium text-[#d24949]">{fmt}</span>;
  return <span className="text-[11px] text-muted-foreground">{fmt}</span>;
}

function TagChip({ tag }: { tag: string }) {
  const map: Record<string, string> = {
    Mobile: 'bg-[#eef4ff] text-[#3a5fcc]',
    Website: 'bg-[#f0f4e6] text-[#556c1d]',
    Improvement: 'bg-[#f4ecf8] text-[#7f3aa7]',
    Marketing: 'bg-[#fceaea] text-[#a92f2f]',
    Research: 'bg-[#eeeffc] text-[#5e6ad2]',
    Branding: 'bg-[#faf0db] text-[#c78a2c]',
  };
  return <span className={cn('px-1.5 rounded text-[11px] font-medium', map[tag] ?? 'bg-[#f7f7f8] text-[#57575c]')}>{tag}</span>;
}

type Props = {
  tasks: Task[];
  membersById: Map<string, TeamMember>;
  projectsById: Map<string, Project>;
};

export function MyTasks({ tasks, membersById, projectsById }: Props) {
  const t = useTranslations('home.myTasks');
  if (tasks.length === 0) {
    return (
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
          <h2 className="text-[13px] font-semibold flex items-baseline gap-2 min-w-0 truncate">
            <span className="shrink-0">{t('title')}</span>
            <span className="text-[12px] font-normal text-muted-foreground truncate hidden sm:inline">
              · {t('subtitle')}
            </span>
          </h2>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex items-baseline justify-between gap-3 mb-3 min-w-0">
        <h2 className="text-[13px] font-semibold flex items-baseline gap-2 min-w-0 truncate">
          <span className="shrink-0">{t('title')}</span>
          <span className="text-[12px] font-normal text-muted-foreground truncate hidden sm:inline">
            · {t('subtitle')}
          </span>
        </h2>
        <Link
          href="/tareas"
          className="shrink-0 text-[12px] text-muted-foreground hover:text-[#5e6ad2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          {t('seeAll')}
        </Link>
      </div>
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        {tasks.map((task, i) => {
          const assignees = task.assigneeIds
            .map((id) => membersById.get(id))
            .filter((m): m is TeamMember => !!m);
          return (
            <div
              key={task.id}
              className={cn(
                'relative flex items-center gap-2.5 px-3 sm:px-3.5 py-3 sm:py-2.5 min-h-[44px] sm:min-h-0 hover:bg-[#f7f7f8] active:bg-[#f0f0f1] transition-colors',
                i < tasks.length - 1 && 'border-b border-border',
              )}
            >
              <Link
                href={`/tareas/${task.id}`}
                className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                aria-label={task.title}
              />
              <span
                className={cn(
                  'relative w-3.5 h-3.5 rounded-full border-[1.5px] shrink-0',
                  task.status === 'Done' && 'bg-[#3f9f5c] border-[#3f9f5c]',
                  task.status === 'In Progress' && 'border-[#5e6ad2]',
                  (task.status === 'Not Started' || task.status === 'Refining') && 'border-muted-foreground',
                )}
                style={
                  task.status === 'In Progress'
                    ? { background: 'conic-gradient(#5e6ad2 0 60%, transparent 60% 100%)' }
                    : undefined
                }
              />
              <span className="relative inline-flex">
                <PriorityIcon priority={task.priority} />
              </span>
              <span className="relative text-[13px] flex-1 min-w-0 truncate">{task.title}</span>
              {task.tags[0] && (
                <span className="relative hidden sm:inline">
                  <TagChip tag={task.tags[0]} />
                </span>
              )}
              <span className="relative hidden sm:inline shrink-0">
                <DueCell dueDate={task.dueDate} />
              </span>
              <div className="relative shrink-0 min-w-[20px]">
                <AssigneeStack assignees={assignees} size={20} />
              </div>
              <div className="relative shrink-0">
                <OpenWithClaudeMenu
                  variant="row"
                  task={task}
                  project={task.projectId ? (projectsById.get(task.projectId) ?? null) : null}
                  description=""
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
