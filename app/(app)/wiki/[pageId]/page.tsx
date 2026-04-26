import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByCustomer, getWikiPageBlocks } from '@/lib/notion/wiki';
import type { WikiPage } from '@/schemas/wiki';
import { BlocksRenderer } from '@/components/wiki/blocks-renderer';
import { PageProperties } from '@/components/wiki/page-properties';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function WikiPageView({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  const ctx = await requireContext();
  const { pageId } = await params;

  const [pages, blocks] = await Promise.all([
    queryWikiByCustomer(ctx.customerId),
    getWikiPageBlocks(pageId),
  ]);

  const page = pages.find((p: WikiPage) => p.id === pageId);
  if (!page) notFound();

  return (
    <>
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
    </>
  );
}
