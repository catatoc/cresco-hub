'use client';

import { useRouter } from 'next/navigation';
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
        <CommandGroup heading="✨ Sugerencias para hoy">
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
                title: `${sug.dueToday.count} tareas vencen hoy`,
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
                title: `Sprint actual: ${sug.activeSprint.name}${sug.activeSprint.daysLeft != null ? ` (${sug.activeSprint.daysLeft}d restantes)` : ''}`,
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
        <CommandGroup heading="Recientes">
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

      <CommandGroup heading="Acciones">
        <SearchItemRow
          term=""
          item={{
            id: 'action-new-task',
            type: 'task',
            title: 'Nueva tarea',
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
