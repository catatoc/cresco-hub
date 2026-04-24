import { requireContext } from '@/lib/auth/require-context';
import { Sidebar } from '@/components/shell/sidebar';
import { Toaster } from 'sonner';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  return (
    <div className="grid grid-cols-[232px_1fr] h-screen bg-[#fafafa]">
      <Sidebar context={ctx} />
      <main className="flex flex-col overflow-hidden bg-white">{children}</main>
      <Toaster position="bottom-right" />
    </div>
  );
}
