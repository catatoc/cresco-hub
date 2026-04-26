'use client';

import { useEffect, useState, type Ref } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useCreateContext } from './create-provider';
import { useCreateContext as useInheritedContext } from '@/hooks/use-create-context';
import { ChipProject } from './chips/chip-project';
import { ChipMeeting } from './chips/chip-meeting';
import { ChipCategory } from './chips/chip-category';
import type { WikiCategory } from '@/schemas/wiki';

type ChipValue = { id: string; label: string };

const EMOJI_CHOICES = ['📄', '📘', '📙', '📕', '📗', '🗂', '📋', '✨', '🚀', '🐛'];

export function WikiForm({
  customerId,
  title,
  onTitleChange,
  titleRef,
}: {
  customerId: string;
  title: string;
  onTitleChange: (v: string) => void;
  titleRef: Ref<HTMLInputElement>;
}) {
  const router = useRouter();
  const { close } = useCreateContext();
  const inherited = useInheritedContext();

  const [emoji, setEmoji] = useState('📄');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [categories, setCategories] = useState<WikiCategory[]>([]);
  const [project, setProject] = useState<ChipValue | null>(
    inherited.projectId ? { id: inherited.projectId, label: 'Proyecto heredado' } : null,
  );
  const [meeting, setMeeting] = useState<ChipValue | null>(
    inherited.meetingId ? { id: inherited.meetingId, label: 'Reunión heredada' } : null,
  );
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
          type: 'wiki',
          customerId,
          title: title.slice(0, 200),
          emoji,
          categories,
          projectId: project?.id ?? null,
          meetingId: meeting?.id ?? null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? 'No pude crear la wiki');
        setSubmitting(false);
        return;
      }
      const created = await res.json();
      if (opts.another) {
        toast.success('Wiki creada', {
          action: { label: 'Abrir', onClick: () => router.push(`/wiki/${created.id}`) },
        });
        onTitleChange('');
        setCategories([]);
        setSubmitting(false);
        if (titleRef && 'current' in titleRef && titleRef.current) {
          titleRef.current.focus();
        }
      } else {
        close();
        router.push(`/wiki/${created.id}`);
      }
    } catch {
      toast.error('No pude crear la wiki. Reintentar');
      setSubmitting(false);
    }
  }

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
  }, [title, emoji, categories, project, meeting]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="text-lg w-8 h-8 inline-flex items-center justify-center rounded bg-amber-50 hover:bg-amber-100"
            aria-label="Cambiar emoji"
          >
            {emoji}
          </button>
          {emojiOpen && (
            <div className="absolute z-50 mt-1 left-0 bg-popover border rounded-md shadow-md p-1 grid grid-cols-5 gap-1">
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => { setEmoji(e); setEmojiOpen(false); }}
                  className="text-lg w-7 h-7 hover:bg-black/[0.04] rounded"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </span>
        <input
          ref={titleRef}
          autoFocus
          placeholder="Título de la página…"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 text-base outline-none bg-transparent placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex flex-wrap gap-1.5 pt-2 border-t">
        <ChipCategory value={categories} onChange={setCategories} />
        <ChipProject value={project} onChange={setProject} />
        <ChipMeeting value={meeting} onChange={setMeeting} />
      </div>
      <div className="flex items-center justify-between pt-2">
        <label className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={createAnother}
            onChange={(e) => setCreateAnother(e.target.checked)}
            aria-label="Crear otra"
          />
          <span aria-hidden="true">Crear otra (⇧⌘↵)</span>
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
            {submitting ? 'Creando…' : 'Crear y abrir ⌘↵'}
          </button>
        </div>
      </div>
    </div>
  );
}
