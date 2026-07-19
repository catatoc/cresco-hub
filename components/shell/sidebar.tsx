import { useTranslations } from 'next-intl';
import type { AppContext } from '@/lib/auth/context';
import { WorkspaceHeader } from './workspace-header';
import { UserCard } from './user-card';
import { NavItem } from './nav-item';
import { SearchTrigger } from '@/components/search/search-trigger';
import { CreateTrigger } from '@/components/create/create-trigger';
import { Home, CheckSquare, Calendar, CalendarClock, BookOpen, FolderKanban, Key } from 'lucide-react';
import { LayoutGroup } from '@/components/motion/m';
import { cn } from '@/lib/utils';

type SidebarProps = {
  context: AppContext;
  className?: string;
  groupId?: string;
};

export function Sidebar({ context, className, groupId = 'sidebar-nav' }: SidebarProps) {
  const t = useTranslations('shell');
  return (
    <aside
      className={cn(
        'bg-[#f7f7f8] border-r border-border flex flex-col p-2 w-[232px] shrink-0 h-full',
        className,
      )}
    >
      <WorkspaceHeader
        current={{ id: context.customerId, name: context.customerName, icon: context.customerIcon }}
        customers={context.customers}
      />

      <LayoutGroup id={groupId}>
        <div className="pb-3">
          <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />} exact>
            {t('sidebar.home')}
          </NavItem>
          <NavItem href="/proxima-semana" icon={<CalendarClock className="w-3.5 h-3.5" />}>
            {t('sidebar.nextWeek')}
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            {t('sidebar.workspace')}
          </div>
          <NavItem href="/tareas" icon={<CheckSquare className="w-3.5 h-3.5" />}>
            {t('sidebar.tasks')}
          </NavItem>
          <NavItem href="/reuniones" icon={<Calendar className="w-3.5 h-3.5" />}>
            {t('sidebar.meetings')}
          </NavItem>
          <NavItem href="/wiki" icon={<BookOpen className="w-3.5 h-3.5" />}>
            {t('sidebar.wiki')}
          </NavItem>
          <NavItem href="/proyectos" icon={<FolderKanban className="w-3.5 h-3.5" />}>
            {t('sidebar.projects')}
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            {t('sidebar.resources')}
          </div>
          <NavItem
            href="/usuarios-de-prueba"
            icon={<Key className="w-3.5 h-3.5" />}
          >
            {t('sidebar.testUsers')}
          </NavItem>
        </div>
      </LayoutGroup>

      <div className="flex-1" />
      <div className="pb-1 hidden">
        <SearchTrigger />
        <CreateTrigger />
      </div>
      <UserCard
        name={context.memberName}
        role={t('memberRole', { customer: context.customerName })}
      />
    </aside>
  );
}
