'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { Task, TaskStatus } from '@/schemas/task';

type Dispatcher = React.Dispatch<React.SetStateAction<Task[]>>;

export type FlashKind = 'success' | 'progress' | 'review' | 'neutral' | null;

function flashFor(status: TaskStatus): FlashKind {
  switch (status) {
    case 'Done': return 'success';
    case 'In Progress': return 'progress';
    case 'In Review': return 'review';
    default: return 'neutral';
  }
}

export function useMoveTask(setTasks: Dispatcher) {
  const t = useTranslations('kanban.moveTask');
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [flashedColumn, setFlashedColumn] = useState<{ id: string; kind: FlashKind } | null>(null);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function move(taskId: string, newStatus: TaskStatus, columnId?: string) {
    let original: Task[] = [];
    setTasks((curr) => {
      original = curr;
      return curr.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t));
    });
    setPending((s) => new Set(s).add(taskId));

    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => 'failed'));
      if (columnId) {
        setFlashedColumn({ id: columnId, kind: flashFor(newStatus) });
        if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = setTimeout(() => setFlashedColumn(null), 280);
      }
    } catch {
      setTasks(original);
      toast.error(t('error'));
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  }

  useEffect(() => () => {
    if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
  }, []);

  return { move, pending, flashedColumn };
}
