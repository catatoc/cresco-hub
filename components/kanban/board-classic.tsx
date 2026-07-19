'use client';

import { useEffect, useState } from 'react';
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
import { useMoveTask } from '@/hooks/use-move-task';
import { cn } from '@/lib/utils';

/**
 * Column = display bucket. Each column groups one or more Notion status values.
 * `dropStatus` is the status a card gets when dropped into the column.
 */
type BoardColumn = {
  id: string;
  titleKey: string;
  statuses: TaskStatus[];
  dropStatus: TaskStatus;
  dotClass: string;
  dotFilled?: boolean;
};

const COLUMNS: BoardColumn[] = [
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
    id: 'testing',
    titleKey: 'testing',
    statuses: ['Testing'],
    dropStatus: 'Testing',
    dotClass: 'border-[#b58a1f] text-[#b58a1f]',
    dotFilled: true,
  },
  {
    id: 'in-review',
    titleKey: 'inReview',
    statuses: ['In Review'],
    dropStatus: 'In Review',
    dotClass: 'border-[#c78a2c] text-[#c78a2c]',
    dotFilled: true,
  },
  {
    id: 'done',
    titleKey: 'done',
    statuses: ['Done'],
    dropStatus: 'Done',
    dotClass: 'border-[#3f9f5c] text-[#3f9f5c]',
    dotFilled: true,
  },
  {
    id: 'archived',
    titleKey: 'archived',
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
  projectsById?: Map<string, Project>;
  /**
   * When true, the board lays out as natural-height content (no `flex-1`,
   * no internal `overflow-auto`). Use it when the board is mounted inside a
   * parent that already owns vertical scrolling (e.g. `BoardByPerson`).
   */
  embedded?: boolean;
};

export function BoardClassic({ tasks, setTasks, membersById, projectsById, embedded }: Props) {
  const t = useTranslations('kanban.columns');
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
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
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
      <div
        className={cn(
          'flex flex-col gap-3',
          !embedded && 'flex-1 overflow-hidden pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-5',
        )}
      >
        <div
          className={cn(
            'flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible',
            !embedded && 'flex-1 lg:overflow-auto',
            '[scrollbar-width:thin]',
          )}
        >
          {visibleColumns.map((col) => (
            <div
              key={col.id}
              className="snap-start shrink-0 w-[80vw] sm:w-[300px] lg:w-auto lg:shrink flex flex-col"
            >
              <Column
                id={col.id}
                title={t(col.titleKey)}
                tasks={tasks.filter((task) => col.statuses.includes(task.status))}
                dotClass={col.dotClass}
                dotFilled={col.dotFilled}
                membersById={membersById}
                projectsById={projectsById}
                flash={flashedColumn?.id === col.id ? flashedColumn.kind : null}
                embedded={embedded}
              />
            </div>
          ))}
        </div>

        {archivedTasks.length > 0 && (
          <div className="border border-border rounded-lg bg-[#fafafa] shrink-0">
            <button
              onClick={() => setArchivedOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/[0.02] transition-colors cursor-pointer min-w-0"
            >
              <span
                className={`w-2.5 h-2.5 rounded-full border-[1.5px] shrink-0 ${archivedColumn.dotClass} bg-current`}
              />
              <span className="text-[12px] font-semibold truncate">{t(archivedColumn.titleKey)}</span>
              <span className="text-[12px] text-muted-foreground font-medium shrink-0">
                {archivedTasks.length}
              </span>
              <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
                {archivedOpen ? t('hideArchived') : t('showArchived')}
              </span>
            </button>
            {archivedOpen && (
              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 border-t border-border">
                {archivedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    assignees={t.assigneeIds
                      .map((id) => membersById.get(id))
                      .filter((m): m is TeamMember => !!m)}
                    project={t.projectId ? (projectsById?.get(t.projectId) ?? null) : null}
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
