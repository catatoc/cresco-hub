'use client';

import Link from 'next/link';
import type { NotionUser } from '@/schemas/notion-user';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const PRIORITY_COLOR: Record<string, string> = {
  High: '#c78a2c',
  Medium: '#8a8a91',
  Low: '#8a8a91',
};

function PriorityBars({ priority }: { priority: Task['priority'] }) {
  if (!priority) return null;
  const color = PRIORITY_COLOR[priority];
  return (
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect
        x="10"
        y={priority === 'Low' ? 10 : 6}
        width="4"
        height={priority === 'Low' ? 12 : 16}
        opacity={priority === 'Low' ? 0.3 : 1}
      />
      <rect
        x="18"
        y={priority === 'High' ? 6 : 2}
        width="4"
        height={priority === 'High' ? 16 : 20}
        opacity={priority === 'High' ? 1 : 0.3}
      />
    </svg>
  );
}

const TAG_MAP: Record<string, string> = {
  Mobile: 'bg-[#eef4ff] text-[#3a5fcc]',
  Website: 'bg-[#f0f4e6] text-[#556c1d]',
  Improvement: 'bg-[#f4ecf8] text-[#7f3aa7]',
  Marketing: 'bg-[#fceaea] text-[#a92f2f]',
  Research: 'bg-[#eeeffc] text-[#5e6ad2]',
  Branding: 'bg-[#faf0db] text-[#c78a2c]',
  Metrics: 'bg-[#e8f5ec] text-[#3f9f5c]',
  Meeting: 'bg-[#f7f7f8] text-[#57575c]',
  Email: 'bg-[#f7f7f8] text-[#57575c]',
  'Video production': 'bg-[#f4ecf8] text-[#7f3aa7]',
};

/**
 * Take up to two letters from a name for avatar fallback.
 * "Carlos Carrasquero" → "CC"; "Carlos" → "CA"; "?" → "?"
 */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0]!;
  if (parts.length === 1) return first.slice(0, 2).toUpperCase() || '?';
  const last = parts[parts.length - 1]!;
  return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase() || '?';
}

type AvatarProps = {
  user: NotionUser;
  size?: number;
};

export function AssigneeAvatar({ user, size = 18 }: AvatarProps) {
  const s = `${size}px`;
  if (user.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.name ?? 'User'}
        style={{ width: s, height: s }}
        className="rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: s, height: s, fontSize: Math.max(9, Math.floor(size * 0.5)) }}
      className="rounded-full bg-[#6da88e] text-white font-semibold grid place-items-center"
      title={user.name ?? undefined}
    >
      {initials(user.name)}
    </div>
  );
}

export function AssigneeStack({
  assignees,
  size = 18,
}: {
  assignees: NotionUser[];
  size?: number;
}) {
  if (assignees.length === 0) return null;
  const first = assignees[0]!;
  const rest = assignees.slice(1);
  return (
    <div className="flex items-center gap-1">
      <AssigneeAvatar user={first} size={size} />
      {rest.length > 0 && (
        <span className="text-[10px] text-muted-foreground font-medium">
          +{rest.length}
        </span>
      )}
    </div>
  );
}

type Props = {
  task: Task;
  assignees?: NotionUser[];
  showDayChip?: boolean;
  isOverlay?: boolean;
};

export function TaskCard({ task, assignees = [], showDayChip, isOverlay }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, disabled: isOverlay });

  const isDone = task.status === 'Done';
  const isProgress = task.status === 'In Progress';

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
        {task.type && <span className="font-medium">{task.type}</span>}
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
        {task.tags[0] && (
          <span
            className={cn(
              'px-1.5 rounded text-[11px] font-medium',
              TAG_MAP[task.tags[0]] ?? 'bg-[#f7f7f8] text-[#57575c]',
            )}
          >
            {task.tags[0]}
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
        <div className="ml-auto">
          <AssigneeStack assignees={assignees} />
        </div>
      </div>
    </div>
  );
}
