'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
    <div className="py-8 px-4 text-center">
      <div className="text-lg mb-2">🔎 Nada por acá</div>
      <p className="text-sm text-muted-foreground mb-5">
        No hay coincidencias en tu workspace actual.
      </p>
      <button
        onClick={create}
        disabled={creating}
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm disabled:opacity-50"
      >
        {creating ? 'Creando…' : `➕ Crear "${term}" como nueva tarea`}
      </button>
      <p className="mt-4 text-[11px] text-muted-foreground">
        O prueba <code className="bg-muted px-1 py-0.5 rounded">@persona</code> /{' '}
        <code className="bg-muted px-1 py-0.5 rounded">#tarea</code>
      </p>
    </div>
  );
}
