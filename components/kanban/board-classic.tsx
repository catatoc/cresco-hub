'use client';

import type { Task, TaskStatus } from '@/schemas/task';
import { Column } from './column';

const COLUMNS: Array<{ title: string; status: TaskStatus; dotClass: string; dotFilled?: boolean }> = [
  { title: 'Backlog',      status: 'Backlog',      dotClass: 'border-[#a0a0a8] text-[#a0a0a8]' },
  { title: 'Por hacer',    status: 'Por hacer',    dotClass: 'border-[#57575c] text-[#57575c]' },
  { title: 'En progreso',  status: 'En progreso',  dotClass: 'border-[#5e6ad2] text-[#5e6ad2]', dotFilled: true },
  { title: 'Hecho',        status: 'Hecho',        dotClass: 'border-[#3f9f5c] text-[#3f9f5c]', dotFilled: true },
];

export function BoardClassic({ tasks }: { tasks: Task[] }) {
  return (
    <div className="flex-1 grid grid-cols-4 gap-2.5 pb-5 overflow-auto">
      {COLUMNS.map((col) => (
        <Column
          key={col.status}
          title={col.title}
          tasks={tasks.filter((t) => t.status === col.status)}
          dotClass={col.dotClass}
          dotFilled={col.dotFilled}
        />
      ))}
    </div>
  );
}
