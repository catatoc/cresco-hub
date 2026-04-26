import type { AppContext } from '@/lib/auth/context';
import { WorkspaceHeader } from './workspace-header';
import { UserCard } from './user-card';
import { NavItem } from './nav-item';
import { SearchTrigger } from '@/components/search/search-trigger';
import { CreateTrigger } from '@/components/create/create-trigger';
import { Home, CheckSquare, Calendar, BookOpen, FolderKanban } from 'lucide-react';
import { LayoutGroup } from '@/components/motion/m';

export function Sidebar({ context }: { context: AppContext }) {
  return (
    <aside className="bg-[#f7f7f8] border-r border-border flex flex-col p-2">
      <WorkspaceHeader
        current={{ id: context.customerId, name: context.customerName, icon: context.customerIcon }}
        customers={context.customers}
      />

      <LayoutGroup id="sidebar-nav">
        <div className="pb-3">
          <SearchTrigger />
          <CreateTrigger />
          <NavItem href="/" icon={<Home className="w-3.5 h-3.5" />} exact>
            Home
          </NavItem>
        </div>

        <div className="pb-3">
          <div className="text-[11px] uppercase text-muted-foreground font-medium tracking-[0.03em] px-2 pt-1.5 pb-1">
            Workspace
          </div>
          <NavItem href="/tareas" icon={<CheckSquare className="w-3.5 h-3.5" />}>
            Tareas
          </NavItem>
          <NavItem href="/reuniones" icon={<Calendar className="w-3.5 h-3.5" />}>
            Reuniones
          </NavItem>
          <NavItem href="/wiki" icon={<BookOpen className="w-3.5 h-3.5" />}>
            Wiki
          </NavItem>
          <NavItem href="/proyectos" icon={<FolderKanban className="w-3.5 h-3.5" />}>
            Proyectos
          </NavItem>
        </div>
      </LayoutGroup>

      <div className="flex-1" />
      <UserCard name={context.memberName} role={`Miembro · ${context.customerName}`} />
    </aside>
  );
}
