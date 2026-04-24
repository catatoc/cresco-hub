'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import type { NotionUser } from '@/schemas/notion-user';
import type { Task } from '@/schemas/task';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { ViewToggle } from './view-toggle';
import { SprintNav } from './sprint-nav';

type Props = {
  initialTasks: Task[];
  sprintLabel: string;
  currentSprintId: string | null;
  allSprintIds: string[];
  users: NotionUser[];
};

export function KanbanView({
  initialTasks,
  sprintLabel,
  currentSprintId,
  allSprintIds,
  users,
}: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [view, setView] = useState<'classic' | 'week'>('classic');

  const usersById = new Map(users.map((u) => [u.id, u]));

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

      {view === 'classic' ? (
        <BoardClassic tasks={tasks} setTasks={setTasks} usersById={usersById} />
      ) : (
        <BoardWeek tasks={tasks} setTasks={setTasks} usersById={usersById} />
      )}
    </div>
  );
}
