'use client';

import { useEffect, useId, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from 'next-themes';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

let initialized = false;

export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const id = `mermaid-${rawId.replace(/:/g, '')}`;
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        fontFamily: 'inherit',
      });
      initialized = true;
    }

    let cancelled = false;
    const theme = resolvedTheme === 'dark' ? 'dark' : 'default';

    (async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          fontFamily: 'inherit',
          theme,
        });
        const { svg: rendered } = await mermaid.render(id, chart.trim());
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Mermaid render error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  useEffect(() => {
    if (open && modalContainerRef.current && svg) {
      modalContainerRef.current.innerHTML = svg;
    }
  }, [open, svg]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(s * 1.2, 8));
      if (e.key === '-') setScale((s) => Math.max(s / 1.2, 0.2));
      if (e.key === '0') {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const openModal = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setOpen(true);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    setScale((s) => Math.min(Math.max(s * (delta > 0 ? 1.1 : 0.9), 0.2), 8));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.baseX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.baseY + (e.clientY - dragRef.current.startY),
    });
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  if (error) {
    return (
      <pre className="p-3 rounded-md bg-[#fef2f2] text-[12px] font-mono overflow-auto my-3 text-[#991b1b] border border-[#fecaca]">
        <code>{error}{'\n\n'}{chart}</code>
      </pre>
    );
  }

  return (
    <>
      <div
        onClick={openModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal();
          }
        }}
        className="my-4 flex items-center justify-center overflow-x-auto max-w-full cursor-zoom-in rounded-md hover:bg-[#f7f7f8] active:bg-[#f0f0f2] transition-colors p-2 min-h-[140px] sm:min-h-[200px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:max-w-full [&_svg]:h-auto"
        title="Click para ampliar"
      >
        {svg ? (
          <div className="w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="w-full h-[140px] sm:h-[180px] bg-[#f7f7f8] rounded-md animate-pulse" />
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex flex-col"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] text-white">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setScale((s) => Math.max(s / 1.2, 0.2))}
                className="p-2 rounded hover:bg-white/10"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-[12px] tabular-nums w-12 text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale((s) => Math.min(s * 1.2, 8))}
                className="p-2 rounded hover:bg-white/10"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setScale(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="p-2 rounded hover:bg-white/10"
                aria-label="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-2 rounded hover:bg-white/10"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            className="flex-1 overflow-hidden flex items-center justify-center select-none pb-[env(safe-area-inset-bottom)]"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ cursor: dragRef.current ? 'grabbing' : 'grab' }}
          >
            <div
              ref={modalContainerRef}
              className="bg-white rounded-md p-6 shadow-2xl [&_svg]:max-w-none [&_svg]:h-auto"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                transition: dragRef.current ? 'none' : 'transform 120ms ease-out',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
