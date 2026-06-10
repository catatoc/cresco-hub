import type { Metadata } from 'next';
import { requireContext } from '@/lib/auth/require-context';
import { loadPortalMeetings } from '@/lib/portal/meeting';
import { MeetingsIndex } from '@/components/portal/meetings-index';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'crescō · tus reuniones',
};

export default async function MeetingsPage() {
  const ctx = await requireContext();
  const meetings = await loadPortalMeetings(ctx);
  return <MeetingsIndex meetings={meetings} />;
}
