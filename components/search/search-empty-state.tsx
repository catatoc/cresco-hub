'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CommandGroup } from '@/components/ui/command';
import { SearchItemRow } from './search-item';
import { useSearchSuggestions } from '@/hooks/use-search-suggestions';
import type { RecentItem } from '@/hooks/use-search-recents';
import type { SearchItem } from '@/lib/search/types';

export function SearchEmptyState({
  customerId,
  recents,
  onOpenRecent,
  onClose,
}: {
  customerId: string;
  recents: RecentItem[];
  onOpenRecent: (item: RecentItem, opts: { metaKey?: boolean }) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const t = useTranslations('search');
  const { data: sug } = useSearchSuggestions(customerId, true);

  const recentAsItems: SearchItem[] = recents.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    url: r.url,
    meta: {},
    score: 0,
  }));

  return (
    <>
      {(sug?.todayMeeting || sug?.dueToday || sug?.activeSprint) && (
        <CommandGroup heading={t('empty.suggestions')}>
          {sug?.todayMeeting && (
            <SearchItemRow
              term=""
              item={{
                id: sug.todayMeeting.id,
                type: 'meeting',
                title: sug.todayMeeting.title,
                url: `/reuniones/${sug.todayMeeting.id}`,
                meta: { date: sug.todayMeeting.date },
                score: 0,
              }}
              onSelect={() => {
                router.push(`/reuniones/${sug.todayMeeting!.id}`);
                onClose();
              }}
            />
          )}
          {sug?.dueToday && sug.dueToday.count > 0 && (
            <SearchItemRow
              term=""
              item={{
                id: 'due-today',
                type: 'task',
                title: t('empty.dueToday', { count: sug.dueToday.count }),
                url: '/tareas',
                meta: {},
                score: 0,
              }}
              onSelect={() => {
                router.push('/tareas');
                onClose();
              }}
            />
          )}
          {sug?.activeSprint && (
            <SearchItemRow
              term=""
              item={{
                id: 'active-sprint',
                type: 'project',
                title: `${t('empty.activeSprint', { name: sug.activeSprint.name })}${sug.activeSprint.daysLeft != null ? ` (${t('empty.daysLeft', { days: sug.activeSprint.daysLeft })})` : ''}`,
                url: '/tareas',
                meta: {},
                score: 0,
              }}
              onSelect={() => {
                router.push('/tareas');
                onClose();
              }}
            />
          )}
        </CommandGroup>
      )}

      {recentAsItems.length > 0 && (
        <CommandGroup heading={t('empty.recents')}>
          {recentAsItems.map((it, i) => (
            <SearchItemRow
              key={it.id}
              term=""
              item={it}
              showShortcut={i === 0}
              onSelect={(opts) => onOpenRecent(recents[i]!, opts)}
            />
          ))}
        </CommandGroup>
      )}

      <CommandGroup heading={t('empty.actions')}>
        <SearchItemRow
          term=""
          item={{
            id: 'action-new-task',
            type: 'task',
            title: t('empty.newTask'),
            url: '/tareas',
            meta: { emoji: '➕' },
            score: 0,
          }}
          onSelect={() => {
            router.push('/tareas');
            onClose();
          }}
        />
      </CommandGroup>
    </>
  );
}
