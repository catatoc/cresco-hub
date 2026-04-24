'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type { Task, TaskStatus } from '@/schemas/task';

type Dispatcher = React.Dispatch<React.SetStateAction<Task[]>>;

export function useMoveTask(setTasks: Dispatcher) {
  const [pending, setPending] = useState<Set<string>>(new Set());

  async function move(taskId: string, newStatus: TaskStatus) {
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
    } catch {
      setTasks(original);
      toast.error('No se pudo mover la tarea. Intenta de nuevo.');
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(taskId);
        return next;
      });
    }
  }

  return { move, pending };
}
