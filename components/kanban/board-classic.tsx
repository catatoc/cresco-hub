'use client';

import { useEffect, useState } from 'react';
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
import { useMoveTask } from '@/hooks/use-move-task';

/**
 * Column = display bucket. Each column groups one or more Notion status values.
 * `dropStatus` is the status a card gets when dropped into the column.
 */
type BoardColumn = {
  id: string;
  title: string;
  statuses: TaskStatus[];
  dropStatus: TaskStatus;
  dotClass: string;
  dotFilled?: boolean;
};

const COLUMNS: BoardColumn[] = [
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
    id: 'in-review',
    title: 'En revisión',
    statuses: ['In Review'],
    dropStatus: 'In Review',
    dotClass: 'border-[#c78a2c] text-[#c78a2c]',
    dotFilled: true,
  },
  {
    id: 'done',
    title: 'Hecho',
    statuses: ['Done'],
    dropStatus: 'Done',
    dotClass: 'border-[#3f9f5c] text-[#3f9f5c]',
    dotFilled: true,
  },
  {
    id: 'archived',
    title: 'Archivado',
    statuses: ['Archived'],
    dropStatus: 'Archived',
    dotClass: 'border-[#8a8a91] text-[#8a8a91]',
    dotFilled: true,
  },
];

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  membersById: Map<string, TeamMember>;
};

export function BoardClassic({ tasks, setTasks, membersById }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);

  useEffect(() => {
    if (activeId) {
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [activeId]);

  const { move, flashedColumn } = useMoveTask(setTasks);

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

    const targetColumn = COLUMNS.find((c) => c.id === overId);
    if (!targetColumn) return;
    if (targetColumn.statuses.includes(task.status)) return;

    void move(task.id, targetColumn.dropStatus, targetColumn.id);
  }

  const active = tasks.find((t) => t.id === activeId) ?? null;
  const visibleColumns = COLUMNS.filter((c) => c.id !== 'archived');
  const archivedColumn = COLUMNS.find((c) => c.id === 'archived')!;
  const archivedTasks = tasks.filter((t) => archivedColumn.statuses.includes(t.status));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex-1 flex flex-col gap-3 pb-5 overflow-auto">
        <div className="grid grid-cols-4 gap-2.5">
          {visibleColumns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={tasks.filter((t) => col.statuses.includes(t.status))}
              dotClass={col.dotClass}
              dotFilled={col.dotFilled}
              membersById={membersById}
              flash={flashedColumn?.id === col.id ? flashedColumn.kind : null}
            />
          ))}
        </div>

        {archivedTasks.length > 0 && (
          <div className="border border-border rounded-lg bg-[#fafafa]">
            <button
              onClick={() => setArchivedOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.02] transition-colors cursor-pointer"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full border-[1.5px] ${archivedColumn.dotClass} bg-current`}
              />
              <span className="text-[12px] font-semibold">{archivedColumn.title}</span>
              <span className="text-[12px] text-muted-foreground font-medium">
                {archivedTasks.length}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground">
                {archivedOpen ? 'Ocultar' : 'Mostrar'}
              </span>
            </button>
            {archivedOpen && (
              <div className="p-2 grid grid-cols-4 gap-2 border-t border-border">
                {archivedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignees={t.assigneeIds
                      .map((id) => membersById.get(id))
                      .filter((m): m is TeamMember => !!m)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <DragOverlay>
        {active && (
          <TaskCard
            task={active}
            isOverlay
            assignees={active.assigneeIds
              .map((id) => membersById.get(id))
              .filter((m): m is TeamMember => !!m)}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
