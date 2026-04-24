'use client';

import Link from 'next/link';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_COLOR: Record<string, string> = {
  Urgente: '#d24949',
  Alta: '#c78a2c',
  Media: '#8a8a91',
  Baja: '#8a8a91',
};

function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority];
  return (
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Baja' ? 10 : 6}
        width="4"
        height={priority === 'Baja' ? 12 : 16}
        opacity={priority === 'Baja' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'Urgente' ? 6 : 2}
        width="4"
        height={priority === 'Urgente' ? 16 : 20}
        opacity={priority === 'Urgente' ? 1 : 0.3}
      />
    </svg>
  );
}

const LABEL_MAP: Record<string, string> = {
  Frontend: 'bg-[#eef4ff] text-[#3a5fcc]',
  Backend: 'bg-[#f0f4e6] text-[#556c1d]',
  Design: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Docs: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Review: 'bg-[#fceaea] text-[#a92f2f]',
};

type Props = { task: Task; showDayChip?: boolean; isOverlay?: boolean };

export function TaskCard({ task, showDayChip, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isOverlay });

  const isDone = task.status === 'Hecho';
  const isProgress = task.status === 'En progreso';

  const dayChip = (() => {
    if (!task.dueDate) return null;
    const d = new Date(task.dueDate);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const label = isToday
      ? 'Hoy'
      : d.toLocaleDateString('es', { weekday: 'short' }).replace('.', '');
    return { label, today: isToday };
  })();

  const style = isOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      className={cn(
        'bg-white border border-border rounded-md p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow',
        isDone && 'opacity-75',
        isProgress && 'border-[#c9cbe8] shadow-[0_0_0_1px_rgba(94,106,210,.12)]',
        isDragging && !isOverlay && 'opacity-40',
        isOverlay && 'shadow-lg rotate-2 cursor-grabbing',
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        <PriorityBars priority={task.priority} />
        {task.number && <span className="font-medium">{task.number}</span>}
      </div>

      <Link
        href={`/tareas/${task.id}`}
        onPointerDown={(e) => e.stopPropagation()}
        className={cn(
          'block text-[13px] leading-tight mb-2 hover:underline',
          isDone && 'line-through text-muted-foreground',
        )}
      >
        {task.title}
      </Link>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {task.labels[0] && (
          <span
            className={cn(
              'px-1.5 rounded text-[11px] font-medium',
              LABEL_MAP[task.labels[0]] ?? 'bg-[#f7f7f8] text-[#57575c]',
            )}
          >
            {task.labels[0]}
          </span>
        )}
        {showDayChip && dayChip ? (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[10px] uppercase tracking-[0.02em] font-medium border',
              dayChip.today
                ? 'bg-[#eeeffc] border-[#c9cbe8] text-[#5e6ad2]'
                : 'bg-[#f7f7f8] border-border text-[#57575c]',
            )}
          >
            {dayChip.label}
          </span>
        ) : task.dueDate ? (
          <span className="ml-auto">
            {new Date(task.dueDate).toLocaleDateString('es', { day: '2-digit', month: 'short' })}
          </span>
        ) : null}
        <div className="w-[18px] h-[18px] rounded-full bg-[#6da88e] text-white text-[9px] font-semibold grid place-items-center ml-auto">
          DL
        </div>
      </div>
    </div>
  );
}
