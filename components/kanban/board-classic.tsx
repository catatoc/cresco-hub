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
import { useMoveTask } from '@/hooks/use-move-task';

// TODO(refactor-C): redesign kanban columns. For now we map the 6 real statuses
// onto 4 display columns using the old visual vocabulary.
const COLUMNS: Array<{ title: string; status: TaskStatus; dotClass: string; dotFilled?: boolean }> = [
  { title: 'Refining',    status: 'Refining',    dotClass: 'border-[#a0a0a8] text-[#a0a0a8]' },
  { title: 'Not Started', status: 'Not Started', dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'In Progress', status: 'In Progress', dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Done',        status: 'Done',        dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
];

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

export function BoardClassic({ tasks, setTasks }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(setTasks);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

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

  const active = tasks.find((t) => t.id === activeId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex-1 grid grid-cols-4 gap-2.5 pb-5 overflow-auto">
        {COLUMNS.map((col) => (
          <Column
            key={col.status}
            id={col.status}
            title={col.title}
            tasks={tasks.filter((t) => t.status === col.status)}
            dotClass={col.dotClass}
            dotFilled={col.dotFilled}
          />
        ))}
      </div>
      <DragOverlay>{active && <TaskCard task={active} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
