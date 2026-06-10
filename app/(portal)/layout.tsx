import { redirect } from 'next/navigation';
import { requireContext } from '@/lib/auth/require-context';
import './portal.css';

export const dynamic = 'force-dynamic';

// Shell del portal del cliente: full-bleed, sin sidebar.
// Los internos (@cresco.so) no viven aquí — van al hub.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (ctx.isInternal) redirect('/');
  return <>{children}</>;
}
