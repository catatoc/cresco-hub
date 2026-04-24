import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Reuniones' }, { label: 'Cargando…', muted: true }]} />
      <div className="flex-1 grid grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-auto p-7">
          <div className="rounded-xl border border-[#dfe1f2] bg-gradient-to-b from-[#fbfcff] to-white p-6 mb-7 space-y-3">
            <div className="h-4 w-56 bg-[#eeeffc] rounded animate-pulse" />
            <div className="h-6 w-80 bg-[#f7f7f8] rounded animate-pulse" />
            <div className="h-12 w-full bg-[#f7f7f8] rounded animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 w-28 bg-[#5e6ad2]/30 rounded-md animate-pulse" />
              <div className="h-8 w-32 bg-[#f7f7f8] rounded-md animate-pulse" />
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
        <aside className="border-l border-border bg-[#f7f7f8] p-5 space-y-2">
          <div className="h-3 w-20 bg-[#f7f7f8] rounded animate-pulse" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-md bg-white border border-border space-y-1.5">
              <div className="h-3 w-20 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-4 w-full bg-[#f7f7f8] rounded animate-pulse" />
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
