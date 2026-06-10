'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { notionBlocksToProseMirror } from '@/lib/edit-tasks/serialize-from-notion';
import { TaskEditor, type TaskEditorHandle } from './task-editor';
import { SaveBar } from './save-bar';

type Props = {
  blocks: unknown[];
  taskId: string;
};

const BANNER_TEXT =
  'Esta tarea contiene bloques que aún no soportamos editar (toggles, columnas, embeds, syncs). Por seguridad, Guardar está desactivado. Edita la tarea desde Notion para tocarla, o regresa al modo lectura.';

export function TaskEditorContainer({ blocks, taskId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const editorRef = useRef<TaskEditorHandle>(null);

  const initialDoc = useMemo(() => notionBlocksToProseMirror(blocks), [blocks]);
  const hasUnsupported = useMemo(
    () => initialDoc.content?.some((n) => n.type === 'unsupported_block') ?? false,
    [initialDoc],
  );

  // beforeunload guard while editing with dirty changes
  useEffect(() => {
    if (mode !== 'edit' || !dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [mode, dirty]);

  // ⌘S / Ctrl+S to save while in edit mode
  useEffect(() => {
    if (mode !== 'edit') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      // Allow save shortcut from inside the contenteditable (which has tag DIV);
      // skip only for INPUT/TEXTAREA outside the editor.
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // handleSave is stable for the closure; relies on ref + state setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, dirty, hasUnsupported, saving]);

  async function handleSave() {
    if (saving) return;
    if (!editorRef.current && !isTestEnv()) return;
    if (hasUnsupported) {
      toast.error('Este tipo de bloque no se puede guardar todavía', {
        description: 'Edita la tarea desde Notion mientras lo soportamos.',
      });
      return;
    }
    setSaving(true);
    try {
      const doc = editorRef.current ? editorRef.current.getDoc() : initialDoc;
      const res = await fetch(`/api/tasks/${taskId}/blocks`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ doc }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string; remaining?: number }));
        const stage = body.error;
        if (stage === 'delete-failed') {
          toast.error('No se pudo guardar', {
            description: `Notion borró parte del contenido pero no terminó. ${body.remaining ?? ''} bloques quedan. Reintenta.`,
          });
        } else if (stage === 'append-failed') {
          toast.error('No se pudo guardar', {
            description: 'No se pudo escribir los bloques nuevos. Reintenta.',
          });
        } else if (stage === 'update-failed') {
          toast.error('No se pudo guardar', {
            description: 'No se pudo actualizar parte del contenido. Reintenta.',
          });
        } else if (res.status === 401 || res.status === 403) {
          toast.error('No tienes acceso para guardar');
        } else if (res.status === 404) {
          toast.error('Esta tarea fue eliminada');
        } else {
          toast.error('No se pudo guardar', { description: 'Reintenta en un momento.' });
        }
        return;
      }
      toast.success('Cambios guardados');
      setDirty(false);
      setMode('read');
      router.refresh();
    } catch {
      toast.error('Sin conexión', { description: 'Reintenta cuando recuperes la red.' });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (dirty && !confirm('Tienes cambios sin guardar. ¿Descartarlos?')) return;
    setDirty(false);
    setMode('read');
  }

  const canSave = !hasUnsupported;

  if (mode === 'read') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setMode('edit')}
          aria-label="Editar tarea"
          className="hidden sm:inline-flex absolute right-0 top-0 items-center gap-1 px-2 py-1 rounded-md text-[12px] text-muted-foreground hover:text-[#5e6ad2] hover:bg-[#eeeffc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden />
          Editar
        </button>
        {blocks.length > 0 ? (
          <BlocksRenderer blocks={blocks as never[]} />
        ) : (
          <p className="text-[13px] text-muted-foreground italic">Sin descripción.</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <SaveBar
        dirty={dirty}
        saving={saving}
        canSave={canSave}
        onSave={handleSave}
        onCancel={handleCancel}
      />
      {hasUnsupported && (
        <div className="my-3 flex items-start gap-2 p-3 rounded-md bg-[#faf0db] border border-[#efddb6] text-[12px] text-[#6b4f18]">
          <AlertTriangle className="w-4 h-4 mt-[1px] shrink-0" aria-hidden />
          <p className="leading-relaxed">{BANNER_TEXT}</p>
        </div>
      )}
      <TaskEditor
        ref={editorRef}
        initialDoc={initialDoc}
        onChange={() => setDirty(true)}
      />
      {isTestEnv() && (
        <button
          type="button"
          data-testid="force-save"
          onClick={handleSave}
          style={{ position: 'absolute', left: -9999 }}
          aria-hidden
        />
      )}
    </div>
  );
}

function isTestEnv(): boolean {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
}
