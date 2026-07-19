import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TaskEditorContainer } from '@/components/edit-tasks/task-editor-container';
import { PageEnter } from '@/components/motion/page-enter';
import { TaskDetailHeader } from './task-detail-header';
import { TaskDetailMetaPanel } from './task-detail-meta-panel';
import { TaskDetailMetaStrip } from './task-detail-meta-strip';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OpenWithClaudeMenu } from '@/components/common/open-with-claude-menu';
import { extractPlainText } from '@/lib/claude-code/extract-plain-text';
import { TaskDetailShortcuts } from './task-detail-shortcuts';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { Sprint } from '@/schemas/sprint';
import type { TeamMember } from '@/schemas/team-member';

type Props = {
  task: Task;
  blocks: any[];
  project: Project | null;
  sprint: Sprint | null;
  assignees: TeamMember[];
};

export function TaskDetail({ task, blocks, project, sprint, assignees }: Props) {
  const t = useTranslations('kanban.taskDetail');
  const crumbs = [
    ...(project ? [{ label: project.name, href: `/proyectos?project=${project.id}` }] : []),
    ...(sprint ? [{ label: sprint.name }] : []),
    ...(task.type ? [{ label: task.type }] : []),
  ];

  const description = extractPlainText(blocks);

  return (
    <article className="flex flex-col h-full overflow-hidden">
      <TaskDetailShortcuts task={task} project={project} description={description} />
      <TaskDetailHeader crumbs={crumbs} />

      <TaskDetailMetaStrip task={task} assignees={assignees} project={project} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        {/* Main column */}
        <div className="overflow-y-auto bg-white min-w-0">
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8">
            <h1
              tabIndex={-1}
              className="text-[20px] sm:text-[22px] lg:text-[26px] font-semibold tracking-[-0.015em] leading-[1.2] mb-3 outline-none break-words"
              style={{ viewTransitionName: `task-${task.id}-title` } as React.CSSProperties}
            >
              {task.title}
            </h1>

            <hr className="border-border mt-5 sm:mt-6 mb-5 sm:mb-6" />

            <PageEnter delay={120}>
              <div className="text-[14px]">
                <TaskEditorContainer blocks={blocks} taskId={task.id} />
              </div>
            </PageEnter>
          </div>
        </div>

        {/* Meta panel (lg+) */}
        <div className="hidden lg:block">
          <TaskDetailMetaPanel task={task} project={project} assignees={assignees} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-6 py-2 sm:py-2.5 border-t border-border bg-[#fafafa] flex items-center justify-between gap-3 flex-wrap shrink-0">
        <span className="hidden sm:inline text-[11px] text-muted-foreground">
          {t('escToReturn')} · <kbd className="font-mono text-[10px] bg-[#eef0f2] rounded px-1 py-[1px]">⌘⌥P</kbd> {t('copyPromptHint')}
        </span>
        <div className="flex items-center gap-2 ml-auto">
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'min-h-[40px] sm:min-h-0')}
          >
            {t('openInNotion')} <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
          <OpenWithClaudeMenu
            task={task}
            project={project}
            description={description}
          />
        </div>
      </div>
    </article>
  );
}
