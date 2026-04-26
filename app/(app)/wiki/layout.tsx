import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import { WikiTree } from '@/components/wiki/tree';
import { WikiTopbar } from '@/components/wiki/topbar';

export const dynamic = 'force-dynamic';

export default async function WikiLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  const pages = await queryWikiByCustomer(ctx.customerId);

  if (pages.length === 0) {
    return <>{children}</>;
  }

  return (
    <>
      <WikiTopbar pages={pages} />
      <div className="flex-1 grid grid-cols-[260px_1fr] overflow-hidden">
        <WikiTree pages={pages} />
        <div className="overflow-auto">{children}</div>
      </div>
    </>
  );
}
