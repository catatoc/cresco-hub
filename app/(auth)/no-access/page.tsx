import Link from 'next/link';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function NoAccessPage() {
  return (
    <div className="min-h-screen min-h-[100dvh] grid place-items-center bg-[#fafafa]">
      <div className="max-w-md text-center space-y-4 px-4 py-8 sm:p-8">
        <div className="w-12 h-12 rounded-xl bg-neutral-900 text-white grid place-items-center font-bold text-lg mx-auto">
          H
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Sin acceso aún</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Tu correo no está registrado como miembro de ningún proyecto todavía.
          Contacta a tu PM para que te agregue en la base de Equipo de Notion
          con este email.
        </p>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-11 sm:h-9 active:bg-muted',
          )}
        >
          Volver a inicio de sesión
        </Link>
      </div>
    </div>
  );
}
