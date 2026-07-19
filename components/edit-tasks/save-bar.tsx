'use client';

import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type Props = {
  dirty: boolean;
  saving: boolean;
  /**
   * False when the doc contains unsupported blocks that would crash
   * the Notion append endpoint. Disables Guardar even if dirty.
   */
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function SaveBar({ dirty, saving, canSave, onSave, onCancel }: Props) {
  const t = useTranslations('editTasks.saveBar');
  const guardarDisabled = !dirty || !canSave || saving;

  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#5e6ad2]">
        <Pencil className="w-3 h-3" aria-hidden />
        {t('editing')}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className={cn(
            'px-3 py-1.5 rounded-md text-[12px] font-medium',
            'border border-border bg-white text-[#2c2c2e]',
            'hover:bg-[#f7f7f8] active:bg-[#f0f0f1]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={guardarDisabled}
          className={cn(
            'px-3 py-1.5 rounded-md text-[12px] font-medium text-white',
            'bg-[linear-gradient(135deg,#5e6ad2_0%,#8ba1d9_100%)] shadow-[0_1px_2px_rgba(94,106,210,.25)]',
            'hover:brightness-105 active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5e6ad2]',
            'disabled:opacity-60 disabled:pointer-events-none',
          )}
        >
          {saving ? t('saving') : t('save')}
        </button>
      </div>
    </div>
  );
}
