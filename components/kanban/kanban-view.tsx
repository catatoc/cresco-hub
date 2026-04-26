'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { TareasScope } from '@/lib/auth/context';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { BoardByPerson } from './board-by-person';
import { ViewToggle } from './view-toggle';
import { SprintNav } from './sprint-nav';

type Props = {
  initialTasks: Task[];
  sprintLabel: string;
  currentSprintId: string | null;
  allSprintIds: string[];
  members: TeamMember[];
  scope: TareasScope;
};

export function KanbanView({
  initialTasks,
  sprintLabel,
  currentSprintId,
  allSprintIds,
  members,
  scope,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<'classic' | 'week'>('classic');

  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <div className="flex-1 flex flex-col overflow-hidden px-5 pt-5">
      <div className="flex items-center gap-2.5 mb-4">
        <h1 className="text-[15px] font-semibold">Sprint activo</h1>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[12px] font-medium bg-[#eeeffc] text-[#5e6ad2]">
          <Clock className="w-[11px] h-[11px]" />
          {sprintLabel}
        </span>
        <SprintNav currentSprintId={currentSprintId} allSprintIds={allSprintIds} />
        <div className="ml-3">
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      {scope === 'team' ? (
        <BoardByPerson
          tasks={tasks}
          setTasks={setTasks}
          members={members}
          membersById={membersById}
          view={view}
        />
      ) : view === 'classic' ? (
        <BoardClassic tasks={tasks} setTasks={setTasks} membersById={membersById} />
      ) : (
        <BoardWeek tasks={tasks} setTasks={setTasks} membersById={membersById} />
      )}
    </div>
  );
}
