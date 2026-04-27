import { notFound } from 'next/navigation';
import { Topbar } from '@/components/shell/topbar';
import { PageEnter } from '@/components/motion/page-enter';
import { requireContext } from '@/lib/auth/require-context';
import { getProject } from '@/lib/notion/projects';
import { queryTasksByProject } from '@/lib/notion/tasks';
import { queryMeetingsByProject } from '@/lib/notion/meetings';
import { queryWikiByProject } from '@/lib/notion/wiki';
import { getTeamMembers } from '@/lib/notion/team';
import { getUsers } from '@/lib/notion/users';
import { ProjectDetail } from '@/components/projects/project-detail';

export const dynamic = 'force-dynamic';

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const ctx = await requireContext();
  const { projectId } = await params;

  const [project, tasks, meetings, wiki] = await Promise.all([
    getProject(projectId),
    queryTasksByProject(projectId),
    queryMeetingsByProject(projectId),
    queryWikiByProject(projectId),
  ]);

  if (!project || project.customerId !== ctx.customerId) notFound();

  const [members, owners] = await Promise.all([
    getTeamMembers(project.teamIds),
    getUsers(project.ownerIds),
  ]);
  const ownerName = owners[0]?.name ?? null;

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar
        crumbs={[
          { label: 'Proyectos', href: '/proyectos' },
          { label: project.name, muted: true },
        ]}
      />
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[1100px] mx-auto w-full">
          <ProjectDetail
            project={project}
            tasks={tasks}
            meetings={meetings}
            wiki={wiki}
            members={members}
            ownerName={ownerName}
            accentIndex={0}
          />
        </div>
      </div>
    </PageEnter>
  );
}
