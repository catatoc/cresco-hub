import { getTranslations } from 'next-intl/server';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryWikiByCustomer } from '@/lib/notion/wiki';
import type { WikiPage } from '@/schemas/wiki';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/common/empty-state';

export const dynamic = 'force-dynamic';

export default async function WikiIndexPage() {
  const ctx = await requireContext();
  const pages = await queryWikiByCustomer(ctx.customerId);

  if (pages.length === 0) {
    const t = await getTranslations('wiki');
    return (
      <>
        <Topbar crumbs={[{ label: t('nav.wiki') }]} />
        <EmptyState icon="📚" title={t('index.emptyTitle')} description={t('index.emptyDescription')} />
      </>
    );
  }

  // Land on the most recently edited page (the wiki query sorts by last_edited_time desc).
  const first: WikiPage = pages[0]!;
  redirect(`/wiki/${first.id}`);
}
