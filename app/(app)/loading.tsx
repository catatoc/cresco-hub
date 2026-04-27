import { Topbar } from '@/components/shell/topbar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 max-w-[980px] mx-auto w-full">
          <div className="mb-6 sm:mb-8 space-y-1.5">
            <Skeleton className="h-3.5 w-56 max-w-full" />
            <Skeleton className="h-7 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6 sm:mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#f7f7f8] border border-border rounded-lg px-3 py-3 sm:px-4 sm:py-3.5 space-y-1.5"
              >
                <Skeleton className="h-3 w-20 max-w-full" />
                <Skeleton className="h-6 w-10 max-w-full" />
                <Skeleton className="h-3 w-16 max-w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3 mb-6 sm:mb-8">
            <Skeleton className="h-4 w-40" />
            <div className="border border-border rounded-lg bg-white overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 px-3 sm:px-3.5 py-2.5 border-b last:border-b-0 border-border"
                >
                  <Skeleton className="h-3.5 w-3.5 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-10 shrink-0 hidden xs:block" />
                  <Skeleton className="h-3 flex-1 min-w-0 max-w-[300px]" />
                  <Skeleton className="h-5 w-14 rounded hidden sm:block" />
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <Skeleton className="h-32 md:h-40 rounded-lg" />
            <Skeleton className="h-32 md:h-40 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
