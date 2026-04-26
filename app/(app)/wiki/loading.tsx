import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <div className="contents [view-transition-name:main-content]">
      <Topbar crumbs={[{ label: 'Wiki' }]} />
      <div className="flex-1 grid grid-cols-[260px_1fr] overflow-hidden">
        <aside className="border-r border-border bg-[#f7f7f8] p-2 space-y-1.5">
          <div className="h-7 bg-white border border-border rounded-md animate-pulse" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-2 px-1.5 py-1">
              <div className="w-3.5 h-3.5 bg-[#e1e1e4] rounded animate-pulse" />
              <div className="h-3 flex-1 bg-[#e1e1e4] rounded animate-pulse" />
            </div>
          ))}
        </aside>
        <div className="overflow-auto">
          <div className="h-[180px] bg-[#f0f0f2] animate-pulse" />
          <article className="px-16 pt-0 pb-20 max-w-[800px] mx-auto">
            <div className="w-[60px] h-[60px] mt-[-30px] relative rounded-md bg-[#e8e8ec] animate-pulse mb-[18px]" />
            <div className="h-10 w-96 bg-[#f0f0f2] rounded animate-pulse mb-5" />
            <div className="h-20 bg-[#f7f7f8] rounded-lg animate-pulse mb-9" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-[#f7f7f8] rounded animate-pulse" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
              ))}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
