import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const ctx = await requireContext();
  return (
    <>
      <Topbar crumbs={[{ label: 'Home' }]} />
      <div className="flex-1 overflow-auto p-10">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hola, {ctx.memberName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Cliente: {ctx.clientName} · Proyectos: {ctx.projectIds.length}
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          (El home real llega en Phase 5)
        </p>
      </div>
    </>
  );
}
