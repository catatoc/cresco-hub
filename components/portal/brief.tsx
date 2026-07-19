'use client';

// El brief: bloques de una página de Notion (proyecto o propuesta) en
// lenguaje crescō. Compartido entre el drawer del proyecto y la cápsula.
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { BriefMermaid } from './brief-mermaid';
import type { ProjectBlock } from '@/lib/portal/content';

export function Brief({ blocks }: { blocks: ProjectBlock[] }) {
  const t = useTranslations('portal.brief');
  let num = 0;
  return (
    <>
      {blocks.map((b, i) => {
        const d = { '--d': `${0.05 + Math.min(i, 14) * 0.035}s` } as CSSProperties;
        if (b.kind !== 'oli') num = 0;
        switch (b.kind) {
          case 'h1':
          case 'h2':
            return <div className="cp-bh cp-rb" style={d} key={i}>{b.text}</div>;
          case 'h3':
            return <div className="cp-bh3 cp-rb" style={d} key={i}>{b.text}</div>;
          case 'li':
            return <div className="cp-bli cp-rb" style={d} key={i}><i />{b.text}</div>;
          case 'oli':
            num += 1;
            return <div className="cp-bli cp-rb" style={d} key={i}><span className="cp-bnum">{num}.</span>{b.text}</div>;
          case 'callout':
            return <div className="cp-bcall cp-rb" style={d} key={i}>{b.icon && <span className="cp-bico">{b.icon}</span>}<span>{b.text}</span></div>;
          case 'quote':
            return <div className="cp-bq cp-rb" style={d} key={i}>{b.text}</div>;
          case 'mermaid':
            return <div className="cp-rb" style={d} key={i}><BriefMermaid chart={b.text} /></div>;
          case 'img':
            return (
              <figure className="cp-bimg cp-rb" style={d} key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.url} alt={b.text || t('imageAlt')} loading="lazy" />
                {b.text && <figcaption>{b.text}</figcaption>}
              </figure>
            );
          case 'divider':
            return <hr className="cp-bdiv" key={i} />;
          default:
            return <p className="cp-bp cp-rb" style={d} key={i}>{b.text}</p>;
        }
      })}
    </>
  );
}

export function BriefSkeleton() {
  const w = [60, 92, 84, 0, 40, 88, 76, 64];
  return (
    <div style={{ paddingTop: 6 }}>
      {w.map((pct, i) =>
        pct ? (
          <span key={i} className="cp-sk" style={{ width: `${pct}%`, height: 12, display: 'block', marginBottom: 12 }} />
        ) : (
          <span key={i} style={{ display: 'block', height: 10 }} />
        ),
      )}
    </div>
  );
}
