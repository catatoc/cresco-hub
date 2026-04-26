import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { SearchProvider } from '@/components/search/search-provider';
import { Toaster } from 'sonner';
import { LazyMotion, domMax, MotionConfig } from '@/components/motion/m';
import { AnimatedMain } from '@/components/motion/animated-main';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const ctx = await requireContext();
  return (
    <>
      <LazyMotion features={domMax} strict>
        <MotionConfig reducedMotion="user">
          <SearchProvider customerId={ctx.customerId}>
            <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
              <Sidebar context={ctx} />
              <AnimatedMain>{children}</AnimatedMain>
            </div>
            {modal}
          </SearchProvider>
        </MotionConfig>
      </LazyMotion>
      <Toaster position="bottom-right" />
    </>
  );
}
