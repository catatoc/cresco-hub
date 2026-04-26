import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Proyectos' }]} />
      <div className="flex-1 overflow-auto p-10 max-w-[1100px] mx-auto w-full">
        <div className="flex items-baseline gap-2.5 mb-5">
          <div className="h-6 w-32 bg-[#f7f7f8] rounded animate-pulse" />
          <div className="h-3 w-16 bg-[#f7f7f8] rounded animate-pulse" />
        </div>
        <div className="h-8 w-80 bg-[#f7f7f8] rounded-lg animate-pulse mb-5" />
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-border p-4 bg-white space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-[#f7f7f8] rounded-md animate-pulse" />
                <div className="flex-1 h-4 bg-[#f7f7f8] rounded animate-pulse" />
                <div className="w-20 h-5 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
              <div className="h-9 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 bg-[#f7f7f8] rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
