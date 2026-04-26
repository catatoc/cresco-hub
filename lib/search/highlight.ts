export type HighlightSegment = { text: string; match: boolean };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Splits `text` into segments marking which parts match `query`
 * (case-insensitive). Empty/no-match queries return a single
 * non-matching segment.
 */
export function highlightMatch(text: string, query: string): HighlightSegment[] {
  if (!query) return [{ text, match: false }];

  const re = new RegExp(escapeRegex(query), 'gi');
  const segments: HighlightSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index), match: false });
    }
    segments.push({ text: m[0], match: true });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex += 1;
  }

  if (segments.length === 0) return [{ text, match: false }];
  if (last < text.length) segments.push({ text: text.slice(last), match: false });
  return segments;
}
