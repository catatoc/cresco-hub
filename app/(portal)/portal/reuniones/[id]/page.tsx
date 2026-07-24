import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { requireContext } from '@/lib/auth/require-context';
import { loadPortalMeeting } from '@/lib/portal/meeting';
import type { PortalLocale } from '@/lib/portal/i18n';
import { MeetingPage } from '@/components/portal/meeting-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.metadata');
  return { title: `crescō · ${t('meeting')}` };
}

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const locale: PortalLocale = (await getLocale()) === 'en' ? 'en' : 'es';
  const meeting = await loadPortalMeeting(ctx, id, locale);
  if (!meeting) notFound();
  return <MeetingPage meeting={meeting} />;
}
