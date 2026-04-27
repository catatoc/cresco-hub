'use client';

import { Plus } from 'lucide-react';
import { useCreateContext } from '@/components/create/create-provider';

export function NewTaskButton() {
  const { open } = useCreateContext();
  return (
    <button
      type="button"
      onClick={() => open('task')}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
    >
      <Plus className="w-3.5 h-3.5" />
      Tarea
    </button>
  );
}
