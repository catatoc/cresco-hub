import Link from 'next/link';
import type { Scope } from '@/lib/scope/resolve';

type Props = { scope?: Scope };

export function MeetingsEmpty({ scope = 'team' }: Props) {
  const isMine = scope === 'mine';
  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground">
      {isMine ? (
        <>
          <p className="mb-3">No tienes reuniones todavía.</p>
          <Link
            href="/reuniones?scope=team"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5e6ad2] hover:underline"
          >
            Ver todas las del cliente →
          </Link>
        </>
      ) : (
        <p>Aún no hay reuniones registradas para este cliente.</p>
      )}
    </div>
  );
}
