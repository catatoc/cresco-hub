import { redirect } from 'next/navigation';
import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { MobileSidebar } from '@/components/shell/mobile-sidebar';
import { BottomNav } from '@/components/shell/bottom-nav';
import { SearchProvider } from '@/components/search/search-provider';
import { CreateProvider } from '@/components/create/create-provider';
import { getCurrentSprint } from '@/lib/notion/sprints';
import { Toaster } from 'sonner';
import { LazyMotion, domMax, MotionConfig } from '@/components/motion/m';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  // los clientes viven en el portal, no en el hub interno
  if (!ctx.isInternal) redirect('/portal');
  const currentSprint = await getCurrentSprint().catch(() => null);
  return (
    <>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <CreateProvider
            customerId={ctx.customerId}
            currentMember={{ id: ctx.memberId, name: ctx.memberName }}
            currentSprint={
              currentSprint
                ? { id: currentSprint.id, name: currentSprint.name }
                : null
            }
          >
            <SearchProvider customerId={ctx.customerId}>
              <div className="grid h-screen overflow-hidden bg-[#fafafa] grid-cols-1 lg:grid-cols-[auto_1fr]">
                <Sidebar context={ctx} className="hidden lg:flex" />
                <MobileSidebar>
                  <Sidebar context={ctx} groupId="sidebar-nav-mobile" className="border-r-0" />
                </MobileSidebar>
                <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                  {children}
                </main>
                <BottomNav />
              </div>
            </SearchProvider>
          </CreateProvider>
        </MotionConfig>
      </LazyMotion>
      <Toaster position="bottom-right" />
    </>
  );
}
