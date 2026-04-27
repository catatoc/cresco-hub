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
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[260px_1fr] overflow-hidden">
        <div className="hidden lg:block min-h-0">
          <WikiTree pages={pages} />
        </div>
        <div className="overflow-auto min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-0">
          {children}
        </div>
      </div>
    </>
  );
}
