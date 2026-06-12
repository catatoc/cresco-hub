import { redirect } from 'next/navigation';
import { Fraunces } from 'next/font/google';
import { requireContext } from '@/lib/auth/require-context';
import './portal.css';

// la voz serif del portal (numerales del tour, acentos editoriales)
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  style: ['italic', 'normal'],
  weight: ['300', '400'],
});

export const dynamic = 'force-dynamic';

// Shell del portal del cliente: full-bleed, sin sidebar.
// Los internos (@cresco.so) no viven aquí — van al hub.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireContext();
  if (ctx.isInternal) redirect('/');
  return <div className={fraunces.variable}>{children}</div>;
}
