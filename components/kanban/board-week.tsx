'use client';

import type { Task } from '@/schemas/task';
import { Column } from './column';
import { WeekStripe } from './week-stripe';

export function BoardWeek({ tasks, cycle }: { tasks: Task[]; cycle: string }) {
  const active = tasks.filter((t) => t.status !== 'Backlog');

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <WeekStripe tasks={active} cycle={cycle} />
      <div className="flex-1 grid grid-cols-3 gap-2.5 pb-5 overflow-auto">
        <Column
          title="Por hacer"
          tasks={active.filter((t) => t.status === 'Por hacer')}
          dotClass="border-[#57575c] text-[#57575c]"
          showDayChip
        />
        <Column
          title="En progreso"
          tasks={active.filter((t) => t.status === 'En progreso')}
          dotClass="border-[#5e6ad2] text-[#5e6ad2]"
          dotFilled
          showDayChip
        />
        <Column
          title="Hecho esta semana"
          tasks={active.filter((t) => t.status === 'Hecho')}
          dotClass="border-[#3f9f5c] text-[#3f9f5c]"
          dotFilled
          showDayChip
        />
      </div>
    </div>
  );
}
