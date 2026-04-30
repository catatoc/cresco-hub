'use client';

import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { setScope } from '@/lib/scope/actions';
import type { Scope, ScopeKey } from '@/lib/scope/resolve';

type Props = {
  scopeKey: ScopeKey;
  scope: Scope;
  myCount: number;
  teamCount: number;
  redirectPath: string;
  extraParams?: Record<string, string>;
  labels?: { mine: string; team: string };
};

export function ScopePill({
  scopeKey,
  scope,
  myCount,
  teamCount,
  redirectPath,
  extraParams = {},
  labels = { mine: 'Yo', team: 'Equipo' },
}: Props) {
  const triggerLabel = scope === 'mine' ? labels.mine : labels.team;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-2 sm:py-0.5 rounded-md',
          'text-[12px] font-medium border cursor-pointer transition-colors shrink-0',
          'bg-[#eeeffc] text-[#5e6ad2] border-[#c9cbe8]',
          'hover:bg-[#e5e7fa] outline-none focus-visible:ring-2 focus-visible:ring-ring',
        )}
        aria-label={`Filtrar ${scopeKey} por alcance`}
      >
        {triggerLabel}
        <ChevronDown className="w-3 h-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[220px]">
        <ScopeItem
          active={scope === 'mine'}
          label={labels.mine}
          count={myCount}
          onClick={() => setScope(scopeKey, 'mine', redirectPath, extraParams)}
        />
        <ScopeItem
          active={scope === 'team'}
          label={labels.team}
          count={teamCount}
          onClick={() => setScope(scopeKey, 'team', redirectPath, extraParams)}
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
