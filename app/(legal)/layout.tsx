import Link from 'next/link';
import { useTranslations } from 'next-intl';

// Páginas legales con la superficie crescō: arena, tinta y moss.
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('legal');
  return (
    <div className="min-h-screen min-h-[100dvh] bg-[linear-gradient(180deg,#E7E1D4_0%,#ECE6DA_38%,#F1ECE2_66%,#F7F3EC_100%)] text-[#1A1612] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="border-b-[0.5pt] border-[#D4CCBC]/70">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/login" className="flex items-end gap-[6px] text-[17px] font-medium tracking-[-0.03em] text-[#1A1612]">
            crescō
            <span className="mb-[5px] inline-block size-[6px] rounded-full bg-[#3D5240]" aria-hidden />
          </Link>
          <nav className="flex items-center gap-5 text-xs text-[#8C8377]">
            <Link href="/privacy" className="hover:text-[#2A3B2D] transition-colors">
              {t('nav.privacy')}
            </Link>
            <Link href="/terms" className="hover:text-[#2A3B2D] transition-colors">
              {t('nav.terms')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        <div className="rounded-[22px] border-[0.5pt] border-white/55 bg-[#F7F3EA]/60 backdrop-blur-xl shadow-[0_30px_80px_-36px_rgba(26,22,18,0.38)] px-6 py-10 sm:px-12 sm:py-12">
          {children}
        </div>
      </main>

      <footer className="border-t-[0.5pt] border-[#D4CCBC]/70 mt-4">
        <div className="max-w-3xl mx-auto px-6 py-6 text-xs text-[#8C8377]">{t('footer')}</div>
      </footer>
    </div>
  );
}
