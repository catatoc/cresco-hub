'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useCreateContext } from './create-provider';
import { TareaForm } from './tarea-form';
import { WikiForm } from './wiki-form';

export function CreateModal({ customerId }: { customerId: string }) {
  const { isOpen, type, setType, close } = useCreateContext();

  // Title/description shared across type switches (preserved per spec).
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
    }
  }, [isOpen]);

  function handleOpenChange(open: boolean) {
    if (open) return;
    if (title.trim().length === 0) close();
    else if (window.confirm('¿Descartar?')) close();
  }

  const isTask = type === 'task';

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0">
        <DialogTitle className="sr-only">Crear {isTask ? 'tarea' : 'wiki'}</DialogTitle>
        <DialogDescription className="sr-only">
          Quick‑create modal. Tab to navigate, ⌘↵ to submit.
        </DialogDescription>

        <div className="px-4 pt-3 pb-2 flex items-center gap-1.5 border-b">
          <TypePill
            active={isTask}
            label="📝 Tarea"
            ariaLabel={`Tipo: Tarea${isTask ? ', activo' : ', presiona para cambiar a Tarea'}`}
            onClick={() => setType('task')}
          />
          <TypePill
            active={!isTask}
            label="📖 Wiki"
            ariaLabel={`Tipo: Wiki${!isTask ? ', activo' : ', presiona para cambiar a Wiki'}`}
            onClick={() => setType('wiki')}
          />
        </div>

        <div className="px-4 py-3">
          {isTask ? (
            <TareaForm
              customerId={customerId}
              title={title}
              onTitleChange={setTitle}
              description={description}
              onDescriptionChange={setDescription}
              titleRef={titleRef}
            />
          ) : (
            <WikiForm
              customerId={customerId}
              title={title}
              onTitleChange={setTitle}
              titleRef={titleRef}
            />
          )}
        </div>

        <div className="px-4 py-2.5 border-t bg-muted/40 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>⌘↵ Crear · ⇧⌘↵ Crear otra · Esc cerrar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TypePill({
  active,
  label,
  ariaLabel,
  onClick,
}: {
  active: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={active}
      onClick={onClick}
      className={
        'text-[12px] px-2.5 py-1 rounded-md transition-colors ' +
        (active
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:bg-black/[0.04]')
      }
    >
      {label}
    </button>
  );
}
