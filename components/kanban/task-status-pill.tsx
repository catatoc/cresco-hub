'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { TaskStatus } from '@/schemas/task';
import { DoneCelebration } from '@/components/motion/done-celebration';

const STATUS_STYLE: Record<TaskStatus, { pill: string; dot: string; labelKey: string }> = {
  Refining:     { pill: 'bg-[#f7f7f8] text-muted-foreground',  dot: 'bg-[#b0b0b6]', labelKey: 'refining' },
  'Not Started':{ pill: 'bg-[#f7f7f8] text-[#57575c]',         dot: 'bg-[#57575c]', labelKey: 'notStarted' },
  'In Progress':{ pill: 'bg-[#eeeffc] text-[#5e6ad2]',         dot: 'bg-[#5e6ad2]', labelKey: 'inProgress' },
  Testing:      { pill: 'bg-[#fef9e7] text-[#b58a1f]',         dot: 'bg-[#b58a1f]', labelKey: 'testing' },
  'In Review':  { pill: 'bg-[#faf0db] text-[#c78a2c]',         dot: 'bg-[#c78a2c]', labelKey: 'inReview' },
  Done:         { pill: 'bg-[#e8f5ec] text-[#3f9f5c]',         dot: 'bg-[#3f9f5c]', labelKey: 'done' },
  Archived:     { pill: 'bg-[#f7f7f8] text-muted-foreground',  dot: 'bg-[#8a8a91]', labelKey: 'archived' },
};

const ORDER: TaskStatus[] = [
  'Refining',
  'Not Started',
  'In Progress',
  'Testing',
  'In Review',
  'Done',
  'Archived',
];

type Props = {
  taskId: string;
  status: TaskStatus;
};

export function TaskStatusPill({ taskId, status }: Props) {
  const t = useTranslations('kanban.statusPill');
  const router = useRouter();
  const [current, setCurrent] = useState<TaskStatus>(status);
  const [pending, startTransition] = useTransition();
  const [celebrating, setCelebrating] = useState(false);
  const prevRef = useRef<TaskStatus>(status);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== 'Done' && current === 'Done') {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 700);
      return () => clearTimeout(t);
    }
    prevRef.current = current;
  }, [current]);

  const style = STATUS_STYLE[current];

  function change(next: TaskStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/status`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error('failed');
        startTransition(() => router.refresh());
      } catch {
        setCurrent(previous);
        toast.error(t('changeError'));
      }
    })();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'relative inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded text-[11px] font-medium outline-none transition-[transform,background-color,color] duration-(--duration-fast) ease-(--ease-linear) hover:brightness-95 active:scale-[0.97] data-[celebrating=true]:scale-[1.04] data-[celebrating=true]:duration-(--duration-celebrate) data-[celebrating=true]:ease-(--ease-spring) focus-visible:ring-2 focus-visible:ring-ring',
          style.pill,
          pending && 'opacity-70',
        )}
        data-celebrating={celebrating}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full', style.dot)} />
        {t(style.labelKey)}
        <ChevronDown className="w-3 h-3 opacity-60" />
        <DoneCelebration show={celebrating} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        {ORDER.map((s) => {
          const st = STATUS_STYLE[s];
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => change(s)}
              className="flex items-center gap-2 text-[12px]"
            >
              <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />
              <span className="flex-1">{t(st.labelKey)}</span>
              {s === current && <Check className="w-3.5 h-3.5 opacity-70" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
