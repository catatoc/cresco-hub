import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1fr_520px]">
      <section className="relative hidden md:flex flex-col p-12 text-white bg-[#0f0f10] overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[700px] h-[700px] rounded-full bg-[#5e6ad2]/35 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-[#7c5fd0]/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5e6ad2] to-[#7c5fd0] grid place-items-center font-bold">
            H
          </div>
          <span className="font-semibold">Hub</span>
        </div>

        <div className="relative z-10 flex-1 flex flex-col justify-center max-w-[440px]">
          <p className="text-xs uppercase tracking-wider text-white/50 font-medium mb-3">
            Notion Hub
          </p>
          <h1 className="text-[42px] font-semibold leading-[1.1] tracking-[-0.02em] mb-4">
            Tu proyecto.
            <br />
            <span className="text-[#b4bcf0]">Sin abrir Notion.</span>
          </h1>
          <p className="text-white/70 leading-relaxed">
            Un espacio ligero, rápido y claro para ver tus tareas, reuniones y
            documentación. Todo curado por tu PM. Cero curva de aprendizaje.
          </p>

          <ul className="mt-12 space-y-3.5 text-[13px] text-white/80">
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-md bg-[#5e6ad2]/15 text-[#b4bcf0] grid place-items-center shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </span>
              Kanban semanal enfocado en lo que importa hoy
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-md bg-[#5e6ad2]/15 text-[#b4bcf0] grid place-items-center shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                </svg>
              </span>
              Reuniones con agenda, decisiones y acciones ligadas
            </li>
            <li className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-md bg-[#5e6ad2]/15 text-[#b4bcf0] grid place-items-center shrink-0">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              Wiki del proyecto siempre al día, sincronizada con Notion
            </li>
          </ul>
        </div>

        <p className="relative z-10 text-xs text-white/40">© 2026 Hub</p>
      </section>

      <section className="flex flex-col p-12 md:p-16 bg-white border-l border-neutral-200">
        <div className="flex justify-end text-xs text-muted-foreground">
          ¿Primera vez?{' '}
          <a
            href="#"
            className="ml-1.5 text-foreground font-medium hover:text-[#5e6ad2]"
          >
            Contacta a tu PM →
          </a>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
          <h2 className="text-[22px] font-semibold tracking-tight mb-1.5">
            Iniciar sesión
          </h2>
          <p className="text-[13px] text-muted-foreground mb-7">
            Te enviaremos un link mágico a tu correo. Sin contraseñas.
          </p>
          <LoginForm />
        </div>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          Al continuar aceptas los{' '}
          <a
            href="#"
            className="underline decoration-neutral-300 text-neutral-600"
          >
            términos
          </a>{' '}
          y la{' '}
          <a
            href="#"
            className="underline decoration-neutral-300 text-neutral-600"
          >
            política de privacidad
          </a>
          .
        </p>
      </section>
    </div>
  );
}
