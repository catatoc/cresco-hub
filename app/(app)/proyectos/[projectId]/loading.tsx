export default function Loading() {
  return (
    <article className="flex flex-col h-full overflow-hidden">
      <div className="h-11 border-b border-border flex items-center pl-12 pr-3 sm:pr-4 lg:pl-4 gap-2 sm:gap-3 shrink-0">
        <div className="h-4 w-20 bg-[#eeeff1] rounded animate-pulse" />
        <span className="text-muted-foreground">/</span>
        <div className="h-4 w-40 bg-[#f7f7f8] rounded animate-pulse" />
      </div>
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 max-w-[1100px] mx-auto w-full">
          {/* hero */}
          <div className="bg-white border border-border rounded-xl px-5 sm:px-6 pt-5 pb-4 mb-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#eeeffc] animate-pulse shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-5 w-1/2 bg-[#eeeff1] rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-[#f7f7f8] rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
            </div>
          </div>
          {/* meta */}
          <div className="h-3 w-2/5 bg-[#f7f7f8] rounded animate-pulse mb-5" />
          {/* stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="bg-[#fafbff] border border-[#f0f0f4] rounded-xl h-[78px] animate-pulse" />
            ))}
          </div>
          {/* grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 lg:gap-4">
            <div className="space-y-3">
              <div className="bg-white border border-border rounded-xl h-44 animate-pulse" />
              <div className="bg-white border border-border rounded-xl h-36 animate-pulse" />
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-border rounded-xl h-28 animate-pulse" />
              <div className="bg-white border border-border rounded-xl h-36 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
