import { cn } from '@/lib/utils';

type Props = {
  completion: number | null; // 0..1
  tasksDone: number;
  tasksTotal: number;
  meetingsCount: number;
  endDate: string | null; // ISO
};

function daysRemaining(endIso: string): number {
  const end = new Date(endIso).getTime();
  const now = Date.now();
  return Math.ceil((end - now) / 86_400_000);
}

export function ProjectStats({
  completion,
  tasksDone,
  tasksTotal,
  meetingsCount,
  endDate,
}: Props) {
  const days = endDate ? daysRemaining(endDate) : null;
  const visible: Array<'avance' | 'tasks' | 'meetings' | 'days'> = [];
  if (completion !== null) visible.push('avance');
  visible.push('tasks');
  visible.push('meetings');
  if (days !== null) visible.push('days');

  const cols =
    visible.length === 4
      ? 'sm:grid-cols-4'
      : visible.length === 3
        ? 'sm:grid-cols-3'
        : 'sm:grid-cols-2';

  const dayTone =
    days === null
      ? ''
      : days < 0
        ? 'bg-[#fceaea] border-[#f5d6d6] text-[#d24949]'
        : days < 14
          ? 'bg-[#faf0db] border-[#f3e2c0] text-[#c78a2c]'
          : '';

  return (
    <div className={cn('grid grid-cols-2 gap-2.5 sm:gap-3 mb-5', cols)}>
      {completion !== null && (
        <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
          <div className="text-[20px] font-semibold leading-none tracking-[-0.01em]">
            {Math.round(completion * 100)}%
          </div>
          <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">
            Avance
          </div>
          <div className="h-1 mt-2 bg-[#e8e8ee] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#5e6ad2] to-[#7c5fd0]"
              style={{ width: `${Math.round(completion * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
        <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
          {tasksDone} / {tasksTotal}
        </div>
        <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">
          Tareas
        </div>
      </div>

      <div className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl px-3 py-3">
        <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
          {meetingsCount}
        </div>
        <div className="text-[10px] uppercase tracking-[0.05em] text-muted-foreground mt-1">
          Reuniones
        </div>
      </div>

      {days !== null && (
        <div
          className={cn(
            'rounded-xl px-3 py-3 border',
            dayTone || 'bg-[#fafbff] border-[#f0f0f4]',
          )}
        >
          <div className="text-[20px] font-semibold leading-none tracking-[-0.01em] tabular-nums">
            {days < 0 ? `${Math.abs(days)}d` : `${days}d`}
          </div>
          <div className="text-[10px] uppercase tracking-[0.05em] mt-1 opacity-90">
            {days < 0 ? 'Vencido' : 'Restantes'}
          </div>
        </div>
      )}
    </div>
  );
}
