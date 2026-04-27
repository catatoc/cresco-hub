type Props = { now: Date; start: Date | null; end: Date | null };

export function isLive({ now, start, end }: Props): boolean {
  if (!start) return false;
  if (!end) return now.getTime() >= start.getTime() && now.getTime() < start.getTime() + 3600_000;
  return now.getTime() >= start.getTime() && now.getTime() <= end.getTime();
}

export function LiveBadge() {
  return (
    <span
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#3f9f5c] text-white text-[10px] font-bold uppercase tracking-[0.04em] shrink-0"
    >
      <span aria-hidden className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
      En vivo
    </span>
  );
}
