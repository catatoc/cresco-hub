import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { queryProjectsByCustomer } from '@/lib/notion/projects';
import { ProjectsView } from '@/components/projects/projects-view';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

export default async function ProyectosPage() {
  const ctx = await requireContext();
  const projects = await queryProjectsByCustomer(ctx.customerId);

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: 'Proyectos' }]} />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[1100px] mx-auto w-full">
          <div className="flex items-baseline gap-2.5 mb-5 min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] truncate">Proyectos</h1>
            <span className="text-[12px] text-muted-foreground shrink-0">{projects.length} en total</span>
          </div>
          <ProjectsView projects={projects} />
        </div>
      </div>
    </PageEnter>
  );
}
