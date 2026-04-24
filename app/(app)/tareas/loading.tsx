import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: 'Sprint activo', muted: true }]} />
      <div className="flex-1 flex flex-col overflow-hidden px-5 pt-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="h-4 w-28 bg-[#f7f7f8] rounded animate-pulse" />
          <div className="h-5 w-24 bg-[#eeeffc] rounded-md animate-pulse" />
          <div className="h-4 w-36 bg-[#f7f7f8] rounded animate-pulse" />
        </div>
        <div className="flex-1 grid grid-cols-4 gap-2.5 pb-5 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-[#fafafa] border border-border rounded-lg p-2 min-h-full space-y-1.5">
              <div className="flex items-center gap-2 px-1 pt-1 pb-2 border-b border-border mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#e1e1e4] animate-pulse" />
                <div className="h-3 w-20 bg-[#e1e1e4] rounded animate-pulse" />
              </div>
              {[0, 1, 2].map((j) => (
                <div key={j} className="bg-white border border-border rounded-md p-2.5 space-y-2">
                  <div className="h-2 w-12 bg-[#f7f7f8] rounded animate-pulse" />
                  <div className="h-3 w-full bg-[#f7f7f8] rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-[#f7f7f8] rounded animate-pulse" />
                  <div className="flex gap-1.5">
                    <div className="h-4 w-14 bg-[#f7f7f8] rounded animate-pulse" />
                    <div className="h-4 w-10 bg-[#f7f7f8] rounded animate-pulse ml-auto" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
