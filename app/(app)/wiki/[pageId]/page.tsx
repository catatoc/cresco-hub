import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByClient, getWikiPageBlocks } from '@/lib/notion/wiki';
import { WikiTree } from '@/components/wiki/tree';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { PageProperties } from '@/components/wiki/page-properties';
import { notFound } from 'next/navigation';
import { Info } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const ctx = await requireContext();
  const { pageId } = await params;

  const [pages, blocks] = await Promise.all([
    queryWikiByClient(ctx.customerId),
    getWikiPageBlocks(pageId),
  ]);

  const page = pages.find((p) => p.id === pageId);
  if (!page) notFound();

  const parent = page.parentId ? pages.find((p) => p.id === page.parentId) : null;

  return (
    <>
      <Topbar
        crumbs={[
          { label: 'Wiki' },
          ...(parent ? [{ label: parent.title, muted: true }] : []),
          { label: page.title },
        ]}
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] text-muted-foreground border border-border bg-white">
          <Info className="w-3 h-3" /> Solo lectura
        </span>
      </Topbar>

      <div className="flex-1 grid grid-cols-[260px_1fr] overflow-hidden">
        <WikiTree pages={pages} />
        <div className="overflow-auto">
          {page.cover ? (
            <div
              className="h-[180px] bg-cover bg-center"
              style={{ backgroundImage: `url(${page.cover})` }}
            />
          ) : (
            <div className="h-[180px] bg-gradient-to-br from-[#5e6ad2] via-[#7c5fd0] to-[#c78a2c] relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
            </div>
          )}
          <article className="px-16 pt-0 pb-20 max-w-[800px] mx-auto">
            <div className="text-[60px] mt-[-48px] relative leading-none mb-[18px]">
              {page.icon ?? '📄'}
            </div>
            <h1 className="text-[34px] font-bold tracking-[-0.02em] leading-[1.15] mb-5">
              {page.title}
            </h1>
            <PageProperties page={page} />
            <BlocksRenderer blocks={blocks} />
          </article>
        </div>
      </div>
    </>
  );
}
