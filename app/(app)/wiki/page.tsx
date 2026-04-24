import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import type { WikiPage } from '@/schemas/wiki';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WikiIndexPage() {
  const ctx = await requireContext();
  const pages = await queryWikiByCustomer(ctx.customerId);

  if (pages.length === 0) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Wiki' }]} />
        <div className="p-10 text-muted-foreground">
          Tu proyecto aún no tiene páginas de wiki.
        </div>
      </>
    );
  }

  // Land on the most recently edited page (the wiki query sorts by last_edited_time desc).
  const first: WikiPage = pages[0]!;
  redirect(`/wiki/${first.id}`);
}
