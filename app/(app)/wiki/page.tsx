import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByClient } from '@/lib/notion/wiki';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WikiIndexPage() {
  const ctx = await requireContext();
  const pages = await queryWikiByClient(ctx.customerId);

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

  const firstRoot = pages.find((p) => !p.parentId) ?? pages[0];
  if (!firstRoot) {
    return (
      <>
        <Topbar crumbs={[{ label: 'Wiki' }]} />
        <div className="p-10 text-muted-foreground">
          Tu proyecto aún no tiene páginas de wiki.
        </div>
      </>
    );
  }
  redirect(`/wiki/${firstRoot.id}`);
}
