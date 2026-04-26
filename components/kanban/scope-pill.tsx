'use client';

import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { TareasScope } from '@/lib/auth/context';
import { setTareasScope } from '@/app/(app)/tareas/actions';

type Props = {
  scope: TareasScope;
  myCount: number;
  teamCount: number;
  sprintId: string | null;
};

export function ScopePill({ scope, myCount, teamCount, sprintId }: Props) {
  const label = scope === 'mine' ? 'Mías' : 'Equipo';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md',
          'text-[12px] font-medium border cursor-pointer transition-colors',
          'bg-[#eeeffc] text-[#5e6ad2] border-[#c9cbe8]',
          'hover:bg-[#e5e7fa] outline-none',
        )}
        aria-label="Filtrar tareas por alcance"
      >
        {label}
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <ScopeItem
          active={scope === 'mine'}
          label="Mis tareas"
          count={myCount}
          onClick={() => setTareasScope('mine', sprintId)}
        />
        <ScopeItem
          active={scope === 'team'}
          label="Equipo completo"
          count={teamCount}
          onClick={() => setTareasScope('team', sprintId)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ScopeItem({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        active && 'bg-[#eeeffc] text-[#5e6ad2] font-semibold',
      )}
    >
      <span className="w-3.5 inline-flex justify-center">
        {active && <Check className="w-3 h-3" />}
      </span>
      <span className="flex-1">{label}</span>
      <span className="text-[11px] text-muted-foreground">{count}</span>
    </DropdownMenuItem>
  );
}
