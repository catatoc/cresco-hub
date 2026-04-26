'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import type { Task } from '@/schemas/task';
import type { TeamMember } from '@/schemas/team-member';
import { groupTasksByPerson } from '@/lib/tareas/group-by-person';
import { BoardClassic } from './board-classic';
import { BoardWeek } from './board-week';
import { AssigneeAvatar } from './card';
import { cn } from '@/lib/utils';
import { m, AnimatePresence, EASE_OUT_SOFT } from '@/components/motion/m';

type Props = {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  members: TeamMember[];
  membersById: Map<string, TeamMember>;
  view: 'classic' | 'week';
};

const STATUS_DOT: Record<string, string> = {
  todo: 'border-[#57575c] text-[#57575c]',
  inProgress: 'bg-[#5e6ad2] border-[#5e6ad2]',
  inReview: 'bg-[#c78a2c] border-[#c78a2c]',
  done: 'bg-[#3f9f5c] border-[#3f9f5c]',
};

export function BoardByPerson({ tasks, setTasks, members, membersById, view }: Props) {
  const groups = groupTasksByPerson(tasks, members);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pb-5">
      <div className="flex flex-col gap-3">
        {groups.map((g) => (
          <PersonSection
            key={g.member?.id ?? '__unassigned__'}
            group={g}
            setTasks={setTasks}
            membersById={membersById}
            view={view}
          />
        ))}
        {groups.length === 0 && (
          <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
            No hay tareas en este sprint.
          </div>
        )}
      </div>
    </div>
  );
}

function PersonSection({
  group,
  setTasks,
  membersById,
  view,
}: {
  group: { member: TeamMember | null; tasks: Task[] };
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  membersById: Map<string, TeamMember>;
  view: 'classic' | 'week';
}) {
  const [open, setOpen] = useState(true);

  const counts = {
    todo: group.tasks.filter((t) => t.status === 'Not Started' || t.status === 'Refining').length,
    inProgress: group.tasks.filter((t) => t.status === 'In Progress').length,
    inReview: group.tasks.filter((t) => t.status === 'In Review').length,
    done: group.tasks.filter((t) => t.status === 'Done').length,
  };

  const groupIds = new Set(group.tasks.map((t) => t.id));

  // BoardClassic/BoardWeek own the DnD state for these tasks. They mutate the
  // shared `setTasks` so optimistic moves still work. We pass a filtered
  // tasks array but the same setter — moving a task only changes its status,
  // and the parent re-runs grouping on next render.
  const setSubsetTasks: React.Dispatch<React.SetStateAction<Task[]>> = (updater) => {
    setTasks((prev) => {
      const next = typeof updater === 'function'
        ? (updater as (p: Task[]) => Task[])(prev.filter((t) => groupIds.has(t.id)))
        : updater;
      const subsetById = new Map(next.map((t) => [t.id, t]));
      return prev.map((t) => subsetById.get(t.id) ?? t);
    });
  };

  const labelId = `person-${group.member?.id ?? 'unassigned'}-label`;
  const panelId = `person-${group.member?.id ?? 'unassigned'}-panel`;

  return (
    <section className="border border-border rounded-lg bg-white shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        id={labelId}
        className={cn(
          'w-full flex items-center gap-3 px-3.5 py-2.5 text-left rounded-lg cursor-pointer',
          'transition-colors duration-(--duration-fast) ease-(--ease-linear)',
          'hover:bg-black/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]/30',
          open && 'rounded-b-none',
        )}
      >
        <m.span
          aria-hidden
          animate={{ rotate: open ? 90 : 0 }}
          transition={{ duration: 0.15, ease: EASE_OUT_SOFT }}
          className="inline-flex"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </m.span>
        {group.member ? (
          <AssigneeAvatar member={group.member} size={28} />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[#ececef] text-[#8a8a91] grid place-items-center text-[10px] font-semibold">?</span>
        )}
        <span className="flex flex-col leading-tight min-w-0">
          <span className="text-[13px] font-semibold truncate">
            {group.member?.name ?? 'Sin asignar'}
          </span>
          {group.member && (group.member.area || group.member.role) && (
            <span className="text-[11px] text-muted-foreground truncate">
              {group.member.area ?? group.member.role}
            </span>
          )}
        </span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <CountChip dotClass={STATUS_DOT.todo!} value={counts.todo} />
          <CountChip dotClass={STATUS_DOT.inProgress!} value={counts.inProgress} />
          <CountChip dotClass={STATUS_DOT.inReview!} value={counts.inReview} />
          <CountChip dotClass={STATUS_DOT.done!} value={counts.done} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={labelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              height: { duration: 0.22, ease: EASE_OUT_SOFT },
              opacity: { duration: 0.15, ease: EASE_OUT_SOFT },
            }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-2.5">
              {view === 'classic' ? (
                <BoardClassic
                  tasks={group.tasks}
                  setTasks={setSubsetTasks}
                  membersById={membersById}
                  embedded
                />
              ) : (
                <BoardWeek
                  tasks={group.tasks}
                  setTasks={setSubsetTasks}
                  membersById={membersById}
                  embedded
                />
              )}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function CountChip({ dotClass, value }: { dotClass: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-[1px] rounded text-[11px] font-medium border border-border bg-white text-muted-foreground">
      <span className={cn('w-2 h-2 rounded-full border-[1.5px]', dotClass)} />
      {value}
    </span>
  );
}
