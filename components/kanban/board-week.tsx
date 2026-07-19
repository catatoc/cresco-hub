'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import type { TeamMember } from '@/schemas/team-member';
import type { Task, TaskStatus } from '@/schemas/task';
import type { Project } from '@/schemas/project';
import { Column } from './column';
import { TaskCard } from './card';
import { WeekStripe } from './week-stripe';
import { useMoveTask } from '@/hooks/use-move-task';
import { cn } from '@/lib/utils';

type WeekColumn = {
  id: string;
  titleKey: string;
  statuses: TaskStatus[];
  dropStatus: TaskStatus;
  dotClass: string;
  dotFilled?: boolean;
};

const COLUMNS: WeekColumn[] = [
  {
    id: 'todo',
    titleKey: 'todo',
    statuses: ['Refining', 'Not Started'],
    dropStatus: 'Not Started',
    dotClass: 'border-[#57575c] text-[#57575c]',
  },
  {
    id: 'in-progress',
    titleKey: 'inProgress',
    statuses: ['In Progress'],
    dropStatus: 'In Progress',
    dotClass: 'border-[#5e6ad2] text-[#5e6ad2]',
    dotFilled: true,
  },
  {
    id: 'done',
    titleKey: 'doneThisWeek',
    statuses: ['Done'],
    dropStatus: 'Done',
    dotClass: 'border-[#3f9f5c] text-[#3f9f5c]',
    dotFilled: true,
  },
];

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  membersById: Map<string, TeamMember>;
  projectsById?: Map<string, Project>;
  /**
   * When true, the board lays out as natural-height content (no `flex-1`,
   * no internal `overflow-auto`). Used inside `BoardByPerson` accordions.
   */
  embedded?: boolean;
};

export function BoardWeek({ tasks, setTasks, membersById, projectsById, embedded }: Props) {
  const t = useTranslations('kanban.columns');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(setTasks);
  // Week view: ignore Refining-only (triage), In Review, and Archived.
  const weekTasks = tasks.filter(
    (t) => t.status !== 'In Review' && t.status !== 'Archived',
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const task = tasks.find((t) => t.id === e.active.id);
    if (!task) return;
    const targetColumn = COLUMNS.find((c) => c.id === overId);
    if (!targetColumn) return;
    if (targetColumn.statuses.includes(task.status)) return;
    void move(task.id, targetColumn.dropStatus);
  }

  const dragged = tasks.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        className={cn(
          'flex flex-col',
          !embedded && 'flex-1 overflow-hidden',
        )}
      >
        <WeekStripe tasks={weekTasks} />
        <div
          className={cn(
            'flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-3 lg:overflow-visible',
            !embedded && 'flex-1 lg:overflow-auto pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-5',
            '[scrollbar-width:thin]',
          )}
        >
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              className="snap-start shrink-0 w-[82vw] sm:w-[320px] lg:w-auto lg:shrink flex flex-col"
            >
              <Column
                id={col.id}
                title={t(col.titleKey)}
                tasks={weekTasks.filter((task) => col.statuses.includes(task.status))}
                dotClass={col.dotClass}
                dotFilled={col.dotFilled}
                showDayChip
                membersById={membersById}
                projectsById={projectsById}
                embedded={embedded}
              />
            </div>
          ))}
        </div>
      </div>
      <DragOverlay>
        {dragged && (
          <TaskCard
            task={dragged}
            isOverlay
            assignees={dragged.assigneeIds
              .map((id) => membersById.get(id))
              .filter((m): m is TeamMember => !!m)}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
