'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MASK = '••••••••';
const AUTO_HIDE_MS = 30_000;

type Props = {
  label: 'Usuario' | 'Clave' | 'URL';
  value: string;
  type: 'text' | 'password' | 'url';
};

export function CredentialField({ label, value, type }: Props) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!revealed) return;
    timerRef.current = setTimeout(() => setRevealed(false), AUTO_HIDE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [revealed]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(label === 'Clave' ? 'Clave copiada' : 'Copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const masked = type === 'password' && !revealed;
  const display = masked ? MASK : value || (type === 'url' ? '—' : '');

  return (
    <div className="flex items-center gap-2 px-2.5 py-2 bg-[#f7f7f8] border border-[#ececef] rounded-md text-[13px]">
      <span className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium w-[60px] shrink-0">
        {label}
      </span>
      <span
        className={cn(
          'flex-1 truncate text-foreground',
          type !== 'url' && 'font-mono text-[12.5px]',
        )}
      >
        {type === 'url' && value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#2563eb] hover:underline"
          >
            {stripProtocol(value)}
          </a>
        ) : (
          display
        )}
      </span>
      <span className="flex items-center gap-1 text-muted-foreground shrink-0">
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Ocultar clave' : 'Mostrar clave'}
            className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        {type === 'url' && value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir URL"
            className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copiar ${label.toLowerCase()}`}
          className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-black/[0.06] hover:text-foreground"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </span>
    </div>
  );
}

function stripProtocol(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
