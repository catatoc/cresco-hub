import { getTranslations } from 'next-intl/server';
import { Topbar } from '@/components/shell/topbar';

export default async function Loading() {
  const t = await getTranslations('projects');
  return (
    <>
      <Topbar crumbs={[{ label: t('nav.projects') }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[1100px] mx-auto w-full">
          <div className="flex items-baseline gap-2.5 mb-5">
            <div className="h-6 w-32 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-3 w-16 bg-[#f7f7f8] rounded animate-pulse" />
          </div>
          <div className="h-9 sm:h-8 w-full max-w-[360px] bg-[#f7f7f8] rounded-lg animate-pulse mb-5" />
          <div className="grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 lg:gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-xl border border-border p-4 bg-white space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 bg-[#f7f7f8] rounded-md animate-pulse shrink-0" />
                  <div className="flex-1 h-4 bg-[#f7f7f8] rounded animate-pulse" />
                  <div className="w-20 h-5 bg-[#f7f7f8] rounded animate-pulse hidden sm:block shrink-0" />
                </div>
                <div className="h-9 bg-[#f7f7f8] rounded animate-pulse" />
                <div className="h-3 bg-[#f7f7f8] rounded animate-pulse" />
                <div className="h-3 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
