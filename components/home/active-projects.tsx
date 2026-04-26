import Link from 'next/link';
import { FolderKanban } from 'lucide-react';
import type { TeamMember } from '@/schemas/team-member';
import type { HomeProject } from '@/lib/home/queries';
import { AssigneeStack } from '@/components/kanban/card';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<
  string,
  { pill: string; bar: string }
> = {
  'In Progress': {
    pill: 'bg-[#eff6ff] text-[#3a5fcc]',
    bar: 'bg-gradient-to-r from-[#3a5fcc] to-[#5e6ad2]',
  },
  Planning: {
    pill: 'bg-[#eeeffc] text-[#5e6ad2]',
    bar: 'bg-gradient-to-r from-[#5e6ad2] to-[#818bdb]',
  },
  Paused: {
    pill: 'bg-[#faf0db] text-[#c78a2c]',
    bar: 'bg-gradient-to-r from-[#c78a2c] to-[#d9a558]',
  },
};

function formatEndDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('es', { month: 'short', day: 'numeric' });
}

function buildMeta(p: HomeProject): string | null {
  const parts: string[] = [];
  if (p.openTaskCount > 0) {
    parts.push(`${p.openTaskCount} abierta${p.openTaskCount === 1 ? '' : 's'}`);
  }
  const end = formatEndDate(p.endDate);
  if (end) parts.push(`entrega ${end}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}

type Props = {
  projects: HomeProject[];
  membersById: Map<string, TeamMember>;
};

export function ActiveProjects({ projects, membersById }: Props) {
  if (projects.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[13px] font-semibold">Proyectos activos</h2>
        </div>
        <div className="border border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
          Sin proyectos activos.
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-[13px] font-semibold">
          Proyectos activos{' '}
          <span className="text-[12px] font-normal text-muted-foreground">· {projects.length}</span>
        </h2>
        <Link href="/proyectos" className="text-[12px] text-muted-foreground hover:text-[#5e6ad2]">
          Ver todos →
        </Link>
      </div>

      <div className="border border-border rounded-lg bg-white overflow-hidden">
        <div className="grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-2.5 bg-[#fbfbfc] border-b border-border text-[11px] uppercase tracking-[0.04em] text-muted-foreground font-medium">
          <span />
          <span>Proyecto</span>
          <span>Estado</span>
          <span>Progreso</span>
          <span className="text-right">%</span>
          <span>Equipo</span>
          <span />
        </div>

        {projects.map((p, i) => {
          const styles = (p.status && STATUS_STYLES[p.status]) ?? STATUS_STYLES['In Progress']!;
          const pct = typeof p.completion === 'number' ? Math.round(p.completion * 100) : null;
          const meta = buildMeta(p);
          const assignees = p.teamIds
            .map((id) => membersById.get(id))
            .filter((m): m is TeamMember => !!m);

          return (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                'group grid grid-cols-[22px_minmax(0,1.6fr)_110px_minmax(0,1.2fr)_56px_70px_24px] gap-3.5 items-center px-4 py-3 hover:bg-[#f7f7f8] transition-colors',
                i < projects.length - 1 && 'border-b border-border',
              )}
            >
              <span className="w-[22px] h-[22px] rounded-md grid place-items-center text-[13px] bg-[#eeeffc] text-[#5e6ad2]">
                {p.icon ?? <FolderKanban className="w-3.5 h-3.5" />}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <span
                    aria-hidden
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      p.recentlyActive
                        ? 'bg-[#3f9f5c] animate-home-pulse'
                        : 'bg-[#a0a0a8] shadow-[0_0_0_3px_#f7f7f8]',
                    )}
                  />
                  <span className="truncate">{p.name}</span>
                </div>
                {meta && (
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{meta}</div>
                )}
              </div>

              <span
                className={cn(
                  'inline-block text-[11px] font-medium rounded-full px-2 py-[2px] w-fit',
                  styles.pill,
                )}
              >
                {p.status}
              </span>

              <div className="h-[5px] bg-[#f7f7f8] rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', styles.bar)}
                  style={{ width: pct !== null ? `${pct}%` : '0%' }}
                />
              </div>

              <span className="text-right text-[12px] font-medium tabular-nums">
                {pct !== null ? `${pct}%` : ''}
              </span>

              <span>
                <AssigneeStack assignees={assignees} size={20} />
              </span>

              <span className="text-[14px] text-muted-foreground/60 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all text-right">
                →
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
