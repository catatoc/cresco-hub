import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { SearchProvider } from '@/components/search/search-provider';
import { CreateProvider } from '@/components/create/create-provider';
import { Toaster } from 'sonner';
import { LazyMotion, domMax, MotionConfig } from '@/components/motion/m';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireContext();
  return (
    <>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <CreateProvider customerId={ctx.customerId}>
            <SearchProvider customerId={ctx.customerId}>
              <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
                <Sidebar context={ctx} />
                <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white">
                  {children}
                </main>
              </div>
            </SearchProvider>
          </CreateProvider>
        </MotionConfig>
      </LazyMotion>
      <Toaster position="bottom-right" />
    </>
  );
}
