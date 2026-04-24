const DAY_MS = 86_400_000;

export function scoreMatch(
  term: string,
  title: string,
  meta?: { date?: string | null },
): number {
  if (!term) return 0;
  const t = term.toLowerCase();
  const ti = title.toLowerCase();

  let score = 0;
  if (ti === t) score = 100;
  else if (ti.startsWith(t)) score = 50;
  else if (ti.includes(t)) score = 20;
  else {
    for (let i = 0; i < t.length; i++) {
      const candidate = t.slice(0, i) + t.slice(i + 1);
      if (candidate.length >= 2 && ti.includes(candidate)) {
        score = 5;
        break;
      }
    }
  }

  if (score > 0 && meta?.date) {
    const d = Date.parse(meta.date);
    if (!Number.isNaN(d) && Math.abs(Date.now() - d) <= 7 * DAY_MS) {
      score += 10;
    }
  }
  return score;
}

export function sortByScoreDesc<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score);
}
