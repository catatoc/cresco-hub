export default function Loading() {
  return (
    <article className="flex flex-col h-full overflow-hidden">
      {/* Header skeleton */}
      <div className="h-11 border-b border-border flex items-center px-4 gap-3 shrink-0 bg-white">
        <div className="h-5 w-16 bg-[#f7f7f8] rounded animate-pulse" />
        <div className="h-4 w-12 bg-[#eeeff1] rounded animate-pulse" />
        <span className="text-muted-foreground">/</span>
        <div className="h-4 w-24 bg-[#f7f7f8] rounded animate-pulse" />
      </div>

      {/* Body skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_280px] overflow-hidden">
        <div className="overflow-y-auto bg-white min-w-0">
          <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7 lg:py-8">
            <div className="h-6 sm:h-7 w-3/4 bg-[#eeeff1] rounded animate-pulse mb-3" />
            <hr className="border-border mt-5 sm:mt-6 mb-5 sm:mb-6" />
            <div className="space-y-3">
              <div className="h-3 w-full bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-5/6 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-2/3 bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-full bg-[#f7f7f8] rounded animate-pulse" />
              <div className="h-3 w-4/6 bg-[#f7f7f8] rounded animate-pulse" />
            </div>
          </div>
        </div>

        <aside className="hidden lg:block border-l border-border bg-[#fafafa] p-5">
          <div className="h-3 w-20 bg-[#e1e1e4] rounded animate-pulse mb-4" />
          <div className="flex flex-col gap-3.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="h-2.5 w-16 bg-[#eeeff1] rounded animate-pulse mb-1.5" />
                <div className="h-4 w-24 bg-[#f7f7f8] rounded animate-pulse" />
              </div>
            ))}
          </div>
        </aside>
      </div>
    </article>
  );
}
