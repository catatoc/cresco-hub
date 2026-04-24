'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TeamMember } from '@/schemas/team-member';
import type { Task, TaskStatus } from '@/schemas/task';
import { Column } from './column';
import { TaskCard } from './card';
import { WeekStripe } from './week-stripe';
import { useMoveTask } from '@/hooks/use-move-task';

type WeekColumn = {
  id: string;
  title: string;
  statuses: TaskStatus[];
  dropStatus: TaskStatus;
  dotClass: string;
  dotFilled?: boolean;
};

const COLUMNS: WeekColumn[] = [
  {
    id: 'todo',
    title: 'Por hacer',
    statuses: ['Refining', 'Not Started'],
    dropStatus: 'Not Started',
    dotClass: 'border-[#57575c] text-[#57575c]',
  },
  {
    id: 'in-progress',
    title: 'En progreso',
    statuses: ['In Progress'],
    dropStatus: 'In Progress',
    dotClass: 'border-[#5e6ad2] text-[#5e6ad2]',
    dotFilled: true,
  },
  {
    id: 'done',
    title: 'Hecho esta semana',
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
};

export function BoardWeek({ tasks, setTasks, membersById }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(setTasks);
  // Week view: ignore Refining-only (triage), In Review, and Archived.
  const weekTasks = tasks.filter(
    (t) => t.status !== 'In Review' && t.status !== 'Archived',
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <WeekStripe tasks={weekTasks} />
        <div className="flex-1 grid grid-cols-3 gap-2.5 pb-5 overflow-auto">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={weekTasks.filter((t) => col.statuses.includes(t.status))}
              dotClass={col.dotClass}
              dotFilled={col.dotFilled}
              showDayChip
              membersById={membersById}
            />
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
