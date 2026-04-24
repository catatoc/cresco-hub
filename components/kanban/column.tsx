'use client';

import type { NotionUser } from '@/schemas/notion-user';
import type { Task } from '@/schemas/task';
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
  usersById: Map<string, NotionUser>;
};

export function Column({ id, title, tasks, dotClass, dotFilled, showDayChip, usersById }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-[#fafafa] border border-border rounded-lg flex flex-col min-h-full transition-colors',
        isOver && 'border-[#5e6ad2] bg-[#eeeffc]/40',
      )}
    >
      <div className="flex items-center gap-2 px-3 pt-2.5 pb-2 border-b border-border">
        <span className={cn('w-2.5 h-2.5 rounded-full border-[1.5px]', dotClass, dotFilled && 'bg-current')} />
        <span className="text-[12px] font-semibold">{title}</span>
        <span className="text-[12px] text-muted-foreground font-medium">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-auto min-h-[80px]">
          {tasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              showDayChip={showDayChip}
              assignees={t.assigneeIds
                .map((id) => usersById.get(id))
                .filter((u): u is NotionUser => !!u)}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}
