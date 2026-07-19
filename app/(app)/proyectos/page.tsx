import { cookies } from 'next/headers';
import { getTranslations } from 'next-intl/server';
import { Topbar } from '@/components/shell/topbar';
import { requireContext } from '@/lib/auth/require-context';
import { resolveScope, SCOPE_COOKIE } from '@/lib/scope/resolve';
import { ScopePill } from '@/components/common/scope-pill';
import {
  queryProjectsByCustomer,
  queryProjectsByCustomerAndMember,
} from '@/lib/notion/projects';
import { ProjectsView } from '@/components/projects/projects-view';
import { PageEnter } from '@/components/motion/page-enter';

export const dynamic = 'force-dynamic';

type SearchParams = Promise<{ scope?: string }>;

export default async function ProyectosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const ctx = await requireContext();
  const t = await getTranslations('projects');
  const sp = await searchParams;
  const cookieStore = await cookies();
  const scope = resolveScope('proyectos', sp.scope, cookieStore.get(SCOPE_COOKIE.proyectos)?.value);

  const projects = scope === 'mine'
    ? await queryProjectsByCustomerAndMember(ctx.customerId, ctx.memberId)
    : await queryProjectsByCustomer(ctx.customerId);

  const myCount = scope === 'mine'
    ? projects.length
    : projects.filter((p) => p.teamIds.includes(ctx.memberId)).length;
  const teamCount = scope === 'team' ? projects.length : myCount;

  return (
    <PageEnter className="flex flex-col h-full overflow-hidden">
      <Topbar crumbs={[{ label: t('nav.projects') }]}>
        <ScopePill
          scopeKey="proyectos"
          scope={scope}
          myCount={myCount}
          teamCount={teamCount}
          redirectPath="/proyectos"
          labels={{ mine: t('scope.mine'), team: t('scope.team') }}
        />
      </Topbar>
      <div className="flex-1 overflow-auto">
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 pb-[calc(4rem+env(safe-area-inset-bottom)+1rem)] lg:pb-12 max-w-[1100px] mx-auto w-full">
          <div className="flex items-baseline gap-2.5 mb-5 min-w-0">
            <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.01em] truncate">{t('nav.projects')}</h1>
            <span className="text-[12px] text-muted-foreground shrink-0">{t('page.total', { count: projects.length })}</span>
          </div>
          {projects.length === 0 && scope === 'mine' ? (
            <div className="border border-dashed border-border rounded-xl p-6 sm:p-10 text-center text-sm text-muted-foreground">
              <p className="mb-3">{t('page.emptyMine')}</p>
              <a
                href="/proyectos?scope=team"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5e6ad2] hover:underline"
              >
                {t('page.viewAllCustomer')}
              </a>
            </div>
          ) : (
            <ProjectsView projects={projects} />
          )}
        </div>
      </div>
    </PageEnter>
  );
}
