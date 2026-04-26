'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen grid place-items-center p-10 font-sans">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-lg font-semibold">Algo salió mal</h1>
            <p className="text-sm text-neutral-600">{error.message}</p>
            {error.digest && (
              <p className="text-[11px] text-neutral-500 font-mono">ref: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="mt-2 px-3 py-1.5 rounded-md border border-neutral-300 text-sm hover:bg-neutral-50 cursor-pointer"
            >
              Recargar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
