'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCreateContext } from './create-provider';

export function CreateTrigger() {
  const { open } = useCreateContext();
  const t = useTranslations('create.trigger');
  return (
    <button
      onClick={() => open()}
      aria-label={t('ariaLabel')}
      aria-keyshortcuts="c"
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[5px] text-[13px] font-normal text-muted-foreground hover:bg-black/[0.04] hover:text-foreground transition-colors cursor-pointer"
    >
      <Plus className="w-3.5 h-3.5" />
      <span className="flex-1 text-left">{t('label')}</span>
      <kbd className="text-[10px] px-1 py-0.5 rounded bg-black/[0.06] text-muted-foreground font-[inherit]">
        C
      </kbd>
    </button>
  );
}
