export default function Loading() {
  return (
    <div className="contents [view-transition-name:main-content]">
      <div className="h-[120px] sm:h-[150px] lg:h-[180px] bg-gradient-to-br from-[#5e6ad2] via-[#7c5fd0] to-[#c78a2c] relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_60%)]" />
      </div>
      <article className="px-4 sm:px-6 lg:px-16 pt-0 pb-12 sm:pb-16 lg:pb-20 max-w-[800px] mx-auto w-full min-w-0">
        <div className="w-[44px] h-[44px] sm:w-[52px] sm:h-[52px] lg:w-[60px] lg:h-[60px] mt-[-32px] sm:mt-[-40px] lg:mt-[-48px] relative rounded-md bg-[#e8e8ec] animate-pulse mb-3 sm:mb-4 lg:mb-[18px]" />
        <div className="h-9 sm:h-10 w-full max-w-[24rem] bg-[#f0f0f2] rounded animate-pulse mb-4 sm:mb-5" />
        <div className="h-20 bg-[#f7f7f8] rounded-lg animate-pulse mb-5 sm:mb-7 lg:mb-9" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 bg-[#f7f7f8] rounded animate-pulse" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
          ))}
        </div>
      </article>
    </div>
  );
}
