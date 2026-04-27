import Link from 'next/link';
import { CheckSquare } from 'lucide-react';
import type { Task, TaskStatus } from '@/schemas/task';
import { cn } from '@/lib/utils';

const STATUS_ORDER: Record<TaskStatus, number> = {
  'In Progress': 0,
  Testing:       1,
  'In Review':   2,
  Refining:      3,
  'Not Started': 4,
  Done:          5,
  Archived:      6,
};

const STATUS_PILL: Record<TaskStatus, { bg: string; text: string; dot: string }> = {
  Refining:      { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  'Not Started': { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
  'In Progress': { bg: 'bg-[#eff6ff]',  text: 'text-[#3a5fcc]',         dot: 'bg-[#3a5fcc]' },
  Testing:       { bg: 'bg-[#fef9e7]',  text: 'text-[#b58a1f]',         dot: 'bg-[#b58a1f]' },
  'In Review':   { bg: 'bg-[#faf0db]',  text: 'text-[#c78a2c]',         dot: 'bg-[#c78a2c]' },
  Done:          { bg: 'bg-[#e8f5ec]',  text: 'text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]' },
  Archived:      { bg: 'bg-[#fafbff]',  text: 'text-muted-foreground', dot: 'bg-[#a0a0a8]' },
};

function fmtDue(iso: string): string {
  return `vence ${new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`;
}

export function ProjectTasksModule({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <Module title="Tareas activas">
        <p className="text-[12px] text-muted-foreground py-3">
          Sin tareas en este proyecto. Crea la primera con el botón <strong>+ Tarea</strong>.
        </p>
      </Module>
    );
  }

  const sorted = [...tasks].sort((a, b) => {
    const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (s !== 0) return s;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  const visible = sorted.slice(0, 5);

  return (
    <Module
      title="Tareas activas"
      action={tasks.length > 5 ? <Link href="/tareas" className="text-[11px] text-[#5e6ad2] hover:underline">Ver todas →</Link> : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((t) => {
          const pill = STATUS_PILL[t.status];
          const done = t.status === 'Done' || t.status === 'Archived';
          return (
            <li key={t.id}>
              <Link
                href={`/tareas/${t.id}`}
                className="flex items-center gap-2.5 py-2 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
              >
                <span
                  className={cn(
                    'w-3.5 h-3.5 rounded border-[1.5px] shrink-0',
                    done ? 'bg-[#3f9f5c] border-[#3f9f5c]' : 'border-[#c9cbe8]',
                  )}
                />
                <span className={cn('text-[12.5px] flex-1 min-w-0 truncate', done && 'line-through text-muted-foreground')}>
                  {t.title}
                </span>
                {t.dueDate && !done && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{fmtDue(t.dueDate)}</span>
                )}
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10.5px] font-medium shrink-0',
                    pill.bg,
                    pill.text,
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', pill.dot)} />
                  {t.status}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Module>
  );
}

function Module({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <CheckSquare className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
