import { useTranslations } from 'next-intl';
import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  const t = useTranslations('testUsers.page');
  return (
    <>
      <Topbar crumbs={[{ label: t('breadcrumb') }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[900px] mx-auto w-full">
          <div className="mb-5 space-y-1.5">
            <div className="h-5 w-44 bg-[#f4f4f5] rounded animate-pulse" />
            <div className="h-3 w-72 bg-[#f4f4f5] rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white border border-border rounded-[10px] p-4 space-y-3"
              >
                <div className="h-4 w-40 bg-[#f4f4f5] rounded animate-pulse" />
                <div className="h-3 w-32 bg-[#f4f4f5] rounded animate-pulse" />
                <div className="space-y-2 pt-1">
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                  <div className="h-9 bg-[#f4f4f5] rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
