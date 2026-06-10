import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireContext } from '@/lib/auth/require-context';
import { loadPortalMeeting } from '@/lib/portal/meeting';
import { MeetingPage } from '@/components/portal/meeting-page';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'crescō · reunión',
};

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const meeting = await loadPortalMeeting(ctx, id);
  if (!meeting) notFound();
  return <MeetingPage meeting={meeting} />;
}
