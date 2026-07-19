import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { requireContext } from '@/lib/auth/require-context';
import { loadPortalMeetings } from '@/lib/portal/meeting';
import type { PortalLocale } from '@/lib/portal/i18n';
import { MeetingsIndex } from '@/components/portal/meetings-index';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.metadata');
  return { title: `crescō · ${t('meetings')}` };
}

export default async function MeetingsPage() {
  const ctx = await requireContext();
  const locale: PortalLocale = (await getLocale()) === 'en' ? 'en' : 'es';
  const meetings = await loadPortalMeetings(ctx, locale);
  return <MeetingsIndex meetings={meetings} />;
}
