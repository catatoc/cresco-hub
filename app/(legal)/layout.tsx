import Link from 'next/link';

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="border-b border-neutral-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/login" className="text-sm font-semibold tracking-tight text-neutral-900">
            crescō
          </Link>
          <nav className="flex items-center gap-5 text-xs text-neutral-500">
            <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
              Privacidad
            </Link>
            <Link href="/terms" className="hover:text-neutral-900 transition-colors">
              Términos
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">{children}</main>

      <footer className="border-t border-neutral-200 mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-neutral-400">© 2026 crescō</div>
      </footer>
    </div>
  );
}
