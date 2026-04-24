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

const COLUMNS: Array<{ title: string; status: TaskStatus; dotClass: string; dotFilled?: boolean }> = [
  { title: 'Por hacer',          status: 'Por hacer',   dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'En progreso',        status: 'En progreso', dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Hecho esta semana',  status: 'Hecho',       dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
];

type Props = {
  tasks: Task[];
  cycle: string;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
};

export function BoardWeek({ tasks, cycle, setTasks }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const { move } = useMoveTask(setTasks);
  const active = tasks.filter((t) => t.status !== 'Backlog');

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
        <WeekStripe tasks={active} cycle={cycle} />
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
