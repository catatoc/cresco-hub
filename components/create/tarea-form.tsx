'use client';

import { useEffect, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateContext } from './create-provider';
import { useCreateContext as useInheritedContext } from '@/hooks/use-create-context';
import { ChipSprint } from './chips/chip-sprint';
import { ChipProject } from './chips/chip-project';
import { ChipTeam, type ChipValue as TeamValue } from './chips/chip-team';
import { ChipPriority } from './chips/chip-priority';
import { ChipDate } from './chips/chip-date';
import type { TaskPriority } from '@/schemas/task';

type ChipValue = { id: string; label: string };

export function TareaForm({
  customerId,
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  const router = useRouter();
  const { close } = useCreateContext();
  const inherited = useInheritedContext();

  const [sprint, setSprint] = useState<ChipValue | null>(
    inherited.sprintId ? { id: inherited.sprintId, label: 'Sprint heredado' } : null,
  );
  const [project, setProject] = useState<ChipValue | null>(
    inherited.projectId ? { id: inherited.projectId, label: 'Proyecto heredado' } : null,
  );
  const [assignees, setAssignees] = useState<TeamValue[]>([]);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createAnother, setCreateAnother] = useState(false);

  const tooLong = title.length > 200;
  const canSubmit = title.trim().length > 0 && !tooLong && !submitting;

  async function submit(opts: { another: boolean }) {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          type: 'task',
          customerId,
          title: title.slice(0, 200),
          description: description || undefined,
          sprintId: sprint?.id ?? null,
          projectId: project?.id ?? null,
          assigneeIds: assignees.map((a) => a.id),
          priority,
          dueDate,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'No pude crear la tarea');
        setSubmitting(false);
        return;
      }
      const created = await res.json();
      toast.success('Tarea creada', {
        action: {
          label: 'Ver',
          onClick: () => router.push(`/tareas/${created.id}`),
        },
      });
      if (window.location.pathname.startsWith('/tareas')) router.refresh();
      if (opts.another) {
        // Preserve type, sprint, project. Clear the rest. Refocus title.
        onTitleChange('');
        onDescriptionChange('');
        setAssignees([]);
        setPriority(null);
        setDueDate(null);
        setSubmitting(false);
        if (titleRef && 'current' in titleRef && titleRef.current) {
          titleRef.current.focus();
        }
      } else {
        close();
      }
    } catch (e) {
      toast.error('No pude crear la tarea. Reintentar');
      setSubmitting(false);
    }
  }

  // Cmd+Enter / Cmd+Shift+Enter
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Enter') return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      submit({ another: e.shiftKey });
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, sprint, project, assignees, priority, dueDate]);

  return (
    <div className="space-y-3">
      <input
        ref={titleRef}
        autoFocus
        placeholder="Título de la tarea…"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="w-full text-base outline-none bg-transparent placeholder:text-muted-foreground"
      />
      <textarea
        placeholder="Descripción (opcional)"
        value={description}
        onChange={(e) => onDescriptionChange(e.target.value)}
        rows={2}
        className="w-full text-[13px] outline-none bg-transparent resize-none placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <ChipSprint value={sprint} onChange={setSprint} />
        <ChipProject value={project} onChange={setProject} />
        <ChipTeam value={assignees} onChange={setAssignees} />
        <ChipPriority value={priority} onChange={setPriority} />
        <ChipDate value={dueDate} onChange={setDueDate} />
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
          />
          Crear otra (⇧⌘↵)
        </label>
        <div className="flex items-center gap-2">
          {tooLong && (
            <span className="text-[11px] text-red-600">{title.length}/200</span>
          )}
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => submit({ another: createAnother })}
            className="text-[12px] px-3 py-1 rounded-md bg-foreground text-background disabled:opacity-50"
          >
            {submitting ? 'Creando…' : 'Crear ⌘↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
