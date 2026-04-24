'use client';

import { useRouter } from 'next/navigation';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { buttonVariants } from '@/components/ui/button';
import type { Task } from '@/schemas/task';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_STYLE: Record<string, string> = {
  Backlog: 'bg-[#f7f7f8] text-muted-foreground',
  'Por hacer': 'bg-[#f7f7f8] text-[#57575c]',
  'En progreso': 'bg-[#eeeffc] text-[#5e6ad2]',
  Hecho: 'bg-[#e8f5ec] text-[#3f9f5c]',
};

type Props = { task: Task; blocks: any[] };

export function TaskDrawer({ task, blocks }: Props) {
  const router = useRouter();

  return (
    <Sheet
      defaultOpen
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto p-6">
        <div className="mb-4">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
            {task.number && <span className="font-medium">{task.number}</span>}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                STATUS_STYLE[task.status] ?? ''
              }`}
            >
              {task.status}
            </span>
          </div>
          <SheetTitle className="text-[20px] tracking-[-0.01em] leading-[1.2]">
            {task.title}
          </SheetTitle>
        </div>

        <div className="grid grid-cols-[110px_1fr] gap-y-2 gap-x-4 text-[12px] mb-6 p-3.5 rounded-lg bg-[#f7f7f8] border border-border">
          <span className="text-muted-foreground">Prioridad</span>
          <span>{task.priority ?? '—'}</span>
          <span className="text-muted-foreground">Fecha</span>
          <span>
            {task.dueDate
              ? format(new Date(task.dueDate), "d 'de' MMMM", { locale: es })
              : '—'}
          </span>
          <span className="text-muted-foreground">Ciclo</span>
          <span>{task.cycle ?? '—'}</span>
          <span className="text-muted-foreground">Etiquetas</span>
          <span>{task.labels.join(', ') || '—'}</span>
        </div>

        {blocks.length > 0 ? (
          <div className="mb-6">
            <BlocksRenderer blocks={blocks} />
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground mb-6">Sin descripción.</p>
        )}

        <div className="pt-4 border-t border-border">
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Abrir en Notion <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}
