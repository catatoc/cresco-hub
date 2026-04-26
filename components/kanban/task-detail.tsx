import { ExternalLink } from 'lucide-react';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { PageEnter } from '@/components/motion/page-enter';
import { TaskDetailHeader } from './task-detail-header';
import { TaskDetailMetaPanel } from './task-detail-meta-panel';
import { TaskDetailMetaStrip } from './task-detail-meta-strip';
import { buttonVariants } from '@/components/ui/button';
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
  const crumbs = [
    ...(project ? [{ label: project.name, href: `/proyectos?project=${project.id}` }] : []),
    ...(sprint ? [{ label: sprint.name }] : []),
    ...(task.type ? [{ label: task.type }] : []),
  ];

  return (
    <article className="flex flex-col h-full overflow-hidden">
      <TaskDetailHeader crumbs={crumbs} />

      <TaskDetailMetaStrip task={task} assignees={assignees} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        {/* Main column */}
        <div className="overflow-y-auto bg-white">
          <div className="max-w-[720px] mx-auto px-8 py-8">
            <h1
              tabIndex={-1}
              className="text-[26px] font-semibold tracking-[-0.015em] leading-[1.2] mb-3 outline-none"
              style={{ viewTransitionName: `task-${task.id}-title` } as React.CSSProperties}
            >
              {task.title}
            </h1>

            <hr className="border-border mt-6 mb-6" />

            <PageEnter delay={120}>
              {blocks.length > 0 ? (
                <div className="text-[14px]">
                  <BlocksRenderer blocks={blocks} />
                </div>
              ) : (
                <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
              )}
            </PageEnter>
          </div>
        </div>

        {/* Meta panel (lg+) */}
        <div className="hidden lg:block">
          <TaskDetailMetaPanel task={task} project={project} assignees={assignees} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-2.5 border-t border-border bg-[#fafafa] flex items-center justify-between shrink-0">
        <span className="text-[11px] text-muted-foreground">
          Esc para volver
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
    </article>
  );
}
