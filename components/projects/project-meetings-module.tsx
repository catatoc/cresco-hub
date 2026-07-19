import Link from 'next/link';
import { Calendar } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import type { Meeting } from '@/schemas/meeting';

function ts(m: Meeting): number {
  return new Date(m.date ?? m.createdTime).getTime();
}

function fmt(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function ProjectMeetingsModule({ meetings }: { meetings: Meeting[] }) {
  const t = useTranslations('projects.meetings');
  const locale = useLocale();

  if (meetings.length === 0) {
    return (
      <Module title={t('title')}>
        <p className="text-[12px] text-muted-foreground py-3">
          {t('empty')}
        </p>
      </Module>
    );
  }

  const sorted = [...meetings].sort((a, b) => ts(b) - ts(a));
  const visible = sorted.slice(0, 3);

  return (
    <Module
      title={t('title')}
      action={meetings.length > 3 ? <Link href="/reuniones" className="text-[11px] text-[#5e6ad2] hover:underline">{t('viewAll')}</Link> : null}
    >
      <ul className="divide-y divide-[#f5f5f8]">
        {visible.map((m) => {
          const actions = m.taskIds.length;
          return (
            <li key={m.id}>
              <Link
                href={`/reuniones/${m.id}`}
                className="block py-2.5 px-1 -mx-1 rounded hover:bg-[#fafbff] transition-colors"
              >
                <div className="text-[12.5px] font-medium truncate">{m.title}</div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5">
                  {[
                    m.date ? fmt(m.date, locale) : null,
                    m.meetingType,
                    actions > 0 ? t('actions', { count: actions }) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </Module>
  );
}

function Module({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white border border-border rounded-xl px-4 py-3.5">
      <header className="flex items-center justify-between mb-2">
        <h2 className="text-[12px] font-semibold flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
