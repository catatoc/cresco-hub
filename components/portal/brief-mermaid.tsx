'use client';

// Diagrama mermaid dentro del brief del proyecto, en lenguaje crescō.
// La librería se carga lazy (solo si el brief trae un diagrama) y el SVG
// se renderiza con la paleta lino/moss/tinta. Si el código no compila,
// el diagrama simplemente no se muestra (el brief sigue siendo legible).
import { useEffect, useId, useState } from 'react';

let themed = false;

async function getMermaid() {
  const mermaid = (await import('mermaid')).default;
  if (!themed) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      fontFamily: "Inter, -apple-system, 'Segoe UI', sans-serif",
      theme: 'base',
      themeVariables: {
        background: '#F7F3EA',
        primaryColor: '#DAE2D9',
        primaryBorderColor: '#3D5240',
        primaryTextColor: '#1A1612',
        secondaryColor: '#EFEAE0',
        secondaryBorderColor: '#D4CCBC',
        tertiaryColor: '#F7F3EA',
        tertiaryBorderColor: '#D4CCBC',
        lineColor: '#5C544A',
        textColor: '#1A1612',
        fontSize: '13px',
      },
    });
    themed = true;
  }
  return mermaid;
}

export function BriefMermaid({ chart }: { chart: string }) {
  const rawId = useId();
  const id = `cp-mm-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = await getMermaid();
        const { svg: rendered } = await mermaid.render(id, chart.trim());
        if (!cancelled) setSvg(rendered);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [chart, id]);

  if (failed) return null;
  if (!svg) return <span className="cp-sk cp-bmm-sk" />;
  return <div className="cp-bmm" dangerouslySetInnerHTML={{ __html: svg }} />;
}
