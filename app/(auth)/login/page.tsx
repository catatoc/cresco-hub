import { LoginForm } from '@/components/auth/login-form';
import { PageEnter } from '@/components/motion/page-enter';

export default function LoginPage() {
  return (
    <PageEnter className="min-h-screen min-h-[100dvh] grid grid-cols-1 lg:grid-cols-[1fr_minmax(420px,480px)]">
      <section className="hidden lg:flex flex-col p-10 xl:p-12 bg-[#f7f7f8] border-r border-neutral-200">
        <div className="flex-1 flex flex-col justify-center max-w-[360px] mx-auto w-full">
          <h1 className="text-3xl lg:text-[34px] xl:text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900">
            Tu proyecto.
          </h1>
          <p className="mt-3 text-sm lg:text-[13px] leading-relaxed text-neutral-600 max-w-[300px]">
            Tareas, reuniones y wiki. En un solo lugar.
          </p>
        </div>

        <p className="text-xs text-neutral-400">© 2026</p>
      </section>

      <section className="flex flex-col px-6 py-8 sm:p-10 lg:p-12 xl:p-16 bg-white">
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full py-8">
          <h2 className="text-lg sm:text-xl font-semibold tracking-tight mb-1.5">
            Iniciar sesión
          </h2>
          <p className="text-xs sm:text-[13px] text-muted-foreground mb-6 sm:mb-7">
            Continúa con tu cuenta de Google.
          </p>
          <LoginForm />
        </div>

        <p className="mt-auto pt-6 text-xs text-muted-foreground text-center leading-relaxed">
          Al continuar aceptas los{' '}
          <a
            href="#"
            className="underline decoration-neutral-300 text-neutral-600 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            términos
          </a>{' '}
          y la{' '}
          <a
            href="#"
            className="underline decoration-neutral-300 text-neutral-600 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            política de privacidad
          </a>
          .
        </p>
      </section>
    </PageEnter>
  );
}
