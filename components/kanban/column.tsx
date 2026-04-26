'use client';

import type { TeamMember } from '@/schemas/team-member';
import type { Task } from '@/schemas/task';
import type { FlashKind } from '@/hooks/use-move-task';
import { TaskCard } from './card';
import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type Props = {
  id: string;
  title: string;
  tasks: Task[];
  dotClass: string;
  dotFilled?: boolean;
  showDayChip?: boolean;
  membersById: Map<string, TeamMember>;
  flash?: FlashKind;
  /**
   * When true, the column does not stretch to fill its parent and its body
   * does not own a scroll context. Used when the column is rendered inside
   * a stacked layout (e.g. accordions in `BoardByPerson`) where the outer
   * container handles vertical scrolling.
   */
  embedded?: boolean;
};

export function Column({ id, title, tasks, dotClass, dotFilled, showDayChip, membersById, flash, embedded }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      data-flashed={flash ?? undefined}
      className={cn(
        'bg-[#fafafa] border border-border rounded-lg flex flex-col transition-colors duration-(--duration-fast) ease-(--ease-linear)',
        !embedded && 'min-h-full',
        isOver && 'border-[#5e6ad2] bg-[#eeeffc]/40',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <span className={cn('w-2.5 h-2.5 rounded-full border-[1.5px]', dotClass, dotFilled && 'bg-current')} />
        <span className="text-[12px] font-semibold">{title}</span>
        <span className="text-[12px] text-muted-foreground font-medium">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          className={cn(
            'flex-1 p-2 flex flex-col gap-1.5 min-h-[80px]',
            !embedded && 'overflow-auto',
          )}
        >
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              showDayChip={showDayChip}
              assignees={t.assigneeIds
                .map((id) => membersById.get(id))
                .filter((m): m is TeamMember => !!m)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
