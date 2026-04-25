import { Fragment } from 'react';

export function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const t = term.toLowerCase();
  const parts: Array<{ s: string; match: boolean }> = [];
  let i = 0;
  const lower = text.toLowerCase();
  while (i < text.length) {
    const idx = lower.indexOf(t, i);
    if (idx === -1) {
      parts.push({ s: text.slice(i), match: false });
      break;
    }
    if (idx > i) parts.push({ s: text.slice(i, idx), match: false });
    parts.push({ s: text.slice(idx, idx + t.length), match: true });
    i = idx + t.length;
  }
  return (
    <>
      {parts.map((p, k) => (
        <Fragment key={k}>
          {p.match ? (
            <mark className="bg-[#fff3b0] text-foreground rounded-[2px] px-0.5">{p.s}</mark>
          ) : (
            p.s
          )}
        </Fragment>
      ))}
    </>
  );
}
