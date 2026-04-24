import Link from 'next/link';
import { format, isToday, isPast } from 'date-fns';
import type { Task } from '@/schemas/task';
import { cn } from '@/lib/utils';

const PRIORITY_FILL: Record<string, string> = {
  Urgente: '#d24949',
  Alta: '#c78a2c',
  Media: '#8a8a91',
  Baja: '#8a8a91',
};

function PriorityIcon({ priority }: { priority: Task['priority'] }) {
  if (!priority) return <span className="w-2.5" />;
  const color = PRIORITY_FILL[priority];
  return (
    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill={color}>
      <rect x="2" y="10" width="4" height="12" />
      <rect x="10" y="6" width="4" height="16" opacity={priority === 'Baja' ? 0.3 : 1} />
      <rect x="18" y="2" width="4" height="20" opacity={priority === 'Urgente' ? 1 : 0.3} />
    </svg>
  );
}

function DueCell({ dueDate }: { dueDate: string | null }) {
  if (!dueDate) return <span className="text-[11px] text-muted-foreground">—</span>;
  const d = new Date(dueDate);
  if (isToday(d)) return <span className="text-[11px] font-medium text-[#5e6ad2]">Hoy</span>;
  if (isPast(d)) return <span className="text-[11px] font-medium text-[#d24949]">{format(d, 'MMM d')}</span>;
  return <span className="text-[11px] text-muted-foreground">{format(d, 'MMM d')}</span>;
}

function LabelChip({ label }: { label: string }) {
  const map: Record<string, string> = {
    Frontend: 'bg-[#eef4ff] text-[#3a5fcc]',
    Backend: 'bg-[#f0f4e6] text-[#556c1d]',
    Design: 'bg-[#f4ecf8] text-[#7f3aa7]',
    Docs: 'bg-[#f4ecf8] text-[#7f3aa7]',
    Review: 'bg-[#fceaea] text-[#a92f2f]',
  };
  return <span className={cn('px-1.5 rounded text-[11px] font-medium', map[label] ?? 'bg-[#f7f7f8] text-[#57575c]')}>{label}</span>;
}

export function MyTasks({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-semibold flex items-center gap-2">
            Tus tareas <span className="text-[12px] font-normal text-muted-foreground">· Hoy y atrasadas</span>
          </h2>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin tareas para hoy. Buen momento para respirar.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold flex items-center gap-2">
          Tus tareas <span className="text-[12px] font-normal text-muted-foreground">· Hoy y atrasadas</span>
        </h2>
        <Link href="/tareas" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver todas →
        </Link>
      </div>
      <div className="border border-border rounded-lg bg-white overflow-hidden">
        {tasks.map((t, i) => (
          <Link
            href={`/tareas/${t.id}`}
            key={t.id}
            className={cn(
              'flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-[#f7f7f8]',
              i < tasks.length - 1 && 'border-b border-border',
            )}
          >
            <span
              className={cn(
                'w-3.5 h-3.5 rounded-full border-[1.5px] shrink-0',
                t.status === 'Hecho' && 'bg-[#3f9f5c] border-[#3f9f5c]',
                t.status === 'En progreso' && 'border-[#5e6ad2]',
                (t.status === 'Por hacer' || t.status === 'Backlog') && 'border-muted-foreground',
              )}
              style={
                t.status === 'En progreso'
                  ? { background: 'conic-gradient(#5e6ad2 0 60%, transparent 60% 100%)' }
                  : undefined
              }
            />
            <PriorityIcon priority={t.priority} />
            {t.number && <span className="text-[11px] text-muted-foreground font-medium w-11 shrink-0">{t.number}</span>}
            <span className="text-[13px] flex-1 truncate">{t.title}</span>
            {t.labels[0] && <LabelChip label={t.labels[0]} />}
            <DueCell dueDate={t.dueDate} />
            <div className="w-5 h-5 rounded-full bg-[#6da88e] text-white text-[9px] font-semibold grid place-items-center shrink-0">DL</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
