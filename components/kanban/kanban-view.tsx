'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import type { TareasScope } from '@/lib/auth/context';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { BoardByPerson } from './board-by-person';
import { ViewToggle } from './view-toggle';
import { SprintNav } from './sprint-nav';
import { CopyTasksMenu } from './copy-tasks-menu';
import { TruncationBanner } from './truncation-banner';

type Props = {
  initialTasks: Task[];
  truncated?: boolean;
  sprintLabel: string;
  currentSprintId: string | null;
  allSprintIds: string[];
  members: TeamMember[];
  scope: TareasScope;
  projectsById: Map<string, Project>;
};

export function KanbanView({
  initialTasks,
  truncated = false,
  sprintLabel,
  currentSprintId,
  allSprintIds,
  members,
  scope,
  projectsById,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<'classic' | 'week'>('classic');

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-3 sm:px-4 lg:px-5 pt-3 sm:pt-4 lg:pt-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 mb-3 sm:mb-4">
        <h1 className="hidden sm:block text-[15px] font-semibold shrink-0">Semana activa</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 sm:py-0.5 rounded-md text-[12px] font-medium bg-[#eeeffc] text-[#5e6ad2] min-w-0 max-w-[60vw] sm:max-w-none">
          <Clock className="w-[11px] h-[11px] shrink-0" />
          <span className="truncate">{sprintLabel}</span>
        </span>
        <div className="flex items-center gap-2.5 ml-auto shrink-0">
          <SprintNav currentSprintId={currentSprintId} allSprintIds={allSprintIds} />
          <ViewToggle view={view} onChange={setView} />
          <CopyTasksMenu tasks={tasks} membersById={membersById} sprintLabel={sprintLabel} />
        </div>
      </div>

      {truncated && <TruncationBanner cap={500} />}

      {scope === 'team' ? (
        <BoardByPerson
          tasks={tasks}
          setTasks={setTasks}
          members={members}
          membersById={membersById}
          projectsById={projectsById}
          view={view}
        />
      ) : view === 'classic' ? (
        <BoardClassic tasks={tasks} setTasks={setTasks} membersById={membersById} projectsById={projectsById} />
      ) : (
        <BoardWeek tasks={tasks} setTasks={setTasks} membersById={membersById} projectsById={projectsById} />
      )}
    </div>
  );
}
