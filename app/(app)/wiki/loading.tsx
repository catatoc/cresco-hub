import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
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
          <div className="h-[180px] bg-gradient-to-br from-[#5e6ad2]/70 to-[#7c5fd0]/70 animate-pulse" />
          <article className="px-16 pt-0 pb-20 max-w-[800px] mx-auto">
            <div className="text-[60px] mt-[-48px] relative leading-none mb-[18px]">📄</div>
            <div className="h-10 w-96 bg-[#f7f7f8] rounded animate-pulse mb-5" />
            <div className="h-20 bg-[#f7f7f8] rounded-lg animate-pulse mb-9" />
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 bg-[#f7f7f8] rounded animate-pulse" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
              ))}
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
