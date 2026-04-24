import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <>
      <div className="grid grid-cols-[232px_1fr] h-screen overflow-hidden bg-[#fafafa]">
        <Sidebar context={ctx} />
        <main className="flex flex-col min-h-0 min-w-0 overflow-hidden bg-white">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
