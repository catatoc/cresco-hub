import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <div className="contents [view-transition-name:main-content]">
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: 'Cargando…', muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7">
          <div className="rounded-xl border border-[#dfe1f2] bg-gradient-to-b from-[#fbfcff] to-white p-6 mb-7 space-y-3">
            <div className="h-4 w-56 bg-[#eeeffc] rounded animate-pulse" />
            <div className="h-6 w-80 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-3 w-[60%] bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-3 w-[45%] bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-12 w-full bg-[#f7f7f8] rounded animate-pulse mt-4" />
            <div className="flex gap-2">
              <div className="h-8 w-28 bg-[#5e6ad2]/30 rounded-md animate-pulse" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-3 w-24 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="border border-border rounded-lg bg-white p-4 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-4 bg-[#f7f7f8] rounded animate-pulse" />
              ))}
            </div>
          </div>
        </div>
        <aside className="border-l border-border bg-[#f7f7f8] p-5 space-y-4">
          <div className="h-3 w-20 bg-[#e5e5e5] rounded animate-pulse" />
          {[0, 1].map((g) => (
            <div key={g} className="space-y-2.5">
              <div className="h-2.5 w-16 bg-[#e5e5e5] rounded animate-pulse" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="pl-3 border-l-2 border-[#e5e5e5] py-1 space-y-1.5">
                  <div className="h-2.5 w-20 bg-[#e5e5e5] rounded animate-pulse" />
                  <div className="h-3 w-[80%] bg-[#e5e5e5] rounded animate-pulse" />
                  <div className="h-2.5 w-[95%] bg-[#eee] rounded animate-pulse" />
                  <div className="h-2.5 w-[70%] bg-[#eee] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
