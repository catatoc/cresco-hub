import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryTestUsersByCustomer } from '@/lib/notion/test-users';
import { TestUserGrid } from '@/components/test-users/test-user-grid';

export const dynamic = 'force-dynamic';

export default async function TestUsersPage() {
  const ctx = await requireContext();
  const users = await queryTestUsersByCustomer(ctx.customerId);

  return (
    <>
      <Topbar crumbs={[{ label: 'Usuarios de prueba' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[900px] mx-auto w-full">
          <header className="mb-5">
            <h1 className="text-[18px] font-semibold tracking-tight">
              Usuarios de prueba
            </h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Credenciales compartidas para entornos de QA y staging.
            </p>
          </header>
          <TestUserGrid users={users} customerName={ctx.customerName} />
        </div>
      </div>
    </>
  );
}
