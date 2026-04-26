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
        <div className="p-10 max-w-[1100px] mx-auto w-full">
          <div className="flex items-baseline gap-2.5 mb-5">
            <h1 className="text-[20px] font-semibold tracking-[-0.01em]">Proyectos</h1>
            <span className="text-[12px] text-muted-foreground">{projects.length} en total</span>
          </div>
          <ProjectsView projects={projects} />
        </div>
      </div>
    </PageEnter>
  );
}
