'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { EmptyState } from '@/components/common/empty-state';

export function SearchNoResults({ term, onClose }: { term: string; onClose: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  async function create() {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: term }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => 'failed'));
      const body = (await res.json()) as { id: string; url: string };
      toast.success('Tarea creada');
      onClose();
      router.push(body.url);
    } catch {
      toast.error('No se pudo crear la tarea. Intenta de nuevo.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <EmptyState
      icon="🔎"
      title="Nada por acá"
      description="No hay coincidencias en tu workspace actual."
      action={
        <button
          onClick={create}
          disabled={creating}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? 'Creando…' : `➕ Crear "${term}" como nueva tarea`}
        </button>
      }
    />
  );
}
