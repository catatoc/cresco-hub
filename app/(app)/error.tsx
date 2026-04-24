'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex-1 grid place-items-center p-10">
      <div className="text-center space-y-3 max-w-md">
        <div className="w-12 h-12 rounded-xl bg-[#fceaea] text-[#d24949] grid place-items-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-semibold tracking-tight">No pudimos cargar esta sección</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {error.message || 'Ocurrió un error inesperado consultando Notion.'}
        </p>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground font-mono">ref: {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" size="sm" onClick={reset}>
            Reintentar
          </Button>
        </div>
      </div>
    </div>
  );
}
