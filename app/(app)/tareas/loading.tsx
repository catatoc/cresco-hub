import { Topbar } from '@/components/shell/topbar';

export default function Loading() {
  return (
    <>
      <Topbar crumbs={[{ label: 'Tareas' }, { label: 'Semana activa', muted: true }]} />
      <div className="flex-1 flex flex-col overflow-hidden px-3 sm:px-4 lg:px-5 pt-3 sm:pt-4 lg:pt-5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 mb-3 sm:mb-4">
          <div className="hidden sm:block h-4 w-28 bg-[#f7f7f8] rounded animate-pulse" />
          <div className="h-6 w-32 sm:w-24 bg-[#eeeffc] rounded-md animate-pulse" />
          <div className="h-6 w-20 bg-[#f7f7f8] rounded animate-pulse ml-auto" />
        </div>
        <div className="flex-1 flex gap-2.5 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-auto pb-[calc(1rem+env(safe-area-inset-bottom))] lg:pb-5">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="snap-start shrink-0 w-[80vw] sm:w-[300px] lg:w-auto lg:shrink bg-[#fafafa] border border-border rounded-lg p-2 min-h-full space-y-1.5"
            >
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
