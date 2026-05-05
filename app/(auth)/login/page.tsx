import Link from 'next/link';
import { LoginForm } from '@/components/auth/login-form';
import { PageEnter } from '@/components/motion/page-enter';

export default function LoginPage() {
  return (
    <PageEnter className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1fr_minmax(420px,480px)]">
      <section className="hidden lg:flex flex-col p-10 xl:p-12 bg-[#f7f7f8] border-r border-neutral-200">
        <div className="text-base font-semibold tracking-tight text-neutral-900">
          crescō
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full">
          <h1 className="text-3xl lg:text-[34px] xl:text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900">
            Tu proyecto.
          </h1>
          <p className="mt-3 text-sm lg:text-[13px] leading-relaxed text-neutral-600 max-w-[300px]">
            Tareas, reuniones y documentación.
          </p>
        </div>

        <p className="text-xs text-neutral-400">© 2026 crescō</p>
      </section>

      <section className="flex flex-col px-6 py-8 sm:p-10 lg:p-12 xl:p-16 bg-white">
        <div className="lg:hidden mb-8 text-base font-semibold tracking-tight text-neutral-900">
          crescō
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-8">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-1.5">
            Iniciar sesión en crescō
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-foreground mb-6 sm:mb-7">
            Continúa con tu cuenta de Google.
          </p>
          <LoginForm />
        </div>

        <footer className="max-w-sm mx-auto w-full flex items-center justify-center gap-4 text-[11px] text-neutral-400">
          <Link href="/privacy" className="hover:text-neutral-700 transition-colors">
            Privacidad
          </Link>
          <span aria-hidden className="h-3 w-px bg-neutral-200" />
          <Link href="/terms" className="hover:text-neutral-700 transition-colors">
            Términos
          </Link>
        </footer>
      </section>
    </PageEnter>
  );
}
