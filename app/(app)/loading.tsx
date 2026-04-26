import { Topbar } from '@/components/shell/topbar';
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-10 py-10 max-w-[980px] mx-auto w-full">
          <div className="mb-8 space-y-1.5">
            <Skeleton className="h-3.5 w-56" />
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="grid grid-cols-4 gap-2 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-[#f7f7f8] border border-border rounded-lg px-4 py-3.5 space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-10" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <div className="space-y-3 mb-8">
            <Skeleton className="h-4 w-40" />
            <div className="border border-border rounded-lg bg-white overflow-hidden">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2.5 px-3.5 py-2.5 border-b last:border-b-0 border-border">
                  <Skeleton className="h-3.5 w-3.5 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 flex-1 max-w-[300px]" />
                  <Skeleton className="h-5 w-14 rounded" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-5">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      </div>
    </>
  );
}
