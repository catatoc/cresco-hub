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
import type { Task, TaskStatus } from '@/schemas/task';
import { Column } from './column';
import { TaskCard } from './card';
import { WeekStripe } from './week-stripe';
import { useMoveTask } from '@/hooks/use-move-task';

// TODO(refactor-C): rebuild week view on top of Sprint start/end dates.
const COLUMNS: Array<{ title: string; status: TaskStatus; dotClass: string; dotFilled?: boolean }> = [
  { title: 'Not Started',       status: 'Not Started', dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'In Progress',       status: 'In Progress', dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Done esta semana',  status: 'Done',        dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
];

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

export function BoardWeek({ tasks, setTasks }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(setTasks);
  const active = tasks.filter((t) => t.status !== 'Refining' && t.status !== 'Archived');

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
    const newStatus = COLUMNS.find((c) => c.status === overId)?.status;
    if (!newStatus || newStatus === task.status) return;
    void move(task.id, newStatus);
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
        <WeekStripe tasks={active} />
        <div className="flex-1 grid grid-cols-3 gap-2.5 pb-5 overflow-auto">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              id={col.status}
              title={col.title}
              tasks={active.filter((t) => t.status === col.status)}
              dotClass={col.dotClass}
              dotFilled={col.dotFilled}
              showDayChip
            />
          ))}
        </div>
      </div>
      <DragOverlay>{dragged && <TaskCard task={dragged} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
